import { db } from '$lib/server/db';
import { user, quizzes, quizAnswers, speedRunResults } from '$lib/server/db/schema';
import { desc, asc, count, eq, like, or, sql } from 'drizzle-orm';

import type { PageServerLoad } from './$types';

const PAGE_SIZE = 25;

type SortField = 'created' | 'name' | 'role';
type SortOrder = 'asc' | 'desc';

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const search = url.searchParams.get('search')?.trim() ?? '';
	const roleFilter = url.searchParams.get('role') ?? 'all';
	const statusFilter = url.searchParams.get('status') ?? 'all';
	const sortField: SortField = (url.searchParams.get('sort') as SortField) ?? 'created';
	const sortOrder: SortOrder = (url.searchParams.get('order') as SortOrder) ?? 'desc';

	const offset = (page - 1) * PAGE_SIZE;

	// Build where clause
	let whereClause = undefined;

	if (search) {
		const searchPattern = `%${search}%`;
		whereClause = or(
			like(user.name, searchPattern),
			like(user.slug, searchPattern),
			like(user.email, searchPattern)
		);
	}

	if (roleFilter !== 'all') {
		const roleCondition = eq(user.role, roleFilter);
		whereClause = whereClause ? sql`${whereClause} AND ${roleCondition}` : roleCondition;
	}

	if (statusFilter === 'suspended') {
		const statusCondition = eq(user.isSuspended, true);
		whereClause = whereClause ? sql`${whereClause} AND ${statusCondition}` : statusCondition;
	} else if (statusFilter === 'active') {
		const statusCondition = eq(user.isSuspended, false);
		whereClause = whereClause ? sql`${whereClause} AND ${statusCondition}` : statusCondition;
	}

	// Build order by
	let orderByClause;
	const orderFn = sortOrder === 'asc' ? asc : desc;

	if (sortField === 'name') {
		orderByClause = orderFn(user.name);
	} else if (sortField === 'role') {
		orderByClause = orderFn(user.role);
	} else {
		orderByClause = orderFn(user.createdAt);
	}

	// Get users
	const users = await db.query.user.findMany({
		where: whereClause,
		orderBy: orderByClause,
		limit: PAGE_SIZE,
		offset
	});

	// Get total count
	const totalResult = await db.select({ value: count() }).from(user).where(whereClause);
	const totalUsers = totalResult[0]?.value ?? 0;
	const totalPages = Math.ceil(totalUsers / PAGE_SIZE);

	// Get user stats (quiz count, submission count, speed run count)
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

	// Create lookup maps
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
		users: usersWithStats,
		pagination: {
			page,
			totalPages,
			totalUsers,
			pageSize: PAGE_SIZE
		},
		filters: {
			search,
			role: roleFilter,
			status: statusFilter,
			sort: sortField,
			order: sortOrder
		}
	};
};
