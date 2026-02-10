import { asc, desc, count, eq, sql, inArray, and } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { quizzes, user, speedRuns, tags, quizTags } from '$lib/server/db/schema';

import type { PageServerLoad } from './$types';

const ITEMS_PER_PAGE = 15;
const MAX_TAGS_FILTER = 5;

type SortOption = 'date' | 'title' | 'username';
type OrderOption = 'asc' | 'desc';
type ModeOption = 'all' | 'quiz' | 'speedrun';

export const load: PageServerLoad = async ({ url }) => {
	const pageParam = url.searchParams.get('page');
	const sortParam = url.searchParams.get('sort');
	const orderParam = url.searchParams.get('order');
	const modeParam = url.searchParams.get('mode');
	const tagsParam = url.searchParams.get('tags');

	const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
	const sort: SortOption = ['date', 'title', 'username'].includes(sortParam ?? '')
		? (sortParam as SortOption)
		: 'date';
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

	// Build order clause based on sort option
	const orderFn = order === 'asc' ? asc : desc;
	let orderByClause;

	if (sort === 'title') {
		orderByClause = orderFn(quizzes.title);
	} else if (sort === 'username') {
		orderByClause = orderFn(user.name);
	} else {
		orderByClause = orderFn(quizzes.createdAt);
	}

	// Build mode filter
	let modeFilter;
	if (mode === 'quiz') {
		modeFilter = sql`${speedRuns.id} IS NULL`;
	} else if (mode === 'speedrun') {
		modeFilter = sql`${speedRuns.id} IS NOT NULL`;
	} else {
		modeFilter = undefined;
	}

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
	const baseWhere = eq(quizzes.visibility, 'public');
	let whereClause;
	if (modeFilter && matchingQuizIds) {
		whereClause = and(baseWhere, modeFilter, inArray(quizzes.id, matchingQuizIds));
	} else if (modeFilter) {
		whereClause = and(baseWhere, modeFilter);
	} else if (matchingQuizIds) {
		whereClause = and(baseWhere, inArray(quizzes.id, matchingQuizIds));
	} else {
		whereClause = baseWhere;
	}

	// Get total count for pagination
	const countResult = await db
		.select({ value: count() })
		.from(quizzes)
		.leftJoin(speedRuns, eq(quizzes.id, speedRuns.quizId))
		.where(whereClause);

	const totalCount = countResult[0]?.value ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

	// Clamp page to valid range
	const currentPage = Math.min(page, totalPages);
	const offset = (currentPage - 1) * ITEMS_PER_PAGE;

	// Fetch quizzes
	const result = await db
		.select({
			id: quizzes.id,
			title: quizzes.title,
			slug: quizzes.slug,
			description: quizzes.description,
			createdAt: quizzes.createdAt,
			creatorName: user.name,
			creatorSlug: user.slug,
			speedRunId: speedRuns.id
		})
		.from(quizzes)
		.innerJoin(user, eq(quizzes.creatorId, user.id))
		.leftJoin(speedRuns, eq(quizzes.id, speedRuns.quizId))
		.where(whereClause)
		.orderBy(orderByClause)
		.limit(ITEMS_PER_PAGE)
		.offset(offset);

	// Fetch tags for all quizzes in this page
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
		creator: {
			name: row.creatorName,
			slug: row.creatorSlug
		},
		speedRun: row.speedRunId ? { id: row.speedRunId } : null,
		tags: tagsByQuiz.get(row.id)?.map((t) => ({ id: t.id, label: t.label, slug: t.slug })) || []
	}));

	return {
		quizzes: quizzesList,
		currentPage,
		totalPages,
		totalCount,
		itemsPerPage: ITEMS_PER_PAGE,
		sort,
		order,
		mode,
		popularTags,
		totalTagsCount,
		activeTags: activeTagsData
	};
};
