import { db } from '$lib/server/db';
import {
	quizAnswers,
	quizzes,
	soundbites,
	speedRuns,
	speedRunResults
} from '$lib/server/db/schema';
import { error, redirect } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) {
		// Capture the current URL and pass it to login for redirect after authentication
		const returnUrl = url.pathname + url.search;
		redirect(302, `/login?redirect=${encodeURIComponent(returnUrl)}`);
	}

	const quiz = await db.query.quizzes.findFirst({
		where: and(eq(quizzes.slug, params.slug), eq(quizzes.ownerId, locals.user.id)),
		with: {
			soundbites: {
				with: {
					track: true
				},
				orderBy: asc(soundbites.position)
			},
			quizAnswers: {
				with: {
					user: true
				},
				orderBy: asc(quizAnswers.createdAt)
			},
			speedRun: {
				with: {
					results: {
						with: {
							user: true
						},
						orderBy: asc(speedRunResults.createdAt)
					}
				}
			}
		}
	});

	if (!quiz) {
		error(404, 'Quiz not found');
	}

	// Transform relational data to match frontend expectations
	const soundbiteItems = quiz.soundbites.map((soundbite) => ({
		id: soundbite.id,
		position: soundbite.position,
		trackUrl: soundbite.track.url,
		trackName: soundbite.track.name,
		question: soundbite.question,
		variantType: soundbite.variantType,
		variantConfig: soundbite.variantConfig
	}));

	const answerRows = quiz.quizAnswers.map((answer) => ({
		id: answer.id,
		createdAt: answer.createdAt,
		answers: answer.answers,
		score: answer.score,
		totalCorrect: answer.totalCorrect,
		totalQuestions: answer.totalQuestions,
		displayName: answer.displayName,
		userName: answer.user?.name ?? null,
		userEmail: answer.user?.email ?? null
	}));

	const speedRunResultsRows =
		quiz.speedRun?.results.map((result) => ({
			id: result.id,
			createdAt: result.createdAt,
			displayName: result.displayName,
			userName: result.user?.name ?? null,
			userEmail: result.user?.email ?? null,
			totalQuestions: result.totalQuestions,
			correctCount: result.correctCount,
			totalTimeMs: result.totalTimeMs,
			streakMax: result.streakMax,
			score: result.score,
			answers: result.answers
		})) ?? [];

	return {
		quiz: {
			id: quiz.id,
			title: quiz.title,
			slug: quiz.slug,
			description: quiz.description,
			visibility: quiz.visibility,
			createdAt: quiz.createdAt
		},
		soundbites: soundbiteItems,
		answers: answerRows,
		speedRunResults: speedRunResultsRows,
		hasSpeedRun: !!quiz.speedRun
	};
};
