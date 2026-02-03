import { db } from '$lib/server/db';
import { quizzes, quizAnswers, soundbites } from '$lib/server/db/schema';
import type { AnswersPayload, VariantConfig } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { buildAnswerDetail, calculateScore } from '$lib/server/variant-utils';

export const load: PageServerLoad = async ({ params, locals }) => {
	const quiz = await db.query.quizzes.findFirst({
		where: eq(quizzes.slug, params.slug),
		with: {
			owner: true,
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
	// For multiple_choice, we only send the options (not which is correct) for quiz taking
	const soundbiteItems = quiz.soundbites.map((soundbite) => {
		const config = soundbite.variantConfig;
		// For quiz taking, strip out isCorrect from multiple choice options
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

			const guess = String(formData.get(`answer-${soundbiteId}`) ?? '').trim();

			// For multiple choice, the guess is the option ID
			const selectedOptionId =
				soundbite.variantType === 'multiple_choice' ? guess : undefined;

			answersPayload[soundbiteId] = buildAnswerDetail(
				guess,
				soundbite.variantConfig,
				selectedOptionId
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
								const correctOption = sb.variantConfig.options.find((opt) => opt.isCorrect);
								return [sb.id, correctOption?.text ?? ''];
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
