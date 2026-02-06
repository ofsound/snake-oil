import { db } from '$lib/server/db';
import { quizzes, quizAnswers, soundbites } from '$lib/server/db/schema';
import type { AnswersPayload, VariantConfig, RankConfig } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { buildAnswerDetail, calculateScore } from '$lib/server/variant-utils';

export const load: PageServerLoad = async ({ params, locals }) => {
	const quiz = await db.query.quizzes.findFirst({
		where: eq(quizzes.slug, params.slug),
		with: {
			owner: true,
			speedRun: {
				columns: {
					id: true
				}
			},
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

	// Transform relational data to match frontend expectations
	// For multiple_choice and multiple_response, we only send the options (not which is correct) for quiz taking
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
			// For sequence, don't reveal the correct track index
			safeConfig = {
				type: 'sequence',
				tracks: config.tracks,
				correctTrackIndex: -1, // Don't reveal correct track
				prompt: config.prompt
			};
		} else if (config.type === 'rank') {
			// For rank, don't reveal the correct order
			safeConfig = {
				type: 'rank',
				items: config.items,
				correctOrder: [], // Don't reveal correct order
				prompt: config.prompt
			};
		} else if (config.type === 'image_choice') {
			// For image_choice, strip out isCorrect from options
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
			// For simple_guess, don't send the correct answer to the client
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

	return {
		quiz: {
			id: quiz.id,
			title: quiz.title,
			slug: quiz.slug,
			description: quiz.description,
			createdAt: quiz.createdAt,
			hasSpeedRun: !!quiz.speedRun,
			owner: {
				id: quiz.owner.id,
				name: quiz.owner.name,
				slug: quiz.owner.slug
			}
		},
		soundbites: soundbiteItems,
		user: locals.user
			? { id: locals.user.id, name: locals.user.name, email: locals.user.email }
			: null
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }: RequestEvent) => {
		const formData = await request.formData();
		const displayName = String(formData.get('displayName') ?? '').trim();
		const soundbiteIds = formData.getAll('soundbiteId').map((value) => String(value));

		if (!locals.user && !displayName) {
			return fail(400, { message: 'Please enter a display name.' });
		}

		if (soundbiteIds.length === 0) {
			return fail(400, { message: 'No answers submitted.' });
		}

		// Fetch the quiz with full soundbite data for scoring
		const quiz = await db.query.quizzes.findFirst({
			where: eq(quizzes.slug, params.slug),
			with: {
				soundbites: {
					orderBy: asc(soundbites.position)
				}
			}
		});

		if (!quiz) {
			error(404, 'Quiz not found');
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
				// For multiple response, get all selected option IDs
				const values = formData.getAll(`answer-${soundbiteId}`);
				selectedOptionIds = values.map((v) => String(v)).filter((v) => v.length > 0);
				guess = selectedOptionIds.join(','); // Store as comma-separated for reference
			} else if (soundbite.variantType === 'sequence') {
				// For sequence, the answer is the track index
				const trackIndexStr = String(formData.get(`answer-${soundbiteId}`) ?? '').trim();
				selectedTrackIndex = trackIndexStr ? parseInt(trackIndexStr, 10) : -1;
				guess = trackIndexStr || '-1';
			} else if (soundbite.variantType === 'rank') {
				// For rank, the answer is a JSON array of item indices
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
				// For multiple choice and image choice, the guess is the option ID
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

			// Return the results to display
			return {
				success: true,
				results: {
					answers: answersPayload,
					score,
					totalCorrect,
					totalQuestions,
					// Include correct answers for display
					correctAnswers: Object.fromEntries(
						quiz.soundbites.map((sb) => {
							if (sb.variantConfig.type === 'simple_guess') {
								return [sb.id, sb.variantConfig.correctAnswer];
							} else if (sb.variantConfig.type === 'multiple_choice') {
								// Return the full multiple choice config with correct answer marked
								return [sb.id, JSON.stringify(sb.variantConfig)];
							} else if (sb.variantConfig.type === 'multiple_response') {
								// Return the full multiple response config with correct answers marked
								return [sb.id, JSON.stringify(sb.variantConfig)];
							} else if (sb.variantConfig.type === 'sequence') {
								const correctTrack = sb.variantConfig.tracks[sb.variantConfig.correctTrackIndex];
								return [sb.id, correctTrack?.name ?? ''];
							} else if (sb.variantConfig.type === 'rank') {
								// Return the full rank config with correct order for display
								const rankConfig = sb.variantConfig as RankConfig;
								return [sb.id, JSON.stringify(rankConfig)];
							} else if (sb.variantConfig.type === 'image_choice') {
								// Return the full image choice config with correct answer marked
								return [sb.id, JSON.stringify(sb.variantConfig)];
							}
							return [sb.id, ''];
						})
					)
				}
			};
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Failed to submit answers.' });
		}
	}
};
