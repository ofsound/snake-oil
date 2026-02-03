/**
 * Fisher-Yates shuffle algorithm
 * Returns a new shuffled array, does not mutate the original
 */
export function shuffleOptions<T>(options: T[]): T[] {
	const shuffled = [...options];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

/**
 * Generate a unique ID for multiple choice options
 * Uses a simple random string approach
 */
export function generateOptionId(): string {
	return Math.random().toString(36).substring(2, 11);
}

/**
 * Create an empty multiple choice option
 */
export function createEmptyOption(): { id: string; text: string; isCorrect: boolean } {
	return {
		id: generateOptionId(),
		text: '',
		isCorrect: false
	};
}

import type { VariantConfig } from '$lib/variant-types';

/**
 * Get the correct answer text for display
 * This is a client-safe version that works with variant configs
 */
export function getCorrectAnswerText(config: VariantConfig): string {
	if (config.type === 'simple_guess') {
		return config.correctAnswer;
	} else if (config.type === 'multiple_choice') {
		const correctOption = config.options.find((opt) => opt.isCorrect);
		return correctOption?.text ?? '';
	}
	return '';
}
