import { eq } from 'drizzle-orm';

import type { Db } from './db/index.js';
import { speedRuns } from './db/schema.js';

export interface SpeedRunConfig {
	defaultQuestionTimeLimit: number | null;
	revealDelayMs: number;
	audioLoopGapMs: number;
	enableStreakBonus: boolean;
}

export interface SpeedRunProcessingResult {
	success: boolean;
	speedRunId?: string;
	error?: string;
}

/**
 * Create or update speed run configuration for a quiz
 */
export async function createOrUpdateSpeedRunConfig(
	db: Db,
	quizId: string,
	config: SpeedRunConfig
): Promise<SpeedRunProcessingResult> {
	try {
		// Validate config values
		if (config.revealDelayMs < 0 || config.audioLoopGapMs < 0) {
			return {
				success: false,
				error: 'Delay values must be positive'
			};
		}

		if (config.defaultQuestionTimeLimit !== null && config.defaultQuestionTimeLimit < 1) {
			return {
				success: false,
				error: 'Time limit must be at least 1 second'
			};
		}

		// Check if speed run config already exists
		const existing = await db.query.speedRuns.findFirst({
			where: eq(speedRuns.quizId, quizId)
		});

		if (existing) {
			// Update existing configuration
			await db
				.update(speedRuns)
				.set({
					defaultQuestionTimeLimit: config.defaultQuestionTimeLimit,
					revealDelayMs: config.revealDelayMs,
					audioLoopGapMs: config.audioLoopGapMs,
					enableStreakBonus: config.enableStreakBonus,
					updatedAt: new Date()
				})
				.where(eq(speedRuns.quizId, quizId));

			return { success: true, speedRunId: existing.id };
		} else {
			// Create new configuration
			const [newSpeedRun] = await db
				.insert(speedRuns)
				.values({
					quizId,
					defaultQuestionTimeLimit: config.defaultQuestionTimeLimit,
					revealDelayMs: config.revealDelayMs,
					audioLoopGapMs: config.audioLoopGapMs,
					enableStreakBonus: config.enableStreakBonus
				})
				.returning({ id: speedRuns.id });

			return { success: true, speedRunId: newSpeedRun.id };
		}
	} catch (error) {
		console.error('[SpeedRunProcessor] Error saving speed run config:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to save speed run configuration'
		};
	}
}

/**
 * Delete speed run configuration for a quiz
 * Call this when converting from speed run mode to regular quiz
 */
export async function deleteSpeedRunConfig(
	db: Db,
	quizId: string
): Promise<SpeedRunProcessingResult> {
	try {
		const existing = await db.query.speedRuns.findFirst({
			where: eq(speedRuns.quizId, quizId)
		});

		if (existing) {
			// Delete associated results first (cascade should handle this, but being explicit)
			await db.delete(speedRuns).where(eq(speedRuns.quizId, quizId));
		}

		return { success: true };
	} catch (error) {
		console.error('[SpeedRunProcessor] Error deleting speed run config:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to delete speed run configuration'
		};
	}
}

/**
 * Get speed run configuration for a quiz
 */
export async function getSpeedRunConfig(db: Db, quizId: string): Promise<SpeedRunConfig | null> {
	try {
		const config = await db.query.speedRuns.findFirst({
			where: eq(speedRuns.quizId, quizId)
		});

		if (!config) return null;

		return {
			defaultQuestionTimeLimit: config.defaultQuestionTimeLimit,
			revealDelayMs: config.revealDelayMs,
			audioLoopGapMs: config.audioLoopGapMs,
			enableStreakBonus: config.enableStreakBonus
		};
	} catch (error) {
		console.error('[SpeedRunProcessor] Error getting speed run config:', error);
		return null;
	}
}

/**
 * Check if a quiz has speed run mode enabled
 */
export async function hasSpeedRunConfig(db: Db, quizId: string): Promise<boolean> {
	try {
		const config = await db.query.speedRuns.findFirst({
			where: eq(speedRuns.quizId, quizId),
			columns: { id: true }
		});

		return !!config;
	} catch (error) {
		console.error('[SpeedRunProcessor] Error checking speed run config:', error);
		return false;
	}
}

/**
 * Validate speed run configuration
 * Returns null if valid, error message if invalid
 */
export function validateSpeedRunConfig(config: Partial<SpeedRunConfig>): string | null {
	if (config.revealDelayMs !== undefined && config.revealDelayMs < 0) {
		return 'Reveal delay must be positive';
	}

	if (config.audioLoopGapMs !== undefined && config.audioLoopGapMs < 0) {
		return 'Audio loop gap must be positive';
	}

	if (config.defaultQuestionTimeLimit !== undefined) {
		if (config.defaultQuestionTimeLimit !== null && config.defaultQuestionTimeLimit < 1) {
			return 'Time limit must be at least 1 second or null for unlimited';
		}
	}

	return null;
}

/**
 * Get default speed run configuration values
 */
export function getDefaultSpeedRunConfig(): SpeedRunConfig {
	return {
		defaultQuestionTimeLimit: null, // Unlimited by default
		revealDelayMs: 3000, // 3 seconds
		audioLoopGapMs: 2000, // 2 seconds
		enableStreakBonus: true
	};
}
