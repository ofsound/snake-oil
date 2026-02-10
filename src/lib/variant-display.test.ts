import { describe, it, expect } from 'vitest';
import {
	calculateKendallTauScore,
	calculateMultipleMatchScore,
	getCorrectAnswerText
} from './variant-display';
import type { VariantConfig } from './variant-types';

/**
 * KENDALL TAU SCORE
 *
 * This calculates how similar two rankings are. Used for "Rank these items in order"
 * questions. It counts discordant pairs (inversions) - items that are in different
 * relative order between the two rankings.
 *
 * Why test this? It's a complex statistical algorithm. A bug here gives users wrong scores.
 */
describe('calculateKendallTauScore', () => {
	it('returns 0 for empty arrays', () => {
		expect(calculateKendallTauScore([], [])).toBe(0);
	});

	it('returns 0 when arrays have different lengths', () => {
		expect(calculateKendallTauScore([0, 1], [0, 1, 2])).toBe(0);
	});

	it('returns 1 for perfect match', () => {
		expect(calculateKendallTauScore([0, 1, 2, 3], [0, 1, 2, 3])).toBe(1);
	});

	it('returns 0 for completely reversed', () => {
		expect(calculateKendallTauScore([3, 2, 1, 0], [0, 1, 2, 3])).toBe(0);
	});

	it('returns correct score for partial match', () => {
		// [0, 2, 1, 3] has one inversion (2 before 1) out of 6 pairs
		expect(calculateKendallTauScore([0, 2, 1, 3], [0, 1, 2, 3])).toBeCloseTo(0.833, 2);
	});

	it('handles single item', () => {
		expect(calculateKendallTauScore([0], [0])).toBe(1);
	});

	it('handles two items', () => {
		expect(calculateKendallTauScore([0, 1], [0, 1])).toBe(1);
		expect(calculateKendallTauScore([1, 0], [0, 1])).toBe(0);
	});

	it('works with non-consecutive indices', () => {
		// Item IDs can be any numbers, not just 0, 1, 2...
		expect(calculateKendallTauScore([10, 20, 30], [10, 20, 30])).toBe(1);
	});
});

/**
 * MULTIPLE MATCH SCORE
 *
 * Simple position-based scoring for "Match items to positions" questions.
 * Count: items in correct position / total items
 *
 * Why test this? Even simple functions have edge cases (empty arrays, rounding)
 */
describe('calculateMultipleMatchScore', () => {
	it('returns 0 for empty array', () => {
		expect(calculateMultipleMatchScore([])).toBe(0);
	});

	it('returns 100 when all items in correct position', () => {
		expect(calculateMultipleMatchScore([0, 1, 2, 3])).toBe(100);
	});

	it('returns 0 when no items in correct position', () => {
		expect(calculateMultipleMatchScore([3, 2, 1, 0])).toBe(0);
	});

	it('returns 50 when half correct', () => {
		// [0, 3, 2, 1] has 2 correct (positions 0 and 2)
		expect(calculateMultipleMatchScore([0, 3, 2, 1])).toBe(50);
	});
});

/**
 * GET CORRECT ANSWER TEXT
 *
 * Returns the correct answer as a string for display after quiz completion.
 * Each variant type extracts the answer differently.
 *
 * Why test this? A bug here shows the WRONG answer to users. The switch statement
 * has 7 different code paths - we test each one.
 */
describe('getCorrectAnswerText', () => {
	it('returns joined correct answers for simple_guess', () => {
		const config: VariantConfig = {
			type: 'simple_guess',
			correctAnswers: ['Paris', 'paris', 'PARIS']
		};
		expect(getCorrectAnswerText(config)).toBe('Paris, paris, PARIS');
	});

	it('returns correct option text for multiple_choice', () => {
		const config: VariantConfig = {
			type: 'multiple_choice',
			options: [
				{ id: 'a', text: 'Option A', isCorrect: false },
				{ id: 'b', text: 'Option B', isCorrect: true },
				{ id: 'c', text: 'Option C', isCorrect: false }
			]
		};
		expect(getCorrectAnswerText(config)).toBe('Option B');
	});

	it('returns joined correct options for multiple_response', () => {
		const config: VariantConfig = {
			type: 'multiple_response',
			options: [
				{ id: 'a', text: 'Red', isCorrect: true },
				{ id: 'b', text: 'Green', isCorrect: false },
				{ id: 'c', text: 'Blue', isCorrect: true }
			]
		};
		expect(getCorrectAnswerText(config)).toBe('Red, Blue');
	});

	it('returns correct track name for sequence', () => {
		const config: VariantConfig = {
			type: 'sequence',
			tracks: [
				{ id: '1', name: 'Intro', url: '/1.mp3' },
				{ id: '2', name: 'Verse', url: '/2.mp3' },
				{ id: '3', name: 'Chorus', url: '/3.mp3' }
			],
			correctTrackIndex: 1
		};
		expect(getCorrectAnswerText(config)).toBe('Verse');
	});

	it('returns ranked item names in order for rank', () => {
		const config: VariantConfig = {
			type: 'rank',
			items: [
				{ id: 'a', name: 'Gold', url: '/gold.png' },
				{ id: 'b', name: 'Silver', url: '/silver.png' },
				{ id: 'c', name: 'Bronze', url: '/bronze.png' }
			],
			correctOrder: [2, 0, 1] // Bronze, Gold, Silver
		};
		expect(getCorrectAnswerText(config)).toBe('Bronze → Gold → Silver');
	});

	it('returns answer labels for multiple_match', () => {
		const config: VariantConfig = {
			type: 'multiple_match',
			items: [
				{ id: '1', name: 'Image 1', url: '/1.png', answerLabel: 'Cat' },
				{ id: '2', name: 'Image 2', url: '/2.png', answerLabel: 'Dog' },
				{ id: '3', name: 'Image 3', url: '/3.png', answerLabel: 'Bird' }
			]
		};
		expect(getCorrectAnswerText(config)).toBe('Cat → Dog → Bird');
	});

	it('returns correct option label for image_choice', () => {
		const config: VariantConfig = {
			type: 'image_choice',
			options: [
				{ id: 'a', imageUrl: '/a.png', pathname: '/a', label: 'Apple', isCorrect: false },
				{ id: 'b', imageUrl: '/b.png', pathname: '/b', label: 'Banana', isCorrect: true }
			]
		};
		expect(getCorrectAnswerText(config)).toBe('Banana');
	});
});
