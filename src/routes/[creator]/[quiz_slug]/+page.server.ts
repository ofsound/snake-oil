import { error, fail } from '@sveltejs/kit';

import { and, asc, desc, eq } from 'drizzle-orm';

import type { SpeedRunLeaderboardEntry } from '$lib/speed-run/types';

import { db } from '$lib/server/db';
import {
	quizzes,
	quizAnswers,
	soundbites,
	speedRunResults,
	user,
	quizTags,
	tags,
	type AnswersPayload,
	type VariantConfig
} from '$lib/server/db/schema';
import { buildAnswerDetail, calculateScore } from '$lib/server/variant-utils';
import { getNextQuiz } from '$lib/server/next-quiz';

import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { creator, quiz_slug: quizSlug } = params;

	// First, find the creator by slug
	const creatorRecord = await db.query.user.findFirst({
		where: eq(user.slug, creator)
	});

	if (!creatorRecord) {
		error(404, 'User not found');
	}

	// Then find the quiz by creatorId + slug
	const quiz = await db.query.quizzes.findFirst({
		where: and(eq(quizzes.creatorId, creatorRecord.id), eq(quizzes.slug, quizSlug)),
		with: {
			creator: true,
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

	// Check visibility - only public quizzes or creator's quizzes
	const isCreator = locals.user?.id === quiz.creatorId;
	if (quiz.visibility !== 'public' && !isCreator) {
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
				correctTrackIndex: -1 // Don't reveal correct track
			};
		} else if (config.type === 'rank') {
			safeConfig = {
				type: 'rank',
				items: config.items,
				correctOrder: [] // Don't reveal correct order
			};
		} else if (config.type === 'multiple_match') {
			safeConfig = {
				type: 'multiple_match',
				items: config.items.map((item) => ({
					id: item.id,
					name: item.name,
					url: item.url,
					answerLabel: item.answerLabel // Labels must be visible for matching
				}))
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
				correctAnswers: [] // Don't reveal correct answers
			};
		}

		return {
			id: soundbite.id,
			position: soundbite.position,
			trackUrl: soundbite.track.url,
			trackName: soundbite.track.name,
			prompt: soundbite.prompt,
			variantType: soundbite.variantType,
			variantConfig: safeConfig
		};
	});

	// Prepare speed-run questions if this is a speed run
	let speedRunQuestions = null;
	let leaderboard: SpeedRunLeaderboardEntry[] = [];

	if (quiz.speedRun) {
		// Support multiple_choice, simple_guess, and image_choice for speed runs
		const supportedVariants = quiz.soundbites.filter(
			(sb) =>
				sb.variantType === 'multiple_choice' ||
				sb.variantType === 'simple_guess' ||
				sb.variantType === 'image_choice'
		);

		if (supportedVariants.length > 0) {
			speedRunQuestions = supportedVariants.map((sb) => {
				const baseQuestion = {
					id: sb.id,
					position: sb.position,
					prompt: sb.prompt,
					track: {
						id: sb.track.id,
						name: sb.track.name,
						url: sb.track.url
					}
				};

				if (sb.variantType === 'multiple_choice') {
					const config = sb.variantConfig as {
						type: 'multiple_choice';
						options: { id: string; text: string; isCorrect: boolean }[];
						questionTimeLimit?: number;
					};
					return {
						...baseQuestion,
						variantType: 'multiple_choice' as const,
						variantConfig: {
							type: 'multiple_choice' as const,
							options: config.options.map((opt) => ({
								id: opt.id,
								text: opt.text,
								isCorrect: false as const // Hide correct answer
							})),
							questionTimeLimit: config.questionTimeLimit
						}
					};
				} else if (sb.variantType === 'simple_guess') {
					// simple_guess
					const config = sb.variantConfig as { type: 'simple_guess'; questionTimeLimit?: number };
					return {
						...baseQuestion,
						variantType: 'simple_guess' as const,
						variantConfig: {
							type: 'simple_guess' as const,
							questionTimeLimit: config.questionTimeLimit
						}
					};
				} else {
					// image_choice
					const config = sb.variantConfig as {
						type: 'image_choice';
						options: { id: string; imageUrl: string; label: string; isCorrect: boolean }[];
						questionTimeLimit?: number;
					};
					return {
						...baseQuestion,
						variantType: 'image_choice' as const,
						variantConfig: {
							type: 'image_choice' as const,
							options: config.options.map((opt) => ({
								id: opt.id,
								imageUrl: opt.imageUrl,
								label: opt.label,
								isCorrect: false as const // Hide correct answer
							})),
							questionTimeLimit: config.questionTimeLimit
						}
					};
				}
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

	// Fetch quiz tags
	const quizTagsData = await db
		.select({
			id: tags.id,
			label: tags.label,
			slug: tags.slug
		})
		.from(quizTags)
		.innerJoin(tags, eq(quizTags.tagId, tags.id))
		.where(eq(quizTags.quizId, quiz.id));

	// Fetch next quizzes for "Play Next" feature
	const nextRegularQuiz = await getNextQuiz(db, {
		creatorId: quiz.creatorId,
		currentQuizId: quiz.id,
		userId: locals.user?.id,
		mode: 'regular'
	});

	const nextSpeedRunQuiz = await getNextQuiz(db, {
		creatorId: quiz.creatorId,
		currentQuizId: quiz.id,
		userId: locals.user?.id,
		mode: 'speedrun'
	});

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
			creator: {
				id: quiz.creator.id,
				name: quiz.creator.name,
				slug: quiz.creator.slug
			}
		},
		soundbites: soundbiteItems,
		speedRunQuestions,
		leaderboard,
		tags: quizTagsData,
		nextRegularQuiz,
		nextSpeedRunQuiz,
		user: locals.user
			? { id: locals.user.id, name: locals.user.name, email: locals.user.email }
			: null
	};
};

export const actions: Actions = {
	// Regular quiz submission
	submitQuiz: async ({ request, locals, params }: RequestEvent) => {
		const { creator, quiz_slug: quizSlug } = params;

		const formData = await request.formData();
		const displayName = String(formData.get('displayName') ?? '').trim();
		const soundbiteIds = formData
			.getAll('soundbiteId')
			.map((value: FormDataEntryValue) => String(value));

		if (soundbiteIds.length === 0) {
			return fail(400, { message: 'No answers submitted.' });
		}

		// Find creator and quiz
		const creatorRecord = await db.query.user.findFirst({
			where: eq(user.slug, creator)
		});

		if (!creatorRecord) {
			return fail(404, { message: 'User not found' });
		}

		const quiz = await db.query.quizzes.findFirst({
			where: and(eq(quizzes.creatorId, creatorRecord.id), eq(quizzes.slug, quizSlug)),
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
			} else if (soundbite.variantType === 'multiple_match') {
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
								return [sb.id, sb.variantConfig.correctAnswers.join(', ')];
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
