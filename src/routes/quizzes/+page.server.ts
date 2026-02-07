import { asc, desc, count, eq, sql } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { quizzes, user, speedRuns } from '$lib/server/db/schema';

import type { PageServerLoad } from './$types';

const PAGE_SIZE = 15;

type SortOption = 'date' | 'title' | 'username';
type OrderOption = 'asc' | 'desc';
type ModeOption = 'all' | 'quiz' | 'speedrun';

export const load: PageServerLoad = async ({ url }) => {
	const pageParam = url.searchParams.get('page');
	const sortParam = url.searchParams.get('sort');
	const orderParam = url.searchParams.get('order');
	const modeParam = url.searchParams.get('mode');

	const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
	const sort: SortOption = ['date', 'title', 'username'].includes(sortParam ?? '')
		? (sortParam as SortOption)
		: 'date';
	const order: OrderOption = orderParam === 'asc' ? 'asc' : 'desc';
	const mode: ModeOption = ['all', 'quiz', 'speedrun'].includes(modeParam ?? '')
		? (modeParam as ModeOption)
		: 'all';

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

	// Get total count for pagination
	const countQuery = db
		.select({ value: count() })
		.from(quizzes)
		.leftJoin(speedRuns, eq(quizzes.id, speedRuns.quizId))
		.where(
			modeFilter
				? sql`${quizzes.visibility} = 'public' AND ${modeFilter}`
				: eq(quizzes.visibility, 'public')
		);

	const totalCountResult = await countQuery;
	const totalCount = totalCountResult[0]?.value ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

	// Clamp page to valid range
	const currentPage = Math.min(page, totalPages);
	const offset = (currentPage - 1) * PAGE_SIZE;

	// Use join query for all sorting (most reliable)
	const result = await db
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
		.from(quizzes)
		.innerJoin(user, eq(quizzes.ownerId, user.id))
		.leftJoin(speedRuns, eq(quizzes.id, speedRuns.quizId))
		.where(
			modeFilter
				? sql`${quizzes.visibility} = 'public' AND ${modeFilter}`
				: eq(quizzes.visibility, 'public')
		)
		.orderBy(orderByClause)
		.limit(PAGE_SIZE)
		.offset(offset);

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
		speedRun: row.speedRunId ? { id: row.speedRunId } : null
	}));

	return {
		quizzes: quizzesList,
		currentPage,
		totalPages,
		totalCount,
		sort,
		order,
		mode
	};
};
