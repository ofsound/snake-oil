import { error, fail } from '@sveltejs/kit';
import { eq, desc, asc, count, sql, like, or } from 'drizzle-orm';

import { canDeleteQuiz } from '$lib/server/permissions';
import { db } from '$lib/server/db';
import { quizzes, user, speedRuns, quizAnswers, soundbites } from '$lib/server/db/schema';
import { logAdminAction, AdminActionTypes, TargetTypes } from '$lib/server/audit-logger';

import type { PageServerLoad, Actions } from './$types';

const PAGE_SIZE = 25;

type SortField = 'created' | 'title';
type SortOrder = 'asc' | 'desc';

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const search = url.searchParams.get('search')?.trim() ?? '';
	const visibilityFilter = url.searchParams.get('visibility') ?? 'all';
	const sortField: SortField = (url.searchParams.get('sort') as SortField) ?? 'created';
	const sortOrder: SortOrder = (url.searchParams.get('order') as SortOrder) ?? 'desc';

	const offset = (page - 1) * PAGE_SIZE;

	// Build where clause
	let whereClause = undefined;

	if (search) {
		const searchPattern = `%${search}%`;
		whereClause = or(like(quizzes.title, searchPattern), like(quizzes.description, searchPattern));
	}

	if (visibilityFilter !== 'all') {
		const visibilityCondition = eq(quizzes.visibility, visibilityFilter);
		whereClause = whereClause
			? sql`${whereClause} AND ${visibilityCondition}`
			: visibilityCondition;
	}

	// Build order by
	let orderByClause;
	const orderFn = sortOrder === 'asc' ? asc : desc;

	if (sortField === 'title') {
		orderByClause = orderFn(quizzes.title);
	} else {
		orderByClause = orderFn(quizzes.createdAt);
	}

	// Get quizzes with owner info
	const quizzesList = await db
		.select({
			id: quizzes.id,
			title: quizzes.title,
			slug: quizzes.slug,
			description: quizzes.description,
			visibility: quizzes.visibility,
			createdAt: quizzes.createdAt,
			ownerId: quizzes.ownerId,
			ownerName: user.name,
			ownerSlug: user.slug,
			speedRunId: speedRuns.id
		})
		.from(quizzes)
		.innerJoin(user, eq(quizzes.ownerId, user.id))
		.leftJoin(speedRuns, eq(quizzes.id, speedRuns.quizId))
		.where(whereClause)
		.orderBy(orderByClause)
		.limit(PAGE_SIZE)
		.offset(offset);

	// Get total count
	const totalResult = await db
		.select({ value: count() })
		.from(quizzes)
		.innerJoin(user, eq(quizzes.ownerId, user.id))
		.leftJoin(speedRuns, eq(quizzes.id, speedRuns.quizId))
		.where(whereClause);

	const totalQuizzes = totalResult[0]?.value ?? 0;
	const totalPages = Math.ceil(totalQuizzes / PAGE_SIZE);

	return {
		quizzes: quizzesList,
		pagination: {
			page,
			totalPages,
			totalQuizzes,
			pageSize: PAGE_SIZE
		},
		filters: {
			search,
			visibility: visibilityFilter,
			sort: sortField,
			order: sortOrder
		}
	};
};

export const actions: Actions = {
	delete: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		if (!canDeleteQuiz(locals.user)) {
			return fail(403, { error: 'You do not have permission to delete quizzes' });
		}

		const formData = await request.formData();
		const quizId = formData.get('quizId')?.toString();
		const confirmTitle = formData.get('confirmTitle')?.toString();

		if (!quizId) {
			return fail(400, { error: 'Quiz ID is required' });
		}

		// Get quiz details
		const quiz = await db.query.quizzes.findFirst({
			where: eq(quizzes.id, quizId),
			with: {
				owner: {
					columns: {
						id: true,
						name: true,
						slug: true
					}
				}
			}
		});

		if (!quiz) {
			return fail(404, { error: 'Quiz not found' });
		}

		// Verify title confirmation
		if (confirmTitle !== quiz.title) {
			return fail(400, {
				error: 'Quiz title does not match. Please type the exact title to confirm deletion.'
			});
		}

		// Get count of related data for audit log
		const soundbiteCount = await db
			.select({ value: count() })
			.from(soundbites)
			.where(eq(soundbites.quizId, quizId));

		const submissionCount = await db
			.select({ value: count() })
			.from(quizAnswers)
			.where(eq(quizAnswers.quizId, quizId));

		// Delete the quiz (cascades to soundbites, quizAnswers, speedRuns)
		await db.delete(quizzes).where(eq(quizzes.id, quizId));

		// Log the action
		await logAdminAction(
			locals.user.id,
			AdminActionTypes.DELETE_QUIZ,
			TargetTypes.QUIZ,
			quizId,
			quiz.ownerId,
			{
				title: quiz.title,
				ownerName: quiz.owner?.name,
				ownerSlug: quiz.owner?.slug,
				visibility: quiz.visibility,
				questionCount: soundbiteCount[0]?.value ?? 0,
				submissionCount: submissionCount[0]?.value ?? 0
			}
		);

		return { success: true };
	}
};
