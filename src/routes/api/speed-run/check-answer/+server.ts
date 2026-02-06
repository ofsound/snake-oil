import { error, json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { soundbites } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { SpeedRunCheckAnswerRequest, SpeedRunCheckAnswerResponse } from '$lib/speed-run/types';

/**
 * POST /api/speed-run/check-answer
 * Validates a single answer during a speed run
 * Returns whether the answer is correct and the correct answer text
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: SpeedRunCheckAnswerRequest = await request.json();
		const { soundbiteId, guess } = body;

		if (!soundbiteId || !guess) {
			return json(
				{ success: false, error: 'Missing soundbiteId or guess' } as SpeedRunCheckAnswerResponse,
				{ status: 400 }
			);
		}

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
			const config = soundbite.variantConfig as {
				options: { id: string; text: string; isCorrect: boolean }[];
			};
			const correctOption = config.options.find((opt) => opt.isCorrect);
			isCorrect = correctOption?.id === guess;
			correctAnswer = correctOption?.text || '';
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
