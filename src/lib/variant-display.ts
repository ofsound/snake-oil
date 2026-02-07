/**
 * Variant display utilities - shared between client and server
 * Pure functions for formatting and displaying variant-related data
 */

import type { VariantConfig } from './variant-types';

/**
 * Get the correct answer text for display
 */
export function getCorrectAnswerText(config: VariantConfig): string {
	switch (config.type) {
		case 'simple_guess':
			return config.correctAnswers.join(', ');
		case 'multiple_choice': {
			const correctOption = config.options.find((opt) => opt.isCorrect);
			return correctOption?.text ?? '';
		}
		case 'multiple_response': {
			const correctOptions = config.options.filter((opt) => opt.isCorrect);
			return correctOptions.map((opt) => opt.text).join(', ');
		}
		case 'sequence': {
			const correctTrack = config.tracks[config.correctTrackIndex];
			return correctTrack?.name ?? '';
		}
		case 'rank': {
			// Return the ranked item names in correct order
			return config.correctOrder
				.map((idx) => config.items[idx]?.name ?? '')
				.filter((name) => name.length > 0)
				.join(' → ');
		}
		case 'image_choice': {
			const correctOption = config.options.find((opt) => opt.isCorrect);
			return correctOption?.label ?? '';
		}
		default:
			return '';
	}
}

/**
 * Calculate Kendall Tau distance between two permutations
 * Returns normalized score (0-1) where 1 = perfect match, 0 = completely reversed
 * Based on counting discordant pairs (inversions)
 */
export function calculateKendallTauScore(userOrder: number[], correctOrder: number[]): number {
	if (userOrder.length !== correctOrder.length) return 0;
	if (userOrder.length === 0) return 0;

	// Create position maps: for each item index, what position is it in?
	const userPos = new Map<number, number>();
	const correctPos = new Map<number, number>();

	userOrder.forEach((itemIdx, pos) => userPos.set(itemIdx, pos));
	correctOrder.forEach((itemIdx, pos) => correctPos.set(itemIdx, pos));

	// Count discordant pairs
	let discordant = 0;
	const n = userOrder.length;

	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const item1 = userOrder[i];
			const item2 = userOrder[j];

			const userDiff = userPos.get(item1)! - userPos.get(item2)!;
			const correctDiff = correctPos.get(item1)! - correctPos.get(item2)!;

			// If signs differ, they're discordant (inverted relative to correct order)
			if (userDiff * correctDiff < 0) {
				discordant++;
			}
		}
	}

	const maxPairs = (n * (n - 1)) / 2;
	return maxPairs > 0 ? 1 - discordant / maxPairs : 1;
}

/**
 * Calculate Kendall Tau score as a percentage (0-100)
 * Convenience wrapper around calculateKendallTauScore
 */
export function calculateKendallTauPercentage(userOrder: number[], correctOrder: number[]): number {
	const score = calculateKendallTauScore(userOrder, correctOrder);
	return Math.round(score * 100);
}
