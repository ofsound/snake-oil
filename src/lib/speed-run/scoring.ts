// Speed Run Scoring Utilities
// Functions for calculating scores and managing leaderboard logic

import type { SpeedRunAnswer } from './types';

/**
 * Calculate the score for a speed run attempt
 * Formula: (correctCount * 10000) - (totalTimeMs / 1000)
 * Correct answers are weighted much more heavily than time
 */
export function calculateSpeedRunScore(correctCount: number, totalTimeMs: number): number {
	// Base: 10000 points per correct answer
	// Penalty: 1 point per second
	return correctCount * 10000 - Math.floor(totalTimeMs / 1000);
}

/**
 * Calculate the maximum streak from a list of answers
 */
export function calculateMaxStreak(answers: SpeedRunAnswer[]): number {
	let currentStreak = 0;
	let maxStreak = 0;

	for (const answer of answers) {
		if (answer.isCorrect) {
			currentStreak++;
			maxStreak = Math.max(maxStreak, currentStreak);
		} else {
			currentStreak = 0;
		}
	}

	return maxStreak;
}

/**
 * Get streak milestone message if applicable
 */
export function getStreakMilestone(streak: number): string | null {
	if (streak === 3) return '3 in a row! 🔥';
	if (streak === 5) return '5 in a row! 🔥🔥';
	if (streak === 10) return 'UNSTOPPABLE! 🔥🔥🔥';
	if (streak === 15) return 'LEGENDARY! 👑';
	return null;
}

/**
 * Format time in milliseconds to a readable string
 * e.g., 45230 -> "45.23s"
 */
export function formatTimeMs(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	const centiseconds = Math.floor((ms % 1000) / 10);
	return `${seconds}.${centiseconds.toString().padStart(2, '0')}s`;
}

/**
 * Format time in milliseconds to minutes:seconds
 * e.g., 125000 -> "2:05"
 */
export function formatTimeLong(ms: number): string {
	const minutes = Math.floor(ms / 60000);
	const seconds = Math.floor((ms % 60000) / 1000);
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Determine if audio should loop based on duration
 * Audio shorter than 5 seconds will loop
 */
export function shouldLoopAudio(durationMs: number): boolean {
	return durationMs < 5000;
}

/**
 * Get timer color based on remaining percentage
 * Green (>50%), Orange (25-50%), Red (<25%)
 */
export function getTimerColor(remainingPercent: number): string {
	if (remainingPercent > 0.5) return '#22c55e'; // Green
	if (remainingPercent > 0.25) return '#f97316'; // Orange
	return '#ef4444'; // Red
}

/**
 * Validate that all required answers are present
 */
export function validateSubmission(
	answers: SpeedRunAnswer[],
	totalQuestions: number
): { valid: boolean; error?: string } {
	if (answers.length !== totalQuestions) {
		return {
			valid: false,
			error: `Expected ${totalQuestions} answers, got ${answers.length}`
		};
	}

	for (const answer of answers) {
		if (!answer.soundbiteId || typeof answer.isCorrect !== 'boolean') {
			return {
				valid: false,
				error: 'Invalid answer format'
			};
		}
	}

	return { valid: true };
}
