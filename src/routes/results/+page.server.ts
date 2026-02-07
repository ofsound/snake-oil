import { redirect } from '@sveltejs/kit';

import { asc, desc, count, eq, or, ilike, sql, and, inArray } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { quizzes, user, speedRuns, tags, quizTags } from '$lib/server/db/schema';

import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;
const MAX_TAGS_FILTER = 5;

type SortOption = 'relevance' | 'date' | 'title' | 'username';
type OrderOption = 'asc' | 'desc';
type ModeOption = 'all' | 'quiz' | 'speedrun';

export const load: PageServerLoad = async ({ url }) => {
	const searchQuery = url.searchParams.get('q')?.trim();
	const modeParam = url.searchParams.get('mode');
	const tagsParam = url.searchParams.get('tags');

	// Redirect to /quizzes if no search query and no tags
	if (!searchQuery && !tagsParam) {
		redirect(302, '/quizzes');
	}

	const pageParam = url.searchParams.get('page');
	const sortParam = url.searchParams.get('sort');
	const orderParam = url.searchParams.get('order');

	const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
	const sort: SortOption = ['relevance', 'date', 'title', 'username'].includes(sortParam ?? '')
		? (sortParam as SortOption)
		: 'relevance';
	const order: OrderOption = orderParam === 'asc' ? 'asc' : 'desc';
	const mode: ModeOption = ['all', 'quiz', 'speedrun'].includes(modeParam ?? '')
		? (modeParam as ModeOption)
		: 'all';

	// Parse active tags (comma-separated, max 5)
	let activeTagSlugs: string[] = [];
	if (tagsParam) {
		activeTagSlugs = tagsParam
			.split(',')
			.map((t) => t.trim())
			.filter(Boolean)
			.slice(0, MAX_TAGS_FILTER);
	}

	// Validate active tags exist and get their data
	let activeTagsData: { id: string; label: string; slug: string }[] = [];
	if (activeTagSlugs.length > 0) {
		const foundTags = await db.query.tags.findMany({
			where: inArray(tags.slug, activeTagSlugs)
		});
		activeTagsData = foundTags.map((t) => ({ id: t.id, label: t.label, slug: t.slug }));
	}

	// Fetch popular tags for sidebar (top 20) - do this early so it's available for early returns
	const popularTags = await db.query.tags.findMany({
		orderBy: desc(tags.useCount),
		limit: 20
	});

	// Get total tags count
	const totalTagsResult = await db.select({ value: count() }).from(tags);
	const totalTagsCount = totalTagsResult[0]?.value ?? 0;

	const searchPattern = searchQuery ? `%${searchQuery}%` : null;

	// Build relevance score using SQL CASE expressions (only if searching)
	const relevanceScore = searchQuery
		? sql<number>`(
			CASE WHEN ${quizzes.title} ILIKE ${searchPattern} THEN 3 ELSE 0 END +
			CASE WHEN ${quizzes.description} ILIKE ${searchPattern} THEN 2 ELSE 0 END +
			CASE WHEN ${user.name} ILIKE ${searchPattern} THEN 1 ELSE 0 END
		)`.as('relevance_score')
		: sql<number>`0`.as('relevance_score');

	// Find quiz IDs that have ALL selected tags (AND logic)
	let matchingQuizIds: string[] | undefined = undefined;
	if (activeTagsData.length > 0) {
		const tagIds = activeTagsData.map((t) => t.id);

		// Find quizzes that have all the selected tags
		const quizzesWithTags = await db
			.select({
				quizId: quizTags.quizId,
				tagCount: sql<number>`count(distinct ${quizTags.tagId})`.as('tag_count')
			})
			.from(quizTags)
			.where(inArray(quizTags.tagId, tagIds))
			.groupBy(quizTags.quizId)
			.having(sql`count(distinct ${quizTags.tagId}) = ${tagIds.length}`);

		matchingQuizIds = quizzesWithTags.map((q) => q.quizId);

		// If no quizzes match all tags, return empty result early
		if (matchingQuizIds.length === 0) {
			return {
				quizzes: [],
				query: searchQuery,
				currentPage: 1,
				totalPages: 0,
				totalCount: 0,
				sort,
				order,
				mode,
				popularTags,
				totalTagsCount,
				activeTags: activeTagsData
			};
		}
	}

	// Build WHERE clause
	const conditions: (
		| ReturnType<typeof and>
		| ReturnType<typeof or>
		| ReturnType<typeof eq>
		| ReturnType<typeof sql>
	)[] = [eq(quizzes.visibility, 'public')];

	if (searchQuery) {
		conditions.push(
			or(
				ilike(quizzes.title, searchPattern!),
				ilike(quizzes.description, searchPattern!),
				ilike(user.name, searchPattern!)
			)!
		);
	}

	// Build mode filter
	if (mode === 'quiz') {
		conditions.push(sql`${speedRuns.id} IS NULL`);
	} else if (mode === 'speedrun') {
		conditions.push(sql`${speedRuns.id} IS NOT NULL`);
	}

	// Add tag filter using matching quiz IDs
	if (matchingQuizIds) {
		conditions.push(inArray(quizzes.id, matchingQuizIds));
	}

	const whereClause = and(...conditions);

	// Get total count for pagination
	const [{ value: totalCount }] = await db
		.select({ value: count() })
		.from(quizzes)
		.innerJoin(user, eq(quizzes.ownerId, user.id))
		.leftJoin(speedRuns, eq(quizzes.id, speedRuns.quizId))
		.where(whereClause);

	const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

	// Clamp page to valid range
	const currentPage = Math.min(page, totalPages);
	const offset = (currentPage - 1) * PAGE_SIZE;

	// Build order clause based on sort option
	const orderFn = order === 'asc' ? asc : desc;
	let orderByClause;

	if (sort === 'title') {
		orderByClause = orderFn(quizzes.title);
	} else if (sort === 'username') {
		orderByClause = orderFn(user.name);
	} else if (sort === 'date') {
		orderByClause = orderFn(quizzes.createdAt);
	} else {
		// Default: sort by relevance score (always desc for relevance), then by date
		orderByClause = desc(relevanceScore);
	}

	// Execute the search query
	const result = await db
		.select({
			id: quizzes.id,
			title: quizzes.title,
			slug: quizzes.slug,
			description: quizzes.description,
			createdAt: quizzes.createdAt,
			ownerName: user.name,
			ownerSlug: user.slug,
			speedRunId: speedRuns.id,
			relevanceScore
		})
		.from(quizzes)
		.innerJoin(user, eq(quizzes.ownerId, user.id))
		.leftJoin(speedRuns, eq(quizzes.id, speedRuns.quizId))
		.where(whereClause)
		.orderBy(orderByClause, desc(quizzes.createdAt))
		.limit(PAGE_SIZE)
		.offset(offset);

	// Fetch tags for all quizzes
	const quizIds = result.map((row) => row.id);
	const tagsData =
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
	const tagsByQuiz = new Map<string, typeof tagsData>();
	for (const tag of tagsData) {
		if (!tagsByQuiz.has(tag.quizId)) {
			tagsByQuiz.set(tag.quizId, []);
		}
		tagsByQuiz.get(tag.quizId)!.push(tag);
	}

	const quizzesList = result.map((row) => ({
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
		quizzes: quizzesList,
		query: searchQuery,
		currentPage,
		totalPages,
		totalCount,
		sort,
		order,
		mode,
		popularTags,
		totalTagsCount,
		activeTags: activeTagsData
	};
};
