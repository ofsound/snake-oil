import { db } from '$lib/server/db';
import { quizzes, user } from '$lib/server/db/schema';
import { asc, desc, count, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 15;

type SortOption = 'date' | 'title' | 'username';
type OrderOption = 'asc' | 'desc';

export const load: PageServerLoad = async ({ url }) => {
	const pageParam = url.searchParams.get('page');
	const sortParam = url.searchParams.get('sort');
	const orderParam = url.searchParams.get('order');

	const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1);
	const sort: SortOption = ['date', 'title', 'username'].includes(sortParam ?? '')
		? (sortParam as SortOption)
		: 'date';
	const order: OrderOption = orderParam === 'asc' ? 'asc' : 'desc';

	// Get total count for pagination
	const [{ value: totalCount }] = await db.select({ value: count() }).from(quizzes);
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
		// For username sorting, we need to join and sort by user.name
		// Using a raw query approach since Drizzle relational queries don't support ordering by relation fields
		orderByClause = orderFn(user.name);
	} else {
		// Default: sort by date
		orderByClause = orderFn(quizzes.createdAt);
	}

	let quizzesList;

	if (sort === 'username') {
		// Use a join query for username sorting
		const result = await db
			.select({
				id: quizzes.id,
				title: quizzes.title,
				slug: quizzes.slug,
				description: quizzes.description,
				createdAt: quizzes.createdAt,
				ownerName: user.name,
				ownerSlug: user.slug
			})
			.from(quizzes)
			.innerJoin(user, eq(quizzes.ownerId, user.id))
			.orderBy(orderByClause)
			.limit(PAGE_SIZE)
			.offset(offset);

		quizzesList = result.map((row) => ({
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
	} else {
		// Use relational query for date and title sorting
		quizzesList = await db.query.quizzes.findMany({
			orderBy: orderByClause,
			limit: PAGE_SIZE,
			offset,
			columns: {
				id: true,
				title: true,
				slug: true,
				description: true,
				createdAt: true
			},
			with: {
				owner: {
					columns: {
						name: true,
						slug: true
					}
				}
			}
		});
	}

	return {
		quizzes: quizzesList,
		currentPage,
		totalPages,
		totalCount,
		sort,
		order
	};
};
