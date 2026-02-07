import { fail } from '@sveltejs/kit';
import { eq, desc, asc, sql, and, count, like, or } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { tags, quizTags, tagCooccurrence } from '$lib/server/db/schema';
import { slugify } from '$lib/utils';
import { logAdminAction, AdminActionTypes, TargetTypes } from '$lib/server/audit-logger';
import { isModeratorOrBetter } from '$lib/server/permissions';

import type { PageServerLoad, Actions } from './$types';

const ITEMS_PER_PAGE = 25;

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const sortBy = url.searchParams.get('sort') ?? 'useCount';
	const order = url.searchParams.get('order') ?? 'desc';
	const search = url.searchParams.get('search') ?? '';
	const filter = url.searchParams.get('filter') ?? 'all';

	const offset = (page - 1) * ITEMS_PER_PAGE;

	// Build where clause
	let whereClause = undefined;
	if (search) {
		whereClause = or(like(tags.label, `%${search}%`), like(tags.slug, `%${search}%`));
	}

	if (filter === 'unused') {
		whereClause = whereClause ? and(whereClause, eq(tags.useCount, 0)) : eq(tags.useCount, 0);
	} else if (filter === 'popular') {
		whereClause = whereClause
			? and(whereClause, sql`${tags.useCount} >= 10`)
			: sql`${tags.useCount} >= 10`;
	}

	// Get tags with pagination
	const tagsList = await db.query.tags.findMany({
		where: whereClause,
		orderBy:
			sortBy === 'label'
				? order === 'asc'
					? asc(tags.label)
					: desc(tags.label)
				: order === 'asc'
					? asc(tags.useCount)
					: desc(tags.useCount),
		limit: ITEMS_PER_PAGE,
		offset
	});

	// Get total count for pagination
	const totalResult = await db.select({ count: count() }).from(tags).where(whereClause);
	const totalTags = totalResult[0]?.count ?? 0;
	const totalPages = Math.ceil(totalTags / ITEMS_PER_PAGE);

	// Get statistics
	const statsResult = await db
		.select({
			total: count(),
			unused: sql<number>`count(case when ${tags.useCount} = 0 then 1 end)`,
			popular: sql<number>`count(case when ${tags.useCount} >= 10 then 1 end)`
		})
		.from(tags);

	const stats = {
		total: statsResult[0]?.total ?? 0,
		unused: statsResult[0]?.unused ?? 0,
		popular: statsResult[0]?.popular ?? 0
	};

	// Get most popular tags
	const popularTags = await db.query.tags.findMany({
		orderBy: desc(tags.useCount),
		limit: 10
	});

	return {
		tags: tagsList,
		pagination: {
			page,
			totalPages,
			totalItems: totalTags,
			itemsPerPage: ITEMS_PER_PAGE
		},
		stats,
		popularTags,
		sortBy,
		order,
		search,
		filter
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!isModeratorOrBetter(locals.user)) {
			return fail(403, { error: 'Moderator access required' });
		}

		const formData = await request.formData();
		const label = formData.get('label')?.toString().trim().toLowerCase();

		if (!label) {
			return fail(400, { error: 'Tag label is required' });
		}

		// Check if tag already exists
		const existing = await db.query.tags.findFirst({
			where: eq(tags.label, label)
		});

		if (existing) {
			return fail(400, { error: 'A tag with this label already exists' });
		}

		const slug = slugify(label);

		// Check if slug exists
		const existingSlug = await db.query.tags.findFirst({
			where: eq(tags.slug, slug)
		});

		if (existingSlug) {
			return fail(400, { error: 'A tag with this slug already exists' });
		}

		const [newTag] = await db
			.insert(tags)
			.values({
				label,
				slug,
				useCount: 0
			})
			.returning();

		// Log the action
		await logAdminAction(
			locals.user!.id,
			AdminActionTypes.CREATE_TAG,
			TargetTypes.TAG,
			newTag.id,
			undefined,
			{ label, slug }
		);

		return { success: true };
	},

	update: async ({ request, locals }) => {
		if (!isModeratorOrBetter(locals.user)) {
			return fail(403, { error: 'Moderator access required' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const label = formData.get('label')?.toString().trim().toLowerCase();

		if (!id || !label) {
			return fail(400, { error: 'Tag ID and label are required' });
		}

		// Get old tag info for audit log
		const oldTag = await db.query.tags.findFirst({
			where: eq(tags.id, id)
		});

		if (!oldTag) {
			return fail(404, { error: 'Tag not found' });
		}

		// Check if another tag has this label
		const existing = await db.query.tags.findFirst({
			where: and(eq(tags.label, label), sql`${tags.id} != ${id}`)
		});

		if (existing) {
			return fail(400, { error: 'Another tag with this label already exists' });
		}

		const slug = slugify(label);

		// Check if another tag has this slug
		const existingSlug = await db.query.tags.findFirst({
			where: and(eq(tags.slug, slug), sql`${tags.id} != ${id}`)
		});

		if (existingSlug) {
			return fail(400, { error: 'Another tag with this slug already exists' });
		}

		await db.update(tags).set({ label, slug }).where(eq(tags.id, id));

		// Log the action
		await logAdminAction(
			locals.user!.id,
			AdminActionTypes.UPDATE_TAG,
			TargetTypes.TAG,
			id,
			undefined,
			{ oldLabel: oldTag.label, oldSlug: oldTag.slug, newLabel: label, newSlug: slug }
		);

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		if (!isModeratorOrBetter(locals.user)) {
			return fail(403, { error: 'Moderator access required' });
		}

		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) {
			return fail(400, { error: 'Tag ID is required' });
		}

		// Get tag info for confirmation message and audit log
		const tag = await db.query.tags.findFirst({
			where: eq(tags.id, id)
		});

		if (!tag) {
			return fail(404, { error: 'Tag not found' });
		}

		// Delete quiz associations
		await db.delete(quizTags).where(eq(quizTags.tagId, id));

		// Delete co-occurrences
		await db.delete(tagCooccurrence).where(eq(tagCooccurrence.tagId, id));
		await db.delete(tagCooccurrence).where(eq(tagCooccurrence.relatedTagId, id));

		// Delete the tag
		await db.delete(tags).where(eq(tags.id, id));

		// Log the action
		await logAdminAction(
			locals.user!.id,
			AdminActionTypes.DELETE_TAG,
			TargetTypes.TAG,
			id,
			undefined,
			{ label: tag.label, slug: tag.slug, useCount: tag.useCount }
		);

		return {
			success: true,
			message: `Tag "${tag.label}" deleted successfully`
		};
	},

	merge: async ({ request, locals }) => {
		if (!isModeratorOrBetter(locals.user)) {
			return fail(403, { error: 'Moderator access required' });
		}

		const formData = await request.formData();
		const sourceIds = formData.getAll('sourceIds').map(String);
		const targetId = formData.get('targetId')?.toString();

		if (!sourceIds.length || !targetId) {
			return fail(400, { error: 'Source tags and target tag are required' });
		}

		if (sourceIds.includes(targetId)) {
			return fail(400, { error: 'Cannot merge a tag into itself' });
		}

		// Get target tag and source tags before transaction for validation and audit
		const targetTag = await db.query.tags.findFirst({
			where: eq(tags.id, targetId)
		});

		if (!targetTag) {
			return fail(404, { error: 'Target tag not found' });
		}

		const sourceTags = await db.query.tags.findMany({
			where: sql`${tags.id} IN ${sourceIds}`
		});

		if (sourceTags.length === 0) {
			return fail(404, { error: 'No source tags found' });
		}

		let newCount: number;

		// Execute merge within a transaction for atomicity
		try {
			await db.transaction(async (tx) => {
				// Move all quiz associations from source tags to target
				for (const sourceId of sourceIds) {
					// Get quiz associations for source tag
					const sourceAssociations = await tx.query.quizTags.findMany({
						where: eq(quizTags.tagId, sourceId)
					});

					for (const association of sourceAssociations) {
						// Check if quiz already has target tag
						const existing = await tx.query.quizTags.findFirst({
							where: and(eq(quizTags.quizId, association.quizId), eq(quizTags.tagId, targetId))
						});

						if (!existing) {
							// Add target tag to quiz
							await tx.insert(quizTags).values({
								quizId: association.quizId,
								tagId: targetId
							});
						}

						// Remove source tag association
						await tx
							.delete(quizTags)
							.where(and(eq(quizTags.quizId, association.quizId), eq(quizTags.tagId, sourceId)));
					}

					// Delete source tag and related data
					await tx.delete(quizTags).where(eq(quizTags.tagId, sourceId));
					await tx.delete(tagCooccurrence).where(eq(tagCooccurrence.tagId, sourceId));
					await tx.delete(tagCooccurrence).where(eq(tagCooccurrence.relatedTagId, sourceId));
					await tx.delete(tags).where(eq(tags.id, sourceId));
				}

				// Recalculate target tag use count
				const countResult = await tx
					.select({ count: count() })
					.from(quizTags)
					.where(eq(quizTags.tagId, targetId));
				newCount = countResult[0]?.count ?? 0;

				await tx.update(tags).set({ useCount: newCount }).where(eq(tags.id, targetId));
			});
		} catch (err) {
			console.error('Transaction failed during tag merge:', err);
			return fail(500, { error: 'Failed to merge tags. Please try again.' });
		}

		// Log the action (outside transaction since it's audit logging)
		await logAdminAction(
			locals.user!.id,
			AdminActionTypes.MERGE_TAGS,
			TargetTypes.TAG,
			targetId,
			undefined,
			{
				targetTag: { id: targetTag.id, label: targetTag.label },
				mergedTags: sourceTags.map((t) => ({ id: t.id, label: t.label })),
				newUseCount: newCount!
			}
		);

		return {
			success: true,
			message: `Merged ${sourceIds.length} tag(s) into "${targetTag.label}"`
		};
	},

	recalculate: async ({ locals }) => {
		if (!isModeratorOrBetter(locals.user)) {
			return fail(403, { error: 'Moderator access required' });
		}

		// Recalculate all use counts
		const allTags = await db.query.tags.findMany();

		for (const tag of allTags) {
			const countResult = await db
				.select({ count: count() })
				.from(quizTags)
				.where(eq(quizTags.tagId, tag.id));
			const newCount = countResult[0]?.count ?? 0;

			await db.update(tags).set({ useCount: newCount }).where(eq(tags.id, tag.id));
		}

		// Log the action
		await logAdminAction(
			locals.user!.id,
			'recalculate_counts',
			TargetTypes.TAG,
			undefined,
			undefined,
			{ tagsUpdated: allTags.length }
		);

		return { success: true, message: 'All tag counts recalculated' };
	}
};
