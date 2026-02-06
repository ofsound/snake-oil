import { db } from '$lib/server/db';
import { quizzes, user } from '$lib/server/db/schema';
import { asc, desc, count, eq, or, ilike, sql, and } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;

type SortOption = 'relevance' | 'date' | 'title' | 'username';
type OrderOption = 'asc' | 'desc';

export const load: PageServerLoad = async ({ url }) => {
	const searchQuery = url.searchParams.get('q')?.trim();

	// Redirect to /quizzes if no search query
	if (!searchQuery) {
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

	const searchPattern = `%${searchQuery}%`;

	// Build relevance score using SQL CASE expressions
	const relevanceScore = sql<number>`(
		CASE WHEN ${quizzes.title} ILIKE ${searchPattern} THEN 3 ELSE 0 END +
		CASE WHEN ${quizzes.description} ILIKE ${searchPattern} THEN 2 ELSE 0 END +
		CASE WHEN ${user.name} ILIKE ${searchPattern} THEN 1 ELSE 0 END
	)`.as('relevance_score');

	// Build WHERE clause for search (only public quizzes)
	const searchWhereClause = or(
		ilike(quizzes.title, searchPattern),
		ilike(quizzes.description, searchPattern),
		ilike(user.name, searchPattern)
	);
	const whereClause = and(searchWhereClause, eq(quizzes.visibility, 'public'));

	// Get total count for pagination
	const [{ value: totalCount }] = await db
		.select({ value: count() })
		.from(quizzes)
		.innerJoin(user, eq(quizzes.ownerId, user.id))
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
			relevanceScore
		})
		.from(quizzes)
		.innerJoin(user, eq(quizzes.ownerId, user.id))
		.where(whereClause)
		.orderBy(orderByClause, desc(quizzes.createdAt))
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
		}
	}));

	return {
		quizzes: quizzesList,
		query: searchQuery,
		currentPage,
		totalPages,
		totalCount,
		sort,
		order
	};
};
