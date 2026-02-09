import type {
	VariantConfig,
	SimpleGuessConfig,
	MultipleChoiceConfig,
	MultipleResponseConfig,
	ImageChoiceConfig,
	SequenceConfig,
	RankConfig,
	MultipleMatchConfig,
	AnswersPayload,
	AnswerDetail
} from './db/schema';

import {
	MAX_MULTIPLE_CHOICE_OPTIONS,
	MAX_MULTIPLE_RESPONSE_OPTIONS,
	MAX_SEQUENCE_TRACKS,
	MAX_RANK_ITEMS,
	MAX_MULTIPLE_MATCH_ITEMS,
	MAX_IMAGE_CHOICE_OPTIONS,
	MIN_MULTIPLE_CHOICE_OPTIONS,
	MIN_MULTIPLE_RESPONSE_OPTIONS,
	MIN_SEQUENCE_TRACKS,
	MIN_RANK_ITEMS,
	MIN_MULTIPLE_MATCH_ITEMS,
	MIN_IMAGE_CHOICE_OPTIONS
} from '$lib/constants/variants';

import { calculateKendallTauScore } from '$lib/variant-display';

/**
 * Validate a SimpleGuess config
 */
function validateSimpleGuess(config: SimpleGuessConfig): boolean {
	return (
		config.type === 'simple_guess' &&
		Array.isArray(config.correctAnswers) &&
		config.correctAnswers.length > 0 &&
		config.correctAnswers.every((answer) => typeof answer === 'string' && answer.trim().length > 0)
	);
}

/**
 * Validate a MultipleChoice config
 * - Must have MIN_MULTIPLE_CHOICE_OPTIONS-MAX_MULTIPLE_CHOICE_OPTIONS options
 * - Each option must have id, text
 * - Exactly one option must be marked correct
 */
function validateMultipleChoice(config: MultipleChoiceConfig): boolean {
	if (config.type !== 'multiple_choice') return false;
	if (!Array.isArray(config.options)) return false;
	if (
		config.options.length < MIN_MULTIPLE_CHOICE_OPTIONS ||
		config.options.length > MAX_MULTIPLE_CHOICE_OPTIONS
	)
		return false;

	const correctCount = config.options.filter((opt) => opt.isCorrect).length;
	if (correctCount !== 1) return false;

	for (const option of config.options) {
		if (typeof option.id !== 'string' || option.id.trim().length === 0) return false;
		if (typeof option.text !== 'string' || option.text.trim().length === 0) return false;
	}

	return true;
}

/**
 * Validate a MultipleResponse config
 * - Must have MIN_MULTIPLE_RESPONSE_OPTIONS-MAX_MULTIPLE_RESPONSE_OPTIONS options
 * - Each option must have id, text
 * - At least one option must be marked correct (can have multiple correct)
 */
function validateMultipleResponse(config: MultipleResponseConfig): boolean {
	if (config.type !== 'multiple_response') return false;
	if (!Array.isArray(config.options)) return false;
	if (
		config.options.length < MIN_MULTIPLE_RESPONSE_OPTIONS ||
		config.options.length > MAX_MULTIPLE_RESPONSE_OPTIONS
	)
		return false;

	const correctCount = config.options.filter((opt) => opt.isCorrect).length;
	if (correctCount < 1) return false; // At least one must be correct

	for (const option of config.options) {
		if (typeof option.id !== 'string' || option.id.trim().length === 0) return false;
		if (typeof option.text !== 'string' || option.text.trim().length === 0) return false;
	}

	return true;
}

/**
 * Validate a Sequence config
 * - Must have MIN_SEQUENCE_TRACKS-MAX_SEQUENCE_TRACKS tracks
 * - Each track must have id, name, url
 * - correctTrackIndex must be valid (0 to tracks.length - 1)
 */
function validateSequence(config: SequenceConfig): boolean {
	if (config.type !== 'sequence') return false;
	if (!Array.isArray(config.tracks)) return false;
	if (config.tracks.length < MIN_SEQUENCE_TRACKS || config.tracks.length > MAX_SEQUENCE_TRACKS)
		return false;
	if (typeof config.correctTrackIndex !== 'number') return false;
	if (config.correctTrackIndex < 0 || config.correctTrackIndex >= config.tracks.length)
		return false;

	for (const track of config.tracks) {
		if (typeof track.id !== 'string' || track.id.trim().length === 0) return false;
		if (typeof track.name !== 'string' || track.name.trim().length === 0) return false;
		if (typeof track.url !== 'string' || track.url.trim().length === 0) return false;
	}

	return true;
}

/**
 * Validate a Rank config
 * - Must have MIN_RANK_ITEMS-MAX_RANK_ITEMS items
 * - Each item must have id, name, url
 * - correctOrder must be a valid permutation of item indices
 */
function validateRank(config: RankConfig): boolean {
	if (config.type !== 'rank') return false;
	if (!Array.isArray(config.items)) return false;
	if (config.items.length < MIN_RANK_ITEMS || config.items.length > MAX_RANK_ITEMS) return false;
	if (!Array.isArray(config.correctOrder)) return false;
	if (config.correctOrder.length !== config.items.length) return false;

	// Validate correctOrder is a valid permutation (contains all indices 0 to n-1 exactly once)
	const expectedIndices = new Set(config.items.map((_, i) => i));
	const actualIndices = new Set(config.correctOrder);
	if (expectedIndices.size !== actualIndices.size) return false;
	for (const idx of expectedIndices) {
		if (!actualIndices.has(idx)) return false;
	}

	for (const item of config.items) {
		if (typeof item.id !== 'string' || item.id.trim().length === 0) return false;
		if (typeof item.name !== 'string' || item.name.trim().length === 0) return false;
		if (typeof item.url !== 'string' || item.url.trim().length === 0) return false;
	}

	return true;
}

/**
 * Validate a MultipleMatch config
 * - Must have MIN_MULTIPLE_MATCH_ITEMS-MAX_MULTIPLE_MATCH_ITEMS items
 * - Each item must have id, name, url, answerLabel
 * - The order of items defines the correct answer
 */
function validateMultipleMatch(config: MultipleMatchConfig): boolean {
	if (config.type !== 'multiple_match') return false;
	if (!Array.isArray(config.items)) return false;
	if (
		config.items.length < MIN_MULTIPLE_MATCH_ITEMS ||
		config.items.length > MAX_MULTIPLE_MATCH_ITEMS
	)
		return false;

	for (const item of config.items) {
		if (typeof item.id !== 'string' || item.id.trim().length === 0) return false;
		if (typeof item.name !== 'string' || item.name.trim().length === 0) return false;
		if (typeof item.url !== 'string' || item.url.trim().length === 0) return false;
		if (typeof item.answerLabel !== 'string' || item.answerLabel.trim().length === 0) return false;
	}

	return true;
}

/**
 * Validate an ImageChoice config
 * - Must have MIN_IMAGE_CHOICE_OPTIONS-MAX_IMAGE_CHOICE_OPTIONS options
 * - Each option must have id, imageUrl, pathname, label
 * - Exactly one option must be marked correct
 */
function validateImageChoice(config: ImageChoiceConfig): boolean {
	if (config.type !== 'image_choice') {
		return false;
	}
	if (!Array.isArray(config.options)) {
		return false;
	}
	if (
		config.options.length < MIN_IMAGE_CHOICE_OPTIONS ||
		config.options.length > MAX_IMAGE_CHOICE_OPTIONS
	) {
		return false;
	}

	const correctCount = config.options.filter((opt) => opt.isCorrect).length;
	if (correctCount !== 1) {
		return false;
	}

	for (const option of config.options) {
		if (typeof option.id !== 'string' || option.id.trim().length === 0) {
			return false;
		}
		if (typeof option.imageUrl !== 'string' || option.imageUrl.trim().length === 0) {
			return false;
		}
		if (typeof option.pathname !== 'string' || option.pathname.trim().length === 0) {
			return false;
		}
		if (typeof option.label !== 'string') {
			return false;
		}
	}

	return true;
}

/**
 * Validate any variant config
 */
export function validateVariantConfig(config: VariantConfig): boolean {
	switch (config.type) {
		case 'simple_guess':
			return validateSimpleGuess(config);
		case 'multiple_choice':
			return validateMultipleChoice(config);
		case 'multiple_response':
			return validateMultipleResponse(config);
		case 'image_choice':
			return validateImageChoice(config);
		case 'sequence':
			return validateSequence(config);
		case 'rank':
			return validateRank(config);
		case 'multiple_match':
			return validateMultipleMatch(config);
		default:
			return false;
	}
}

/**
 * Check if a simple guess answer is correct
 * Uses flexible matching: case-insensitive, trimmed whitespace
 * Returns true if guess matches ANY of the correct answers
 */
export function checkSimpleGuessCorrect(guess: string, correctAnswers: string[]): boolean {
	const normalizedGuess = guess.trim().toLowerCase();
	return correctAnswers.some((answer) => {
		const normalizedCorrect = answer.trim().toLowerCase();
		return normalizedGuess === normalizedCorrect;
	});
}

/**
 * Check if a multiple choice answer is correct
 */
export function checkMultipleChoiceCorrect(
	selectedOptionId: string,
	config: MultipleChoiceConfig
): boolean {
	const correctOption = config.options.find((opt) => opt.isCorrect);
	return correctOption?.id === selectedOptionId;
}

/**
 * Check if a multiple response answer is correct
 * All correct options must be selected, and no incorrect options can be selected
 */
function checkMultipleResponseCorrect(
	selectedOptionIds: string[],
	config: MultipleResponseConfig
): boolean {
	const correctOptionIds = config.options.filter((opt) => opt.isCorrect).map((opt) => opt.id);

	// Must select all correct options
	if (selectedOptionIds.length !== correctOptionIds.length) {
		return false;
	}

	// All selected must be correct
	return selectedOptionIds.every((id) => correctOptionIds.includes(id));
}

/**
 * Check if a sequence answer is correct
 * The selected track index must match the correctTrackIndex
 */
function checkSequenceCorrect(selectedTrackIndex: number, config: SequenceConfig): boolean {
	return selectedTrackIndex === config.correctTrackIndex;
}

/**
 * Check if a rank answer is correct
 * Uses Kendall Tau distance - 100% match required for "correct" status
 */
function checkRankCorrect(userOrder: number[], config: RankConfig): boolean {
	const score = calculateKendallTauScore(userOrder, config.correctOrder);
	return score === 1; // Must be 100% to be considered "correct"
}

/**
 * Check if a multiple match answer is correct
 * The "correct order" is just the identity order [0, 1, 2, ..., n-1]
 * Uses Kendall Tau distance - 100% match required for "correct" status
 */
function checkMultipleMatchCorrect(userOrder: number[], config: MultipleMatchConfig): boolean {
	// The correct order is always [0, 1, 2, ..., n-1] because items are stored in correct order
	const correctOrder = config.items.map((_, i) => i);
	const score = calculateKendallTauScore(userOrder, correctOrder);
	return score === 1; // Must be 100% to be considered "correct"
}

/**
 * Check if an image choice answer is correct
 */
export function checkImageChoiceCorrect(
	selectedOptionId: string,
	config: ImageChoiceConfig
): boolean {
	const correctOption = config.options.find((opt) => opt.isCorrect);
	return correctOption?.id === selectedOptionId;
}

/**
 * Check if an answer is correct based on variant type
 */
function checkAnswerCorrect(
	guess: string,
	config: VariantConfig,
	selectedOptionId?: string,
	selectedOptionIds?: string[],
	selectedTrackIndex?: number,
	userOrder?: number[]
): boolean {
	switch (config.type) {
		case 'simple_guess':
			return checkSimpleGuessCorrect(guess, config.correctAnswers);
		case 'multiple_choice':
			return selectedOptionId ? checkMultipleChoiceCorrect(selectedOptionId, config) : false;
		case 'multiple_response':
			return selectedOptionIds ? checkMultipleResponseCorrect(selectedOptionIds, config) : false;
		case 'image_choice':
			return selectedOptionId ? checkImageChoiceCorrect(selectedOptionId, config) : false;
		case 'sequence':
			return selectedTrackIndex !== undefined
				? checkSequenceCorrect(selectedTrackIndex, config)
				: false;
		case 'rank':
			return userOrder ? checkRankCorrect(userOrder, config) : false;
		case 'multiple_match':
			return userOrder ? checkMultipleMatchCorrect(userOrder, config) : false;
		default:
			return false;
	}
}

/**
 * Calculate score from answers payload
 */
export function calculateScore(answers: AnswersPayload): {
	score: number;
	totalCorrect: number;
	totalQuestions: number;
} {
	const entries = Object.values(answers);
	const totalQuestions = entries.length;
	const totalCorrect = entries.filter((answer) => answer.isCorrect).length;
	const score = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

	return { score, totalCorrect, totalQuestions };
}

/**
 * Build an answer detail object
 */
export function buildAnswerDetail(
	guess: string,
	config: VariantConfig,
	selectedOptionId?: string,
	selectedOptionIds?: string[],
	selectedTrackIndex?: number,
	userOrder?: number[]
): AnswerDetail {
	const isCorrect = checkAnswerCorrect(
		guess,
		config,
		selectedOptionId,
		selectedOptionIds,
		selectedTrackIndex,
		userOrder
	);

	return {
		guess,
		isCorrect,
		variantType: config.type,
		...(config.type === 'multiple_choice' && selectedOptionId ? { selectedOptionId } : {}),
		...(config.type === 'multiple_response' && selectedOptionIds ? { selectedOptionIds } : {}),
		...(config.type === 'image_choice' && selectedOptionId ? { selectedOptionId } : {}),
		...(config.type === 'sequence' && selectedTrackIndex !== undefined
			? { selectedTrackIndex }
			: {}),
		...(config.type === 'rank' && userOrder ? { userOrder } : {}),
		...(config.type === 'multiple_match' && userOrder ? { userOrder } : {})
	};
}
