import { error } from '@sveltejs/kit';
import { eq, desc, count, and, inArray } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { quizzes, user, speedRuns, tags, quizTags, tagCooccurrence } from '$lib/server/db/schema';

import type { PageServerLoad } from './$types';

const PAGE_SIZE = 15;

export const load: PageServerLoad = async ({ params, url }) => {
	const { slug } = params;
	const pageParam = url.searchParams.get('page');
	const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);

	// Get the tag
	const tag = await db.query.tags.findFirst({
		where: eq(tags.slug, slug)
	});

	if (!tag) {
		error(404, 'Tag not found');
	}

	// Get related tags (Phase 3 feature)
	const relatedTagsData = await db
		.select({
			id: tags.id,
			label: tags.label,
			slug: tags.slug,
			useCount: tags.useCount,
			cooccurrenceCount: tagCooccurrence.cooccurrenceCount
		})
		.from(tagCooccurrence)
		.innerJoin(tags, eq(tagCooccurrence.relatedTagId, tags.id))
		.where(eq(tagCooccurrence.tagId, tag.id))
		.orderBy(desc(tagCooccurrence.cooccurrenceCount))
		.limit(10);

	// Get total count of quizzes with this tag
	const countResult = await db
		.select({ value: count() })
		.from(quizTags)
		.innerJoin(quizzes, eq(quizTags.quizId, quizzes.id))
		.where(and(eq(quizTags.tagId, tag.id), eq(quizzes.visibility, 'public')));

	const totalCount = countResult[0]?.value ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const offset = (currentPage - 1) * PAGE_SIZE;

	// Get quizzes with this tag
	const quizzesData = await db
		.select({
			id: quizzes.id,
			title: quizzes.title,
			slug: quizzes.slug,
			description: quizzes.description,
			createdAt: quizzes.createdAt,
			ownerName: user.name,
			ownerSlug: user.slug,
			speedRunId: speedRuns.id
		})
		.from(quizTags)
		.innerJoin(quizzes, eq(quizTags.quizId, quizzes.id))
		.innerJoin(user, eq(quizzes.ownerId, user.id))
		.leftJoin(speedRuns, eq(quizzes.id, speedRuns.quizId))
		.where(and(eq(quizTags.tagId, tag.id), eq(quizzes.visibility, 'public')))
		.orderBy(desc(quizzes.createdAt))
		.limit(PAGE_SIZE)
		.offset(offset);

	// Fetch all tags for these quizzes
	const quizIds = quizzesData.map((row) => row.id);
	const allTagsData =
		quizIds.length > 0
			? await db
					.select({
						quizId: quizTags.quizId,
						id: tags.id,
						label: tags.label,
						slug: tags.slug
					})
					.from(quizTags)
					.innerJoin(tags, eq(quizTags.tagId, tags.id))
					.where(inArray(quizTags.quizId, quizIds))
			: [];

	// Group tags by quiz
	const tagsByQuiz = new Map<string, typeof allTagsData>();
	for (const tag of allTagsData) {
		if (!tagsByQuiz.has(tag.quizId)) {
			tagsByQuiz.set(tag.quizId, []);
		}
		tagsByQuiz.get(tag.quizId)!.push(tag);
	}

	const quizzesList = quizzesData.map((row) => ({
		id: row.id,
		title: row.title,
		slug: row.slug,
		description: row.description,
		createdAt: row.createdAt,
		owner: {
			name: row.ownerName,
			slug: row.ownerSlug
		},
		speedRun: row.speedRunId ? { id: row.speedRunId } : null,
		tags: tagsByQuiz.get(row.id)?.map((t) => ({ id: t.id, label: t.label, slug: t.slug })) || []
	}));

	return {
		tag: {
			id: tag.id,
			label: tag.label,
			slug: tag.slug,
			useCount: tag.useCount
		},
		relatedTags: relatedTagsData,
		quizzes: quizzesList,
		currentPage,
		totalPages,
		totalCount
	};
};
