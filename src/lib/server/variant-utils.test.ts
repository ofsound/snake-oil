import { describe, it, expect } from 'vitest';
import {
	validateVariantConfig,
	checkSimpleGuessCorrect,
	checkMultipleChoiceCorrect,
	checkImageChoiceCorrect
} from './variant-utils';
import type { RankConfig, MultipleChoiceConfig, ImageChoiceConfig } from './db/schema';

/**
 * RANK VARIANT VALIDATION
 *
 * The rank variant requires users to order items. The correctOrder array must be
 * a valid permutation of indices [0, 1, ..., n-1] where n is the number of items.
 *
 * Why test this? Invalid permutations break the ranking algorithm or show wrong answers.
 * This is critical logic with multiple ways to fail.
 *
 * Valid permutation: [0, 1, 2] or [2, 0, 1] for 3 items
 * Invalid: [0, 0, 2] (duplicate), [0, 2] (missing index), [0, 1, 5] (out of range)
 */
describe('validateVariantConfig - rank variant', () => {
	/**
	 * HAPPY PATH
	 * These should all pass validation
	 */
	describe('accepts valid rank configs', () => {
		it('accepts valid rank with sequential order', () => {
			const config: RankConfig = {
				type: 'rank',
				items: [
					{ id: '1', name: 'Item 1', url: '/1.png' },
					{ id: '2', name: 'Item 2', url: '/2.png' },
					{ id: '3', name: 'Item 3', url: '/3.png' }
				],
				correctOrder: [0, 1, 2]
			};
			expect(validateVariantConfig(config)).toBe(true);
		});

		it('accepts scrambled valid permutation', () => {
			// Any order is fine as long as it's a valid permutation
			const config: RankConfig = {
				type: 'rank',
				items: [
					{ id: '1', name: 'Item 1', url: '/1.png' },
					{ id: '2', name: 'Item 2', url: '/2.png' },
					{ id: '3', name: 'Item 3', url: '/3.png' }
				],
				correctOrder: [2, 0, 1]
			};
			expect(validateVariantConfig(config)).toBe(true);
		});
	});

	/**
	 * ITEM COUNT VALIDATION
	 * Must have between 2 and 10 items
	 */
	describe('validates item count', () => {
		it('rejects rank with too few items', () => {
			const config: RankConfig = {
				type: 'rank',
				items: [{ id: '1', name: 'Only Item', url: '/1.png' }],
				correctOrder: [0]
			};
			expect(validateVariantConfig(config)).toBe(false);
		});

		it('rejects rank with too many items', () => {
			const config: RankConfig = {
				type: 'rank',
				items: Array(11)
					.fill(null)
					.map((_, i) => ({
						id: String(i),
						name: `Item ${i}`,
						url: `/${i}.png`
					})),
				correctOrder: Array(11)
					.fill(0)
					.map((_, i) => i)
			};
			expect(validateVariantConfig(config)).toBe(false);
		});
	});

	/**
	 * PERMUTATION VALIDATION
	 * correctOrder must contain each index exactly once
	 */
	describe('validates permutation correctness', () => {
		it('rejects duplicate indices', () => {
			const config: RankConfig = {
				type: 'rank',
				items: [
					{ id: '1', name: 'Item 1', url: '/1.png' },
					{ id: '2', name: 'Item 2', url: '/2.png' },
					{ id: '3', name: 'Item 3', url: '/3.png' }
				],
				correctOrder: [0, 0, 2] // Duplicate 0, missing 1
			};
			expect(validateVariantConfig(config)).toBe(false);
		});

		it('rejects missing indices', () => {
			const config: RankConfig = {
				type: 'rank',
				items: [
					{ id: '1', name: 'Item 1', url: '/1.png' },
					{ id: '2', name: 'Item 2', url: '/2.png' },
					{ id: '3', name: 'Item 3', url: '/3.png' }
				],
				correctOrder: [0, 2] // Missing index 1, wrong length
			};
			expect(validateVariantConfig(config)).toBe(false);
		});

		it('rejects out-of-range indices', () => {
			const config: RankConfig = {
				type: 'rank',
				items: [
					{ id: '1', name: 'Item 1', url: '/1.png' },
					{ id: '2', name: 'Item 2', url: '/2.png' },
					{ id: '3', name: 'Item 3', url: '/3.png' }
				],
				correctOrder: [0, 1, 5] // 5 is out of range for 3 items (max is 2)
			};
			expect(validateVariantConfig(config)).toBe(false);
		});
	});
});

/**
 * ANSWER CHECK FUNCTIONS
 *
 * These determine whether a user's answer is correct. Used by the check-answer API
 * and submission processing. Case sensitivity, whitespace, and option ID matching
 * must behave correctly to avoid wrong scores.
 */
describe('checkSimpleGuessCorrect', () => {
	it('returns true when guess matches a correct answer', () => {
		expect(checkSimpleGuessCorrect('foo', ['foo'])).toBe(true);
		expect(checkSimpleGuessCorrect('bar', ['foo', 'bar'])).toBe(true);
	});

	it('is case-insensitive', () => {
		expect(checkSimpleGuessCorrect('FOO', ['foo'])).toBe(true);
		expect(checkSimpleGuessCorrect('Foo', ['foo'])).toBe(true);
		expect(checkSimpleGuessCorrect('foo', ['FOO'])).toBe(true);
	});

	it('trims whitespace', () => {
		expect(checkSimpleGuessCorrect('  foo  ', ['foo'])).toBe(true);
		expect(checkSimpleGuessCorrect('foo', ['  foo  '])).toBe(true);
	});

	it('returns false when guess does not match', () => {
		expect(checkSimpleGuessCorrect('baz', ['foo', 'bar'])).toBe(false);
	});

	it('returns false for empty guess with non-empty answers', () => {
		expect(checkSimpleGuessCorrect('', ['foo'])).toBe(false);
	});

	it('handles multiple correct answers', () => {
		expect(checkSimpleGuessCorrect('synonym', ['answer', 'synonym', 'alias'])).toBe(true);
	});
});

describe('checkMultipleChoiceCorrect', () => {
	const config: MultipleChoiceConfig = {
		type: 'multiple_choice',
		options: [
			{ id: 'opt-a', text: 'Wrong', isCorrect: false },
			{ id: 'opt-b', text: 'Correct', isCorrect: true },
			{ id: 'opt-c', text: 'Wrong', isCorrect: false }
		]
	};

	it('returns true when selected option ID matches correct option', () => {
		expect(checkMultipleChoiceCorrect('opt-b', config)).toBe(true);
	});

	it('returns false when selected option ID is wrong', () => {
		expect(checkMultipleChoiceCorrect('opt-a', config)).toBe(false);
		expect(checkMultipleChoiceCorrect('opt-c', config)).toBe(false);
	});

	it('returns false for non-existent option ID', () => {
		expect(checkMultipleChoiceCorrect('opt-d', config)).toBe(false);
	});
});

describe('checkImageChoiceCorrect', () => {
	const config: ImageChoiceConfig = {
		type: 'image_choice',
		options: [
			{ id: 'img-a', imageUrl: '/a.png', pathname: '/a.png', label: 'Wrong', isCorrect: false },
			{ id: 'img-b', imageUrl: '/b.png', pathname: '/b.png', label: 'Correct', isCorrect: true }
		]
	};

	it('returns true when selected option ID matches correct option', () => {
		expect(checkImageChoiceCorrect('img-b', config)).toBe(true);
	});

	it('returns false when selected option ID is wrong', () => {
		expect(checkImageChoiceCorrect('img-a', config)).toBe(false);
	});

	it('returns false for non-existent option ID', () => {
		expect(checkImageChoiceCorrect('img-c', config)).toBe(false);
	});
});
