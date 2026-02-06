import { db } from '$lib/server/db';
import {
	quizzes,
	quizAnswers,
	soundbites,
	speedRuns,
	speedRunResults,
	user
} from '$lib/server/db/schema';
import type { AnswersPayload, VariantConfig, RankConfig } from '$lib/server/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { buildAnswerDetail, calculateScore } from '$lib/server/variant-utils';
import { calculateSpeedRunScore, calculateMaxStreak } from '$lib/speed-run/scoring';
import type { SpeedRunAnswer, SpeedRunLeaderboardEntry } from '$lib/speed-run/types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { owner, quiz_slug: quizSlug } = params;

	// First, find the owner by slug
	const ownerRecord = await db.query.user.findFirst({
		where: eq(user.slug, owner)
	});

	if (!ownerRecord) {
		error(404, 'User not found');
	}

	// Then find the quiz by ownerId + slug
	const quiz = await db.query.quizzes.findFirst({
		where: and(eq(quizzes.ownerId, ownerRecord.id), eq(quizzes.slug, quizSlug)),
		with: {
			owner: true,
			speedRun: true,
			soundbites: {
				with: {
					track: true
				},
				orderBy: asc(soundbites.position)
			}
		}
	});

	if (!quiz) {
		error(404, 'Quiz not found');
	}

	// Check visibility - only public quizzes or owner's quizzes
	const isOwner = locals.user?.id === quiz.ownerId;
	if (quiz.visibility !== 'public' && !isOwner) {
		error(403, 'This quiz is private');
	}

	// Transform soundbites for both regular quiz and speed-run modes
	const soundbiteItems = quiz.soundbites.map((soundbite) => {
		const config = soundbite.variantConfig;
		// For quiz taking, strip out isCorrect from options
		let safeConfig: VariantConfig;
		if (config.type === 'multiple_choice') {
			safeConfig = {
				type: 'multiple_choice',
				options: config.options.map((opt) => ({
					id: opt.id,
					text: opt.text,
					isCorrect: false // Don't reveal correct answer to client
				}))
			};
		} else if (config.type === 'multiple_response') {
			safeConfig = {
				type: 'multiple_response',
				options: config.options.map((opt) => ({
					id: opt.id,
					text: opt.text,
					isCorrect: false // Don't reveal correct answer to client
				}))
			};
		} else if (config.type === 'sequence') {
			safeConfig = {
				type: 'sequence',
				tracks: config.tracks,
				correctTrackIndex: -1, // Don't reveal correct track
				prompt: config.prompt
			};
		} else if (config.type === 'rank') {
			safeConfig = {
				type: 'rank',
				items: config.items,
				correctOrder: [], // Don't reveal correct order
				prompt: config.prompt
			};
		} else if (config.type === 'image_choice') {
			safeConfig = {
				type: 'image_choice',
				options: config.options.map((opt) => ({
					id: opt.id,
					imageUrl: opt.imageUrl,
					pathname: opt.pathname,
					label: opt.label,
					isCorrect: false // Don't reveal correct answer to client
				}))
			};
		} else {
			safeConfig = {
				type: 'simple_guess',
				correctAnswer: '' // Don't reveal correct answer
			};
		}

		return {
			id: soundbite.id,
			position: soundbite.position,
			trackUrl: soundbite.track.url,
			trackName: soundbite.track.name,
			question: soundbite.question,
			variantType: soundbite.variantType,
			variantConfig: safeConfig
		};
	});

	// Prepare speed-run questions if this is a speed run
	let speedRunQuestions = null;
	let leaderboard: SpeedRunLeaderboardEntry[] = [];

	if (quiz.speedRun) {
		// Only support multiple_choice for speed runs
		const supportedVariants = quiz.soundbites.filter((sb) => sb.variantType === 'multiple_choice');

		if (supportedVariants.length > 0) {
			speedRunQuestions = supportedVariants.map(
				(sb): import('$lib/speed-run/types').SpeedRunQuestion => {
					const config = sb.variantConfig as {
						type: 'multiple_choice';
						options: { id: string; text: string; isCorrect: boolean }[];
						questionTimeLimit?: number;
					};
					return {
						id: sb.id,
						position: sb.position,
						question: sb.question,
						variantType: 'multiple_choice',
						variantConfig: {
							type: 'multiple_choice',
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
				}
			);

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

			leaderboard = topResults.map((r) => ({
				id: r.id,
				displayName: r.displayName,
				correctCount: r.correctCount,
				totalTimeMs: r.totalTimeMs,
				streakMax: r.streakMax,
				score: r.score,
				createdAt: r.createdAt
			}));
		}
	}

	return {
		quiz: {
			id: quiz.id,
			title: quiz.title,
			slug: quiz.slug,
			description: quiz.description,
			createdAt: quiz.createdAt,
			visibility: quiz.visibility,
			speedRun: quiz.speedRun
				? {
						id: quiz.speedRun.id,
						defaultQuestionTimeLimit: quiz.speedRun.defaultQuestionTimeLimit,
						revealDelayMs: quiz.speedRun.revealDelayMs,
						audioLoopGapMs: quiz.speedRun.audioLoopGapMs,
						enableStreakBonus: quiz.speedRun.enableStreakBonus
					}
				: null,
			owner: {
				id: quiz.owner.id,
				name: quiz.owner.name,
				slug: quiz.owner.slug
			}
		},
		soundbites: soundbiteItems,
		speedRunQuestions,
		leaderboard,
		user: locals.user
			? { id: locals.user.id, name: locals.user.name, email: locals.user.email }
			: null
	};
};

export const actions: Actions = {
	// Regular quiz submission
	submitQuiz: async ({ request, locals, params }: RequestEvent) => {
		const { owner, quiz_slug: quizSlug } = params;

		const formData = await request.formData();
		const displayName = String(formData.get('displayName') ?? '').trim();
		const soundbiteIds = formData
			.getAll('soundbiteId')
			.map((value: FormDataEntryValue) => String(value));

		if (!locals.user && !displayName) {
			return fail(400, { message: 'Please enter a display name.' });
		}

		if (soundbiteIds.length === 0) {
			return fail(400, { message: 'No answers submitted.' });
		}

		// Find owner and quiz
		const ownerRecord = await db.query.user.findFirst({
			where: eq(user.slug, owner)
		});

		if (!ownerRecord) {
			return fail(404, { message: 'User not found' });
		}

		const quiz = await db.query.quizzes.findFirst({
			where: and(eq(quizzes.ownerId, ownerRecord.id), eq(quizzes.slug, quizSlug)),
			with: {
				soundbites: {
					orderBy: asc(soundbites.position)
				}
			}
		});

		if (!quiz) {
			return fail(404, { message: 'Quiz not found' });
		}

		// Build a map of soundbite id to config for easy lookup
		const soundbiteMap = new Map(quiz.soundbites.map((sb) => [sb.id, sb]));

		// Build answers payload with correctness checking
		const answersPayload: AnswersPayload = {};

		for (const soundbiteId of soundbiteIds) {
			const soundbite = soundbiteMap.get(soundbiteId);
			if (!soundbite) continue;

			let guess = '';
			let selectedOptionId: string | undefined;
			let selectedOptionIds: string[] | undefined;
			let selectedTrackIndex: number | undefined;
			let userOrder: number[] | undefined;

			if (soundbite.variantType === 'multiple_response') {
				const values = formData.getAll(`answer-${soundbiteId}`);
				selectedOptionIds = values
					.map((v: FormDataEntryValue) => String(v))
					.filter((v: string) => v.length > 0);
				guess = selectedOptionIds?.join(',') ?? '';
			} else if (soundbite.variantType === 'sequence') {
				const trackIndexStr = String(formData.get(`answer-${soundbiteId}`) ?? '').trim();
				selectedTrackIndex = trackIndexStr ? parseInt(trackIndexStr, 10) : -1;
				guess = trackIndexStr || '-1';
			} else if (soundbite.variantType === 'rank') {
				const orderStr = String(formData.get(`answer-${soundbiteId}`) ?? '').trim();
				try {
					userOrder = JSON.parse(orderStr);
					if (!Array.isArray(userOrder)) {
						userOrder = [];
					}
				} catch {
					userOrder = [];
				}
				guess = orderStr || '[]';
			} else {
				guess = String(formData.get(`answer-${soundbiteId}`) ?? '').trim();
				selectedOptionId =
					soundbite.variantType === 'multiple_choice' || soundbite.variantType === 'image_choice'
						? guess
						: undefined;
			}

			answersPayload[soundbiteId] = buildAnswerDetail(
				guess,
				soundbite.variantConfig,
				selectedOptionId,
				selectedOptionIds,
				selectedTrackIndex,
				userOrder
			);
		}

		// Calculate score
		const { score, totalCorrect, totalQuestions } = calculateScore(answersPayload);

		try {
			await db.insert(quizAnswers).values({
				quizId: quiz.id,
				userId: locals.user?.id ?? null,
				displayName: locals.user ? null : displayName,
				answers: answersPayload,
				score,
				totalCorrect,
				totalQuestions,
				completedAt: new Date()
			});

			return {
				success: true,
				results: {
					answers: answersPayload,
					score,
					totalCorrect,
					totalQuestions,
					correctAnswers: Object.fromEntries(
						quiz.soundbites.map((sb) => {
							if (sb.variantConfig.type === 'simple_guess') {
								return [sb.id, sb.variantConfig.correctAnswer];
							} else if (sb.variantConfig.type === 'multiple_choice') {
								return [sb.id, JSON.stringify(sb.variantConfig)];
							} else if (sb.variantConfig.type === 'multiple_response') {
								return [sb.id, JSON.stringify(sb.variantConfig)];
							} else if (sb.variantConfig.type === 'sequence') {
								const correctTrack = sb.variantConfig.tracks[sb.variantConfig.correctTrackIndex];
								return [sb.id, correctTrack?.name ?? ''];
							} else if (sb.variantConfig.type === 'rank') {
								const rankConfig = sb.variantConfig as RankConfig;
								return [sb.id, JSON.stringify(rankConfig)];
							} else if (sb.variantConfig.type === 'image_choice') {
								return [sb.id, JSON.stringify(sb.variantConfig)];
							}
							return [sb.id, ''];
						})
					)
				}
			};
		} catch (err) {
			console.error('[Quiz Submit Error]', err);
			if (err instanceof Error) {
				console.error('[Quiz Submit Error] Message:', err.message);
				console.error('[Quiz Submit Error] Stack:', err.stack);
			}
			return fail(500, { message: 'Failed to submit answers.' });
		}
	}
};
