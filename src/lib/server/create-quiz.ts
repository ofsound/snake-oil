import { fail } from '@sveltejs/kit';
import { processQuizSubmission } from './quiz-processor';
import type { CreateQuizInput, CreateQuizResult } from './quiz-processor';

export type { CreateQuizInput, CreateQuizResult };

/**
 * Creates a new quiz using the unified processor
 */
export async function createQuiz(input: CreateQuizInput): Promise<CreateQuizResult> {
	const { request, userId, blobToken } = input;
	const formData = await request.formData();

	const result = await processQuizSubmission({
		formData,
		userId,
		blobToken
		// No quizId = create mode
	});

	return result;
}

/**
 * Handles the result of createQuiz for SvelteKit actions
 */
export function handleCreateQuizResult(result: CreateQuizResult) {
	if (!result.success) {
		return fail(400, { message: result.error || 'An error occurred' });
	}
	return {
		success: true,
		quizId: result.quizId,
		slug: result.slug,
		speedRunSlug: result.speedRunSlug
	};
}
