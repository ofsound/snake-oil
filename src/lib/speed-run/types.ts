// Speed Run Game Types
// Types for the speed run quiz game mode

import type { AnswerDetail } from '$lib/variant-types';
import type { SpeedRun, SpeedRunResult } from '$lib/server/db/schema';

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

// Speed run configuration from database
export type SpeedRunConfig = Pick<
	SpeedRun,
	'id' | 'defaultQuestionTimeLimit' | 'revealDelayMs' | 'audioLoopGapMs' | 'enableStreakBonus'
>;

// Submission data sent to server
export type SpeedRunSubmission = {
	speedRunId: string;
	answers: SpeedRunAnswer[];
	startTime: number;
	endTime: number;
	displayName: string;
};

// Result returned from server after submission
export type SpeedRunSubmissionResult = {
	success: boolean;
	result?: SpeedRunResult;
	rank?: number;
	top10?: SpeedRunLeaderboardEntry[];
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
export type StreakMilestone = {
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

// API Request/Response Types
// Used for type-safe API communication

// POST /api/speed-run/check-answer
export type SpeedRunCheckAnswerRequest = {
	soundbiteId: string;
	guess: string;
};

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
export type SpeedRunSubmitRequest = {
	speedRunId: string;
	answers: SpeedRunAnswer[];
	startTime: number;
	endTime: number;
	displayName: string;
};

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
