import { asc, desc, count, eq, like, sql } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { tags, quizzes, quizTags, user } from '$lib/server/db/schema';

import type { PageServerLoad } from './$types';

const PAGE_SIZE = 24;

type SortOption = 'popularity' | 'name';
type OrderOption = 'asc' | 'desc';

export const load: PageServerLoad = async ({ url }) => {
	const pageParam = url.searchParams.get('page');
	const sortParam = url.searchParams.get('sort');
	const orderParam = url.searchParams.get('order');
	const searchParam = url.searchParams.get('q')?.trim().toLowerCase();

	const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
	const sort: SortOption = sortParam === 'name' ? 'name' : 'popularity';
	const order: OrderOption = orderParam === 'asc' ? 'asc' : 'desc';

	// Build order clause
	let orderByClause;
	if (sort === 'name') {
		orderByClause = order === 'asc' ? asc(tags.label) : desc(tags.label);
	} else {
		// Sort by popularity (useCount)
		orderByClause = order === 'asc' ? asc(tags.useCount) : desc(tags.useCount);
	}

	// Build where clause for search
	let whereClause = undefined;
	if (searchParam) {
		whereClause = like(sql`LOWER(${tags.label})`, `%${searchParam}%`);
	}

	// Get total count
	const countResult = await db.select({ value: count() }).from(tags).where(whereClause);

	const totalCount = countResult[0]?.value ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const offset = (currentPage - 1) * PAGE_SIZE;

	// Fetch tags with pagination
	const tagsData = await db.query.tags.findMany({
		where: whereClause,
		orderBy: orderByClause,
		limit: PAGE_SIZE,
		offset
	});

	// Fetch preview quizzes for each tag (max 3 per tag)
	const tagIds = tagsData.map((t) => t.id);
	const previewData =
		tagIds.length > 0
			? await db
					.select({
						tagId: quizTags.tagId,
						quizId: quizzes.id,
						title: quizzes.title,
						slug: quizzes.slug,
						ownerName: user.name,
						ownerSlug: user.slug,
						createdAt: quizzes.createdAt
					})
					.from(quizTags)
					.innerJoin(quizzes, eq(quizTags.quizId, quizzes.id))
					.innerJoin(user, eq(quizzes.ownerId, user.id))
					.where(eq(quizzes.visibility, 'public'))
					.orderBy(desc(quizzes.createdAt))
			: [];

	// Group previews by tag (take only first 3 per tag)
	const previewsByTag = new Map<string, typeof previewData>();
	for (const item of previewData) {
		if (!previewsByTag.has(item.tagId)) {
			previewsByTag.set(item.tagId, []);
		}
		const current = previewsByTag.get(item.tagId)!;
		if (current.length < 3) {
			current.push(item);
		}
	}

	const tagsWithPreviews = tagsData.map((tag) => ({
		id: tag.id,
		label: tag.label,
		slug: tag.slug,
		useCount: tag.useCount,
		previews:
			previewsByTag.get(tag.id)?.map((p) => ({
				id: p.quizId,
				title: p.title,
				slug: p.slug,
				owner: {
					name: p.ownerName,
					slug: p.ownerSlug
				},
				createdAt: p.createdAt
			})) || []
	}));

	return {
		tags: tagsWithPreviews,
		currentPage,
		totalPages,
		totalCount,
		sort,
		order,
		searchQuery: searchParam || null
	};
};
