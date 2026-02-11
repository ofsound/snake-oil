import { count, eq, sql } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { buildWhereClause, buildOrderBy, ITEMS_PER_PAGE } from '$lib/server/pagination-utils';
import { user, quizzes, quizAnswers, speedRunResults } from '$lib/server/db/schema';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const search = url.searchParams.get('search')?.trim() ?? '';
	const roleFilter = url.searchParams.get('role') ?? 'all';
	const statusFilter = url.searchParams.get('status') ?? 'all';
	const sortField = url.searchParams.get('sort') ?? 'created';
	const sortOrder = (url.searchParams.get('order') as 'asc' | 'desc') ?? 'desc';

	const offset = (page - 1) * ITEMS_PER_PAGE;

	// Build where clause
	const filterConditions = [
		...(roleFilter !== 'all' ? [{ field: user.role, value: roleFilter }] : []),
		...(statusFilter === 'suspended'
			? [{ field: user.isSuspended, value: 'true' }]
			: statusFilter === 'active'
				? [{ field: user.isSuspended, value: 'false' }]
				: [])
	];

	let whereClause = buildWhereClause(
		search,
		[user.name, user.slug, user.email],
		filterConditions.length > 0 ? filterConditions : undefined
	);

	// Build order by - use any to bypass strict type checking for column selection
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let orderByField: any = user.createdAt;
	if (sortField === 'name') orderByField = user.name;
	else if (sortField === 'role') orderByField = user.role;

	const orderByClause = buildOrderBy(orderByField, sortOrder);

	// Get users
	const users = await db.query.user.findMany({
		where: whereClause,
		orderBy: orderByClause,
		limit: ITEMS_PER_PAGE,
		offset
	});

	// Get total count
	const totalResult = await db.select({ value: count() }).from(user).where(whereClause);
	const totalUsers = totalResult[0]?.value ?? 0;
	const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

	// Get user stats
	const userIds = users.map((u) => u.id);

	const quizCounts = await db
		.select({
			creatorId: quizzes.creatorId,
			count: count()
		})
		.from(quizzes)
		.where(sql`${quizzes.creatorId} IN ${userIds}`)
		.groupBy(quizzes.creatorId);

	const submissionCounts = await db
		.select({
			userId: quizAnswers.userId,
			count: count()
		})
		.from(quizAnswers)
		.where(sql`${quizAnswers.userId} IN ${userIds}`)
		.groupBy(quizAnswers.userId);

	const speedRunCounts = await db
		.select({
			userId: speedRunResults.userId,
			count: count()
		})
		.from(speedRunResults)
		.where(sql`${speedRunResults.userId} IN ${userIds}`)
		.groupBy(speedRunResults.userId);

	const quizCountMap = new Map(quizCounts.map((c) => [c.creatorId, c.count]));
	const submissionCountMap = new Map(submissionCounts.map((c) => [c.userId, c.count]));
	const speedRunCountMap = new Map(speedRunCounts.map((c) => [c.userId, c.count]));

	const usersWithStats = users.map((u) => ({
		...u,
		quizCount: quizCountMap.get(u.id) ?? 0,
		submissionCount: submissionCountMap.get(u.id) ?? 0,
		speedRunCount: speedRunCountMap.get(u.id) ?? 0
	}));

	return {
		items: usersWithStats,
		currentPage: page,
		totalPages,
		totalItems: totalUsers,
		itemsPerPage: ITEMS_PER_PAGE,
		filters: {
			search,
			role: roleFilter,
			status: statusFilter,
			sort: sortField,
			order: sortOrder
		}
	};
};
