import { error, redirect } from '@sveltejs/kit';

import { and, asc, eq } from 'drizzle-orm';

import { getLoginUrl } from '$lib/constants/routes';

import { db } from '$lib/server/db';
import { quizAnswers, quizzes, soundbites, speedRunResults, user } from '$lib/server/db/schema';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) {
		const returnUrl = url.pathname + url.search;
		redirect(302, getLoginUrl(returnUrl));
	}

	const { creator, quiz_slug: quizSlug } = params;

	// Find creator
	const creatorRecord = await db.query.user.findFirst({
		where: eq(user.slug, creator)
	});

	if (!creatorRecord) {
		error(404, 'User not found');
	}

	// Only allow viewing submissions if current user is the creator
	if (creatorRecord.id !== locals.user.id) {
		error(403, 'You can only view submissions for your own quizzes');
	}

	const quiz = await db.query.quizzes.findFirst({
		where: and(eq(quizzes.creatorId, creatorRecord.id), eq(quizzes.slug, quizSlug)),
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

	const soundbiteItems = quiz.soundbites.map((soundbite) => ({
		id: soundbite.id,
		position: soundbite.position,
		trackUrl: soundbite.track.url,
		trackName: soundbite.track.name,
		prompt: soundbite.prompt,
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
			createdAt: quiz.createdAt,
			creator: {
				id: creatorRecord.id,
				name: creatorRecord.name,
				slug: creatorRecord.slug
			}
		},
		soundbites: soundbiteItems,
		answers: answerRows,
		speedRunResults: speedRunResultsRows,
		hasSpeedRun: !!quiz.speedRun
	};
};
