import { db } from '$lib/server/db';
import { user, quizzes, adminActions, speedRunResults } from '$lib/server/db/schema';
import { desc, count, eq, sql } from 'drizzle-orm';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Get total users
	const totalUsersResult = await db.select({ value: count() }).from(user);
	const totalUsers = totalUsersResult[0]?.value ?? 0;

	// Get new users in last 7 days
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
	const newUsersResult = await db
		.select({ value: count() })
		.from(user)
		.where(sql`${user.createdAt} >= ${sevenDaysAgo}`);
	const newUsersLast7Days = newUsersResult[0]?.value ?? 0;

	// Get suspended users
	const suspendedUsersResult = await db
		.select({ value: count() })
		.from(user)
		.where(eq(user.isSuspended, true));
	const suspendedUsers = suspendedUsersResult[0]?.value ?? 0;

	// Get total quizzes
	const totalQuizzesResult = await db.select({ value: count() }).from(quizzes);
	const totalQuizzes = totalQuizzesResult[0]?.value ?? 0;

	// Get private quizzes
	const privateQuizzesResult = await db
		.select({ value: count() })
		.from(quizzes)
		.where(eq(quizzes.visibility, 'private'));
	const privateQuizzes = privateQuizzesResult[0]?.value ?? 0;

	// Get total speed run results
	const totalSpeedRunsResult = await db.select({ value: count() }).from(speedRunResults);
	const totalSpeedRuns = totalSpeedRunsResult[0]?.value ?? 0;

	// Get recent admin actions
	const recentActions = await db.query.adminActions.findMany({
		orderBy: desc(adminActions.createdAt),
		limit: 10,
		with: {
			admin: {
				columns: {
					name: true,
					slug: true
				}
			}
		}
	});

	return {
		stats: {
			totalUsers,
			newUsersLast7Days,
			suspendedUsers,
			totalQuizzes,
			privateQuizzes,
			totalSpeedRuns
		},
		recentActions
	};
};
