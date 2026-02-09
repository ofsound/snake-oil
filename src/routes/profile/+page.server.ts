import { redirect } from '@sveltejs/kit';

import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '$lib/server/db';
import {
	quizzes,
	quizAnswers,
	speedRunResults,
	speedRuns,
	quizTags,
	tags,
	user
} from '$lib/server/db/schema';
import { getLoginUrl } from '$lib/constants/routes';

import type { PageServerLoad } from './$types';

const SUBMISSIONS_PER_PAGE = 20;

export const load: PageServerLoad = async ({ locals, url }) => {
	// Ensure user is authenticated - Better Auth handles this in hooks.server.ts
	// but we can add explicit checks for protected routes
	if (!locals.user) {
		// Capture the current URL and pass it to login for redirect after authentication
		const returnUrl = url.pathname + url.search;
		redirect(302, getLoginUrl(returnUrl));
	}

	// Parse filter and pagination params
	const submissionFilter =
		(url.searchParams.get('submissionFilter') as 'all' | 'quiz' | 'speedrun') || 'all';
	const quizFilter = (url.searchParams.get('quizFilter') as 'all' | 'quiz' | 'speedrun') || 'all';
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));

	// Fetch all quizzes owned by the current user, ordered by creation date (newest first)
	const userQuizzes = await db.query.quizzes.findMany({
		where: eq(quizzes.creatorId, locals.user.id),
		orderBy: desc(quizzes.createdAt),
		columns: {
			id: true,
			title: true,
			slug: true,
			description: true,
			visibility: true,
			createdAt: true
		},
		with: {
			speedRun: {
				columns: {
					id: true
				}
			},
			creator: {
				columns: {
					slug: true,
					name: true
				}
			}
		}
	});

	// Fetch tags for all quizzes
	const quizIds = userQuizzes.map((q) => q.id);
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

	const quizzesWithTags = userQuizzes
		.map((quiz) => ({
			...quiz,
			tags: tagsByQuiz.get(quiz.id)?.map((t) => ({ id: t.id, label: t.label, slug: t.slug })) || []
		}))
		.filter((quiz) => {
			if (quizFilter === 'all') return true;
			if (quizFilter === 'quiz') return !quiz.speedRun;
			if (quizFilter === 'speedrun') return !!quiz.speedRun;
			return true;
		});

	// Fetch user's quiz submissions (regular quizzes)
	let quizSubmissions: Array<{
		id: string;
		type: 'quiz';
		quizTitle: string;
		quizSlug: string;
		creatorSlug: string;
		creatorName: string;
		createdAt: Date;
		totalCorrect: number;
		totalQuestions: number;
		score: number;
	}> = [];

	if (submissionFilter === 'all' || submissionFilter === 'quiz') {
		const regularSubmissions = await db
			.select({
				id: quizAnswers.id,
				quizTitle: quizzes.title,
				quizSlug: quizzes.slug,
				creatorSlug: user.slug,
				creatorName: user.name,
				createdAt: quizAnswers.createdAt,
				totalCorrect: quizAnswers.totalCorrect,
				totalQuestions: quizAnswers.totalQuestions,
				score: quizAnswers.score
			})
			.from(quizAnswers)
			.innerJoin(quizzes, eq(quizAnswers.quizId, quizzes.id))
			.innerJoin(user, eq(quizzes.creatorId, user.id))
			.where(eq(quizAnswers.userId, locals.user.id))
			.orderBy(desc(quizAnswers.createdAt));

		quizSubmissions = regularSubmissions.map((s) => ({
			...s,
			type: 'quiz' as const,
			creatorSlug: s.creatorSlug || '',
			creatorName: s.creatorName || 'Unknown'
		}));
	}

	// Fetch user's speed run submissions
	const speedRunSubmissions: Array<{
		id: string;
		type: 'speedrun';
		quizTitle: string;
		quizSlug: string;
		creatorSlug: string;
		creatorName: string;
		createdAt: Date;
		correctCount: number;
		totalQuestions: number;
		totalTimeMs: number;
		streakMax: number;
		speedRunScore: number;
		globalRank: number;
	}> = [];

	if (submissionFilter === 'all' || submissionFilter === 'speedrun') {
		const speedRunsData = await db
			.select({
				id: speedRunResults.id,
				speedRunId: speedRunResults.speedRunId,
				quizTitle: quizzes.title,
				quizSlug: quizzes.slug,
				creatorSlug: user.slug,
				creatorName: user.name,
				createdAt: speedRunResults.createdAt,
				correctCount: speedRunResults.correctCount,
				totalQuestions: speedRunResults.totalQuestions,
				totalTimeMs: speedRunResults.totalTimeMs,
				streakMax: speedRunResults.streakMax,
				speedRunScore: speedRunResults.score
			})
			.from(speedRunResults)
			.innerJoin(speedRuns, eq(speedRunResults.speedRunId, speedRuns.id))
			.innerJoin(quizzes, eq(speedRuns.quizId, quizzes.id))
			.innerJoin(user, eq(quizzes.creatorId, user.id))
			.where(eq(speedRunResults.userId, locals.user.id))
			.orderBy(desc(speedRunResults.createdAt));

		// Calculate global rank for each speed run result
		for (const result of speedRunsData) {
			// Count how many results are ranked higher (better correct count, then faster time)
			const rankResult = await db
				.select({
					betterCount: count(sql`*`).as('betterCount')
				})
				.from(speedRunResults)
				.where(
					and(
						eq(speedRunResults.speedRunId, result.speedRunId),
						sql`${speedRunResults.correctCount} > ${result.correctCount} OR (${speedRunResults.correctCount} = ${result.correctCount} AND ${speedRunResults.totalTimeMs} < ${result.totalTimeMs})`
					)
				);

			const rank = (rankResult[0]?.betterCount ?? 0) + 1;

			speedRunSubmissions.push({
				id: result.id,
				type: 'speedrun' as const,
				quizTitle: result.quizTitle,
				quizSlug: result.quizSlug,
				creatorSlug: result.creatorSlug || '',
				creatorName: result.creatorName || 'Unknown',
				createdAt: result.createdAt,
				correctCount: result.correctCount,
				totalQuestions: result.totalQuestions,
				totalTimeMs: result.totalTimeMs,
				streakMax: result.streakMax,
				speedRunScore: result.speedRunScore,
				globalRank: rank
			});
		}
	}

	// Combine all submissions
	const allSubmissions = [...quizSubmissions, ...speedRunSubmissions];

	// Sort by createdAt desc (most recent first)
	allSubmissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

	// Get total count for pagination
	const totalCount = allSubmissions.length;
	const totalPages = Math.ceil(totalCount / SUBMISSIONS_PER_PAGE);

	// Apply pagination
	const offset = (page - 1) * SUBMISSIONS_PER_PAGE;
	const paginatedSubmissions = allSubmissions.slice(offset, offset + SUBMISSIONS_PER_PAGE);

	return {
		user: locals.user,
		profile: locals.user,
		quizzes: quizzesWithTags,
		submissions: paginatedSubmissions,
		submissionFilter,
		quizFilter,
		currentPage: page,
		totalPages,
		totalCount
	};
};
