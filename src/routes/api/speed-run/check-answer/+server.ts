import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { soundbites } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { checkMultipleChoiceCorrect } from '$lib/server/variant-utils';
import { SpeedRunCheckAnswerRequestSchema } from '$lib/speed-run/types';
import type { SpeedRunCheckAnswerResponse } from '$lib/speed-run/types';
import type { MultipleChoiceConfig } from '$lib/variant-types';

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
			return json(
				{
					success: false,
					error: `Invalid request: ${errorMessage}`
				} as SpeedRunCheckAnswerResponse,
				{
					status: 400
				}
			);
		}

		const { soundbiteId, guess } = parseResult.data;

		// Get the soundbite with correct answer
		const soundbite = await db.query.soundbites.findFirst({
			where: eq(soundbites.id, soundbiteId)
		});

		if (!soundbite) {
			return json({ success: false, error: 'Soundbite not found' } as SpeedRunCheckAnswerResponse, {
				status: 404
			});
		}

		let isCorrect = false;
		let correctAnswer = '';

		if (soundbite.variantType === 'multiple_choice') {
			const config = soundbite.variantConfig as MultipleChoiceConfig;
			isCorrect = checkMultipleChoiceCorrect(guess, config);
			const correctOption = config.options.find((opt) => opt.isCorrect);
			correctAnswer = correctOption?.text ?? '';
		}

		const response: SpeedRunCheckAnswerResponse = {
			success: true,
			isCorrect,
			correctAnswer
		};

		return json(response);
	} catch (err) {
		console.error('[API Check Answer Error]', err);
		return json({ success: false, error: 'Internal server error' } as SpeedRunCheckAnswerResponse, {
			status: 500
		});
	}
};
