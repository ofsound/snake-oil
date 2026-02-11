import { fail } from '@sveltejs/kit';
import { count, eq } from 'drizzle-orm';

import { canDeleteQuiz } from '$lib/server/permissions';
import { db } from '$lib/server/db';
import { buildWhereClause, buildOrderBy, ITEMS_PER_PAGE } from '$lib/server/pagination-utils';
import { quizzes, user, speedRuns, soundbites, quizAnswers } from '$lib/server/db/schema';
import { logAdminAction, AdminActionTypes, TargetTypes } from '$lib/server/audit-logger';
import { handleQuizTagRemoval } from '$lib/server/tag-utils';

import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const search = url.searchParams.get('search')?.trim() ?? '';
	const visibilityFilter = url.searchParams.get('visibility') ?? 'all';
	const sortField = url.searchParams.get('sort') ?? 'created';
	const sortOrder = (url.searchParams.get('order') as 'asc' | 'desc') ?? 'desc';

	const offset = (page - 1) * ITEMS_PER_PAGE;

	// Build where clause
	let whereClause = buildWhereClause(
		search,
		[quizzes.title, quizzes.description],
		visibilityFilter !== 'all'
			? [{ field: quizzes.visibility, value: visibilityFilter }]
			: undefined
	);

	// Build order by
	const orderByField = sortField === 'title' ? quizzes.title : quizzes.createdAt;
	const orderByClause = buildOrderBy(orderByField, sortOrder);

	// Get quizzes with creator info
	const quizzesList = await db
		.select({
			id: quizzes.id,
			title: quizzes.title,
			slug: quizzes.slug,
			description: quizzes.description,
			visibility: quizzes.visibility,
			createdAt: quizzes.createdAt,
			creatorId: quizzes.creatorId,
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

	// Get total count
	const totalResult = await db
		.select({ value: count() })
		.from(quizzes)
		.innerJoin(user, eq(quizzes.creatorId, user.id))
		.leftJoin(speedRuns, eq(quizzes.id, speedRuns.quizId))
		.where(whereClause);

	const totalQuizzes = totalResult[0]?.value ?? 0;
	const totalPages = Math.ceil(totalQuizzes / ITEMS_PER_PAGE);

	return {
		items: quizzesList,
		currentPage: page,
		totalPages,
		totalItems: totalQuizzes,
		itemsPerPage: ITEMS_PER_PAGE,
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

		const quiz = await db.query.quizzes.findFirst({
			where: eq(quizzes.id, quizId),
			with: {
				creator: {
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

		if (confirmTitle !== quiz.title) {
			return fail(400, {
				error: 'Quiz title does not match. Please type the exact title to confirm deletion.'
			});
		}

		const soundbiteCount = await db
			.select({ value: count() })
			.from(soundbites)
			.where(eq(soundbites.quizId, quizId));

		const submissionCount = await db
			.select({ value: count() })
			.from(quizAnswers)
			.where(eq(quizAnswers.quizId, quizId));

		await handleQuizTagRemoval(db, quizId, quiz.visibility === 'public');
		await db.delete(quizzes).where(eq(quizzes.id, quizId));

		await logAdminAction(
			locals.user.id,
			AdminActionTypes.DELETE_QUIZ,
			TargetTypes.QUIZ,
			quizId,
			quiz.creatorId,
			{
				title: quiz.title,
				creatorName: quiz.creator?.name,
				creatorSlug: quiz.creator?.slug,
				visibility: quiz.visibility,
				questionCount: soundbiteCount[0]?.value ?? 0,
				submissionCount: submissionCount[0]?.value ?? 0
			}
		);

		return { success: true };
	}
};
