// Speed Run Timer Utilities
// Accurate timer management using requestAnimationFrame

import type { TimerState } from './types';

/**
 * Create a new timer state
 */
export function createTimer(): TimerState {
	return {
		isRunning: false,
		elapsedMs: 0,
		startTime: 0
	};
}

/**
 * Start a timer
 */
export function startTimer(timer: TimerState): TimerState {
	return {
		...timer,
		isRunning: true,
		startTime: Date.now() - timer.elapsedMs
	};
}

/**
 * Stop a timer
 */
export function stopTimer(timer: TimerState): TimerState {
	return {
		...timer,
		isRunning: false,
		elapsedMs: Date.now() - timer.startTime
	};
}

/**
 * Update timer elapsed time (call in animation frame)
 */
export function updateTimer(timer: TimerState): TimerState {
	if (!timer.isRunning) return timer;

	return {
		...timer,
		elapsedMs: Date.now() - timer.startTime
	};
}

/**
 * Reset timer to zero
 */
export function resetTimer(): TimerState {
	return createTimer();
}

/**
 * Create a countdown timer state
 */
export function createCountdownTimer(durationMs: number): TimerState {
	return {
		isRunning: false,
		elapsedMs: 0,
		startTime: 0
	};
}

/**
 * Get remaining time for a countdown timer
 */
export function getRemainingTime(timer: TimerState, durationMs: number): number {
	const remaining = durationMs - timer.elapsedMs;
	return Math.max(0, remaining);
}

/**
 * Check if countdown timer has expired
 */
export function isTimerExpired(timer: TimerState, durationMs: number): boolean {
	return timer.elapsedMs >= durationMs;
}
