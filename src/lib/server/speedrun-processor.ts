import { eq } from 'drizzle-orm';

import type { Db } from './db/index.js';
import { speedRuns } from './db/schema.js';

interface SpeedRunConfig {
	defaultQuestionTimeLimit: number | null;
	revealDelayMs: number;
	audioLoopGapMs: number;
	enableStreakBonus: boolean;
}

interface SpeedRunProcessingResult {
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
