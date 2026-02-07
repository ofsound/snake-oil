import { json, type RequestHandler } from '@sveltejs/kit';

import { eq } from 'drizzle-orm';

import {
	isMultipleChoiceConfig,
	isSimpleGuessConfig,
	isImageChoiceConfig
} from '$lib/variant-types';
import {
	SpeedRunCheckAnswerRequestSchema,
	type SpeedRunCheckAnswerResponse
} from '$lib/speed-run/types';

import { db } from '$lib/server/db';
import { soundbites } from '$lib/server/db/schema';
import {
	checkMultipleChoiceCorrect,
	checkSimpleGuessCorrect,
	checkImageChoiceCorrect
} from '$lib/server/variant-utils';

/**
 * POST /api/speed-run/check-answer
 * Validates a single answer during a speed run
 * Returns whether the answer is correct and the correct answer text
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		// Parse and validate request body with Zod
		const rawBody = await request.json();
		const parseResult = SpeedRunCheckAnswerRequestSchema.safeParse(rawBody);

		if (!parseResult.success) {
			const errorMessage = parseResult.error.issues.map((issue) => issue.message).join(', ');
			const errorResponse: SpeedRunCheckAnswerResponse = {
				success: false,
				error: `Invalid request: ${errorMessage}`
			};
			return json(errorResponse, { status: 400 });
		}

		const { soundbiteId, guess } = parseResult.data;

		// Get the soundbite with correct answer
		const soundbite = await db.query.soundbites.findFirst({
			where: eq(soundbites.id, soundbiteId)
		});

		if (!soundbite) {
			const notFoundResponse: SpeedRunCheckAnswerResponse = {
				success: false,
				error: 'Soundbite not found'
			};
			return json(notFoundResponse, { status: 404 });
		}

		let isCorrect = false;
		let correctAnswer = '';

		if (
			soundbite.variantType === 'multiple_choice' &&
			isMultipleChoiceConfig(soundbite.variantConfig)
		) {
			isCorrect = checkMultipleChoiceCorrect(guess, soundbite.variantConfig);
			const correctOption = soundbite.variantConfig.options.find((opt) => opt.isCorrect);
			correctAnswer = correctOption?.text ?? '';
		} else if (
			soundbite.variantType === 'simple_guess' &&
			isSimpleGuessConfig(soundbite.variantConfig)
		) {
			isCorrect = checkSimpleGuessCorrect(guess, soundbite.variantConfig.correctAnswers);
			// Return the first correct answer for display purposes
			correctAnswer = soundbite.variantConfig.correctAnswers[0] ?? '';
		} else if (
			soundbite.variantType === 'image_choice' &&
			isImageChoiceConfig(soundbite.variantConfig)
		) {
			isCorrect = checkImageChoiceCorrect(guess, soundbite.variantConfig);
			const correctOption = soundbite.variantConfig.options.find((opt) => opt.isCorrect);
			correctAnswer = correctOption?.label ?? '';
		}

		const response: SpeedRunCheckAnswerResponse = {
			success: true,
			isCorrect,
			correctAnswer
		};

		return json(response);
	} catch (err) {
		console.error('[API Check Answer Error]', err);
		const errorResponse: SpeedRunCheckAnswerResponse = {
			success: false,
			error: 'Internal server error'
		};
		return json(errorResponse, { status: 500 });
	}
};
