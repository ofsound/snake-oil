import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { quizzes, speedRuns, speedRunResults, soundbites, tracks } from '$lib/server/db/schema';
import { eq, asc, desc } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import { calculateSpeedRunScore, calculateMaxStreak } from '$lib/speed-run/scoring';
import type { SpeedRunAnswer, SpeedRunLeaderboardEntry } from '$lib/speed-run/types';
import { validateSubmission } from '$lib/speed-run/scoring';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { slug } = params;

	// Fetch the quiz with speed run configuration
	const quiz = await db.query.quizzes.findFirst({
		where: eq(quizzes.slug, slug),
		with: {
			soundbites: {
				orderBy: asc(soundbites.position),
				with: {
					track: true
				}
			},
			speedRun: true
		}
	});

	if (!quiz) {
		error(404, 'Quiz not found');
	}

	// Check if this quiz has a speed run configuration
	if (!quiz.speedRun) {
		error(404, 'This quiz is not configured as a speed run');
	}

	// Only support multiple_choice for now
	const supportedVariants = quiz.soundbites.filter((sb) => sb.variantType === 'multiple_choice');

	if (supportedVariants.length === 0) {
		error(400, 'This speed run has no supported question types');
	}

	// Sanitize questions for client (remove correct answers)
	const questions = supportedVariants.map((sb) => {
		const config = sb.variantConfig as {
			type: 'multiple_choice';
			options: { id: string; text: string; isCorrect: boolean }[];
			questionTimeLimit?: number;
		};
		return {
			id: sb.id,
			position: sb.position,
			question: sb.question,
			variantType: sb.variantType,
			variantConfig: {
				type: config.type,
				options: config.options.map((opt) => ({
					id: opt.id,
					text: opt.text,
					isCorrect: false // Hide correct answer
				})),
				questionTimeLimit: config.questionTimeLimit
			},
			track: {
				id: sb.track.id,
				name: sb.track.name,
				url: sb.track.url
			}
		};
	});

	// Fetch top 10 leaderboard entries
	const topResults = await db.query.speedRunResults.findMany({
		where: eq(speedRunResults.speedRunId, quiz.speedRun.id),
		orderBy: [
			desc(speedRunResults.correctCount),
			asc(speedRunResults.totalTimeMs),
			asc(speedRunResults.createdAt)
		],
		limit: 10
	});

	const leaderboard: SpeedRunLeaderboardEntry[] = topResults.map((r) => ({
		id: r.id,
		displayName: r.displayName,
		correctCount: r.correctCount,
		totalTimeMs: r.totalTimeMs,
		streakMax: r.streakMax,
		score: r.score,
		createdAt: r.createdAt
	}));

	return {
		quiz: {
			id: quiz.id,
			title: quiz.title,
			slug: quiz.slug,
			description: quiz.description
		},
		speedRun: {
			id: quiz.speedRun.id,
			defaultQuestionTimeLimit: quiz.speedRun.defaultQuestionTimeLimit,
			revealDelayMs: quiz.speedRun.revealDelayMs,
			audioLoopGapMs: quiz.speedRun.audioLoopGapMs,
			enableStreakBonus: quiz.speedRun.enableStreakBonus
		},
		questions,
		leaderboard,
		user: locals.user
	};
};

export const actions: Actions = {
	checkAnswer: async ({ request }) => {
		const formData = await request.formData();
		const soundbiteId = String(formData.get('soundbiteId'));
		const guess = String(formData.get('guess'));

		console.log('[checkAnswer] Received:', { soundbiteId, guess });

		if (!soundbiteId || !guess) {
			return fail(400, { error: 'Missing soundbiteId or guess' });
		}

		// Get the soundbite with correct answer
		const soundbite = await db.query.soundbites.findFirst({
			where: eq(soundbites.id, soundbiteId)
		});

		if (!soundbite) {
			return fail(404, { error: 'Soundbite not found' });
		}

		console.log('[checkAnswer] Soundbite found:', soundbite.variantType);

		let isCorrect = false;
		let correctAnswer = '';

		if (soundbite.variantType === 'multiple_choice') {
			const config = soundbite.variantConfig as {
				options: { id: string; text: string; isCorrect: boolean }[];
			};
			console.log('[checkAnswer] All options:', JSON.stringify(config.options));
			const correctOption = config.options.find((opt) => opt.isCorrect);
			console.log('[checkAnswer] Options count:', config.options.length);
			console.log('[checkAnswer] Correct option:', JSON.stringify(correctOption));
			console.log('[checkAnswer] Correct option text:', correctOption?.text);
			console.log('[checkAnswer] Comparing:', {
				guess,
				correctId: correctOption?.id,
				match: correctOption?.id === guess
			});
			isCorrect = correctOption?.id === guess;
			correctAnswer = correctOption?.text || '';
			console.log('[checkAnswer] correctAnswer set to:', correctAnswer);
		}

		console.log('[checkAnswer] Result:', {
			isCorrect,
			correctAnswer,
			correctAnswerType: typeof correctAnswer
		});

		return {
			success: true,
			isCorrect,
			correctAnswer
		};
	},

	submit: async ({ request, locals }) => {
		const formData = await request.formData();

		const speedRunId = String(formData.get('speedRunId'));
		const answersJson = String(formData.get('answers'));
		const startTime = Number(formData.get('startTime'));
		const endTime = Number(formData.get('endTime'));
		const displayName = String(formData.get('displayName'));

		let answers: SpeedRunAnswer[];
		try {
			answers = JSON.parse(answersJson) as SpeedRunAnswer[];
		} catch {
			return fail(400, { error: 'Invalid answers format' });
		}

		// Validate speed run exists
		const speedRun = await db.query.speedRuns.findFirst({
			where: eq(speedRuns.id, speedRunId),
			with: {
				quiz: {
					with: {
						soundbites: {
							orderBy: asc(soundbites.position)
						}
					}
				}
			}
		});

		if (!speedRun) {
			return fail(404, { error: 'Speed run not found' });
		}

		// Validate all answers against correct answers
		const soundbitesMap = new Map(speedRun.quiz.soundbites.map((sb) => [sb.id, sb]));

		console.log('[SpeedRun Submit] Received answers:', JSON.stringify(answers, null, 2));
		console.log('[SpeedRun Submit] Soundbites count:', soundbitesMap.size);

		const validatedAnswers: SpeedRunAnswer[] = answers.map((answer) => {
			const soundbite = soundbitesMap.get(answer.soundbiteId);
			if (!soundbite) {
				console.log('[SpeedRun Submit] Soundbite not found for:', answer.soundbiteId);
				return { ...answer, isCorrect: false };
			}

			// Check answer correctness based on variant type
			let isCorrect = false;
			if (soundbite.variantType === 'multiple_choice') {
				const config = soundbite.variantConfig as { options: { id: string; isCorrect: boolean }[] };
				const correctOption = config.options.find((opt) => opt.isCorrect);
				isCorrect = correctOption?.id === answer.guess;
				console.log('[SpeedRun Submit] Validating answer:', {
					soundbiteId: answer.soundbiteId,
					guess: answer.guess,
					guessType: typeof answer.guess,
					correctOptionId: correctOption?.id,
					correctOptionIdType: typeof correctOption?.id,
					match: correctOption?.id === answer.guess,
					isCorrect
				});
			}

			return {
				...answer,
				isCorrect,
				variantType: soundbite.variantType,
				selectedOptionId: answer.guess
			};
		});

		const totalQuestions = validatedAnswers.length;
		const correctCount = validatedAnswers.filter((a) => a.isCorrect).length;
		const totalTimeMs = endTime - startTime;
		const streakMax = calculateMaxStreak(validatedAnswers);
		const score = calculateSpeedRunScore(correctCount, totalTimeMs);

		console.log('[SpeedRun Submit] Calculated stats:', {
			totalQuestions,
			correctCount,
			totalTimeMs,
			streakMax,
			score
		});

		// Insert result
		const result = await db
			.insert(speedRunResults)
			.values({
				speedRunId,
				userId: locals.user?.id ?? null,
				displayName: displayName || locals.user?.name || 'Anonymous',
				answers: validatedAnswers,
				totalQuestions,
				correctCount,
				totalTimeMs,
				streakMax,
				score,
				createdAt: new Date()
			})
			.returning();

		// Get user's rank
		const allResults = await db.query.speedRunResults.findMany({
			where: eq(speedRunResults.speedRunId, speedRunId),
			orderBy: [
				desc(speedRunResults.correctCount),
				asc(speedRunResults.totalTimeMs),
				asc(speedRunResults.createdAt)
			]
		});

		const rank = allResults.findIndex((r) => r.id === result[0].id) + 1;

		// Get updated top 10
		const top10 = allResults.slice(0, 10).map((r) => ({
			id: r.id,
			displayName: r.displayName,
			correctCount: r.correctCount,
			totalTimeMs: r.totalTimeMs,
			streakMax: r.streakMax,
			score: r.score,
			createdAt: r.createdAt,
			isCurrentUser: r.id === result[0].id
		}));

		const responseData = {
			success: true,
			result: result[0],
			rank,
			top10
		};

		console.log('[SpeedRun Submit] Returning:', JSON.stringify(responseData, null, 2));

		return responseData;
	}
};
