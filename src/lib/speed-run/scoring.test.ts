import { describe, it, expect } from 'vitest';
import {
	calculateSpeedRunScore,
	calculateMaxStreak,
	formatTimeMs,
	formatTimeLong
} from './scoring';

describe('scoring', () => {
	describe('calculateSpeedRunScore', () => {
		it('calculates score with correct formula: 10000 per correct, minus 1 per second', () => {
			expect(calculateSpeedRunScore(5, 0)).toBe(50000);
			expect(calculateSpeedRunScore(3, 2000)).toBe(29998); // 30000 - 2
		});

		it('returns negative score when time penalty exceeds correct points', () => {
			// 1 correct = 10000 pts, 10015 seconds = 10015 penalty → -15
			expect(calculateSpeedRunScore(1, 10015000)).toBe(-15);
		});

		it('handles zero correct answers', () => {
			expect(calculateSpeedRunScore(0, 0)).toBe(0);
			expect(calculateSpeedRunScore(0, 5000)).toBe(-5);
		});

		it('floors time penalty (partial seconds do not count)', () => {
			expect(calculateSpeedRunScore(1, 999)).toBe(10000); // 999ms = 0 seconds
			expect(calculateSpeedRunScore(1, 1000)).toBe(9999);
		});
	});

	describe('calculateMaxStreak', () => {
		it('returns 0 for empty array', () => {
			expect(calculateMaxStreak([])).toBe(0);
		});

		it('returns streak when all correct', () => {
			expect(
				calculateMaxStreak([
					{ soundbiteId: '1', isCorrect: true, timeSpentMs: 1000, answeredAt: 0, guess: '' },
					{ soundbiteId: '2', isCorrect: true, timeSpentMs: 1000, answeredAt: 1, guess: '' },
					{ soundbiteId: '3', isCorrect: true, timeSpentMs: 1000, answeredAt: 2, guess: '' }
				])
			).toBe(3);
		});

		it('returns 0 when all wrong', () => {
			expect(
				calculateMaxStreak([
					{ soundbiteId: '1', isCorrect: false, timeSpentMs: 1000, answeredAt: 0, guess: '' },
					{ soundbiteId: '2', isCorrect: false, timeSpentMs: 1000, answeredAt: 1, guess: '' }
				])
			).toBe(0);
		});

		it('tracks max streak across breaks', () => {
			expect(
				calculateMaxStreak([
					{ soundbiteId: '1', isCorrect: true, timeSpentMs: 1000, answeredAt: 0, guess: '' },
					{ soundbiteId: '2', isCorrect: true, timeSpentMs: 1000, answeredAt: 1, guess: '' },
					{ soundbiteId: '3', isCorrect: false, timeSpentMs: 1000, answeredAt: 2, guess: '' },
					{ soundbiteId: '4', isCorrect: true, timeSpentMs: 1000, answeredAt: 3, guess: '' }
				])
			).toBe(2);
		});

		it('returns 1 for single correct answer', () => {
			expect(
				calculateMaxStreak([
					{ soundbiteId: '1', isCorrect: true, timeSpentMs: 1000, answeredAt: 0, guess: '' }
				])
			).toBe(1);
		});
	});

	describe('formatTimeMs', () => {
		it('formats seconds with centiseconds', () => {
			expect(formatTimeMs(0)).toBe('0.00s');
			expect(formatTimeMs(45230)).toBe('45.23s');
			expect(formatTimeMs(59200)).toBe('59.20s');
		});

		it('pads centiseconds with zero', () => {
			expect(formatTimeMs(1000)).toBe('1.00s');
			expect(formatTimeMs(1050)).toBe('1.05s');
		});

		it('handles sub-second times', () => {
			expect(formatTimeMs(500)).toBe('0.50s');
			expect(formatTimeMs(50)).toBe('0.05s');
		});
	});

	describe('formatTimeLong', () => {
		it('formats as minutes:seconds', () => {
			expect(formatTimeLong(0)).toBe('0:00');
			expect(formatTimeLong(125000)).toBe('2:05');
			expect(formatTimeLong(60000)).toBe('1:00');
		});

		it('pads seconds with zero', () => {
			expect(formatTimeLong(61000)).toBe('1:01');
			expect(formatTimeLong(125000)).toBe('2:05');
		});

		it('handles times under one minute', () => {
			expect(formatTimeLong(45000)).toBe('0:45');
		});
	});
});
