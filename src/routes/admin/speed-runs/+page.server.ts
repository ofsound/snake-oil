import { fail } from '@sveltejs/kit';
import { count, eq, sql } from 'drizzle-orm';

import { canDeleteQuiz } from '$lib/server/permissions';
import { db } from '$lib/server/db';
import {
	speedRunResults,
	speedRuns,
	quizzes as _quizzes,
	user as _user
} from '$lib/server/db/schema';
import { logAdminAction, AdminActionTypes, TargetTypes } from '$lib/server/audit-logger';
import { buildWhereClause, buildOrderBy, ITEMS_PER_PAGE } from '$lib/server/pagination-utils';

import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const quizFilter = url.searchParams.get('quiz') ?? 'all';
	const sortField = url.searchParams.get('sort') ?? 'created';
	const sortOrder = (url.searchParams.get('order') as 'asc' | 'desc') ?? 'desc';
	const suspiciousOnly = url.searchParams.get('suspicious') === 'true';

	const offset = (page - 1) * ITEMS_PER_PAGE;

	// Get all quizzes with speed runs for filter
	const allSpeedRuns = await db.query.speedRuns.findMany({
		with: {
			quiz: {
				columns: {
					id: true,
					title: true,
					slug: true
				},
				with: {
					creator: {
						columns: {
							slug: true
						}
					}
				}
			}
		}
	});

	// Build where clause
	const filterConditions = [
		...(quizFilter !== 'all' ? [{ field: speedRunResults.speedRunId, value: quizFilter }] : [])
	];

	let whereClause = buildWhereClause(
		'',
		undefined,
		filterConditions.length > 0 ? filterConditions : undefined
	);

	// Add suspicious filter using raw SQL
	if (suspiciousOnly) {
		const suspiciousCondition = sql`${speedRunResults.totalTimeMs} < (${speedRunResults.totalQuestions} * 1000)`;
		whereClause = whereClause
			? sql`${whereClause} AND ${suspiciousCondition}`
			: suspiciousCondition;
	}

	// Build order by - handle special case for score sorting
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let orderByClause: any;
	if (sortField === 'score') {
		orderByClause = [
			buildOrderBy(speedRunResults.correctCount, sortOrder),
			buildOrderBy(speedRunResults.totalTimeMs, 'asc')
		];
	} else {
		const orderByField =
			sortField === 'time' ? speedRunResults.totalTimeMs : speedRunResults.createdAt;
		orderByClause = buildOrderBy(orderByField, sortOrder);
	}

	// Get speed run results
	const results = await db.query.speedRunResults.findMany({
		where: whereClause,
		orderBy: orderByClause,
		limit: ITEMS_PER_PAGE,
		offset,
		with: {
			user: {
				columns: {
					id: true,
					name: true,
					slug: true
				}
			},
			speedRun: {
				with: {
					quiz: {
						columns: {
							id: true,
							title: true,
							slug: true
						},
						with: {
							creator: {
								columns: {
									slug: true
								}
							}
						}
					}
				}
			}
		}
	});

	// Get total count
	const totalResult = await db.select({ value: count() }).from(speedRunResults).where(whereClause);
	const totalResults = totalResult[0]?.value ?? 0;
	const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);

	return {
		items: results.map((r) => ({
			...r,
			isSuspicious: r.totalTimeMs < r.totalQuestions * 1000
		})),
		currentPage: page,
		totalPages,
		totalItems: totalResults,
		itemsPerPage: ITEMS_PER_PAGE,
		filters: {
			quiz: quizFilter,
			sort: sortField,
			order: sortOrder,
			suspicious: suspiciousOnly
		},
		quizzes: allSpeedRuns.map((sr) => ({
			id: sr.id,
			quizId: sr.quiz.id,
			title: sr.quiz.title,
			slug: sr.quiz.slug,
			creatorSlug: sr.quiz.creator.slug
		}))
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		if (!canDeleteQuiz(locals.user)) {
			return fail(403, { error: 'You do not have permission to delete speed run results' });
		}

		const formData = await request.formData();
		const resultId = formData.get('resultId')?.toString();

		if (!resultId) {
			return fail(400, { error: 'Result ID is required' });
		}

		const result = await db.query.speedRunResults.findFirst({
			where: eq(speedRunResults.id, resultId),
			with: {
				speedRun: {
					with: {
						quiz: {
							columns: {
								id: true,
								title: true
							}
						}
					}
				}
			}
		});

		if (!result) {
			return fail(404, { error: 'Speed run result not found' });
		}

		await db.delete(speedRunResults).where(eq(speedRunResults.id, resultId));

		await logAdminAction(
			locals.user.id,
			AdminActionTypes.DELETE_SPEED_RUN_RESULT,
			TargetTypes.SPEED_RUN_RESULT,
			resultId,
			result.userId ?? undefined,
			{
				quizId: result.speedRun.quiz.id,
				quizTitle: result.speedRun.quiz.title,
				correctCount: result.correctCount,
				totalQuestions: result.totalQuestions,
				totalTimeMs: result.totalTimeMs,
				score: result.score
			}
		);

		return { success: true };
	},

	clearLeaderboard: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		if (!canDeleteQuiz(locals.user)) {
			return fail(403, { error: 'You do not have permission to clear leaderboards' });
		}

		const formData = await request.formData();
		const speedRunId = formData.get('speedRunId')?.toString();
		const confirmTitle = formData.get('confirmTitle')?.toString();

		if (!speedRunId) {
			return fail(400, { error: 'Speed run ID is required' });
		}

		const speedRun = await db.query.speedRuns.findFirst({
			where: eq(speedRuns.id, speedRunId),
			with: {
				quiz: {
					columns: {
						id: true,
						title: true,
						slug: true
					},
					with: {
						creator: {
							columns: {
								slug: true
							}
						}
					}
				}
			}
		});

		if (!speedRun) {
			return fail(404, { error: 'Speed run not found' });
		}

		if (confirmTitle !== speedRun.quiz.title) {
			return fail(400, { error: 'Quiz title does not match' });
		}

		const countResult = await db
			.select({ value: count() })
			.from(speedRunResults)
			.where(eq(speedRunResults.speedRunId, speedRunId));

		const resultsCount = countResult[0]?.value ?? 0;

		await db.delete(speedRunResults).where(eq(speedRunResults.speedRunId, speedRunId));

		await logAdminAction(
			locals.user.id,
			AdminActionTypes.CLEAR_LEADERBOARD,
			TargetTypes.SPEED_RUN_RESULT,
			speedRunId,
			undefined,
			{
				quizId: speedRun.quiz.id,
				quizTitle: speedRun.quiz.title,
				resultsDeleted: resultsCount
			}
		);

		return { success: true, deletedCount: resultsCount };
	}
};
