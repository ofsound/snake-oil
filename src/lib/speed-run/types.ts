// Speed Run Game Types
// Types for the speed run quiz game mode

import type { AnswerDetail } from '$lib/variant-types';

// Game phases
export type GamePhase =
	| 'idle' // Start screen visible
	| 'countdown' // 3-2-1 animation
	| 'question' // Question displayed, timer running
	| 'revealing' // Answer shown, 3s countdown to next
	| 'results'; // Final screen with leaderboard

// Individual answer in a speed run session
export type SpeedRunAnswer = {
	soundbiteId: string;
	isCorrect: boolean;
	timeSpentMs: number; // Time spent on this question
	answeredAt: number; // Timestamp when answered
	guess: string; // User's answer
} & Partial<AnswerDetail>;

// Question with client-safe data (no correct answers)
export type SpeedRunQuestion = {
	id: string;
	position: number;
	question: string | null;
	variantType: 'multiple_choice';
	variantConfig: {
		type: 'multiple_choice';
		options: {
			id: string;
			text: string;
			isCorrect: false; // Always false on client
		}[];
		questionTimeLimit?: number; // Optional per-question timer
	};
	track: {
		id: string;
		name: string;
		url: string;
	};
};

// Leaderboard entry
export type SpeedRunLeaderboardEntry = {
	id: string;
	displayName: string;
	correctCount: number;
	totalTimeMs: number;
	streakMax: number;
	score: number;
	createdAt: Date;
	isCurrentUser?: boolean;
};

// Streak notification
type StreakMilestone = {
	count: number;
	message: string;
	emoji: string;
};

export const STREAK_MILESTONES: StreakMilestone[] = [
	{ count: 3, message: '3 in a row!', emoji: '🔥' },
	{ count: 5, message: '5 in a row!', emoji: '🔥🔥' },
	{ count: 10, message: 'UNSTOPPABLE!', emoji: '🔥🔥🔥' },
	{ count: 15, message: 'LEGENDARY!', emoji: '👑' }
];

import { z } from 'zod';

// API Request/Response Types
// Used for type-safe API communication

// POST /api/speed-run/check-answer
export const SpeedRunCheckAnswerRequestSchema = z.object({
	soundbiteId: z.string().min(1, 'Soundbite ID is required'),
	guess: z.string() // Empty string allowed for timeouts
});

export type SpeedRunCheckAnswerResponse =
	| {
			success: true;
			isCorrect: boolean;
			correctAnswer: string;
	  }
	| {
			success: false;
			error: string;
	  };

// POST /api/speed-run/submit
const SpeedRunAnswerSchema = z.object({
	soundbiteId: z.string().min(1, 'Soundbite ID is required'),
	guess: z.string(),
	timeSpentMs: z.number().min(0, 'Time spent must be positive'),
	answeredAt: z.number().min(0, 'Answered at must be positive'),
	isCorrect: z.boolean().optional()
});

export const SpeedRunSubmitRequestSchema = z.object({
	speedRunId: z.string().uuid('Invalid speed run ID'),
	answers: z.array(SpeedRunAnswerSchema).min(1, 'At least one answer is required'),
	startTime: z.number().min(0, 'Start time must be positive'),
	endTime: z.number().min(0, 'End time must be positive'),
	displayName: z.string().min(1, 'Display name is required').max(50, 'Display name too long')
});

export type SpeedRunSubmitResponse =
	| {
			success: true;
			result: {
				id: string;
				correctCount: number;
				totalTimeMs: number;
				score: number;
				streakMax: number;
			};
			rank: number;
			top10: SpeedRunLeaderboardEntry[];
	  }
	| {
			success: false;
			error: string;
	  };
