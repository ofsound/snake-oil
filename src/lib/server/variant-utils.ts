import type {
	VariantConfig,
	SimpleGuessConfig,
	MultipleChoiceConfig,
	MultipleResponseConfig,
	SequenceConfig,
	AnswersPayload,
	AnswerDetail
} from './db/schema';

/**
 * Validate a SimpleGuess config
 */
export function validateSimpleGuess(config: SimpleGuessConfig): boolean {
	return (
		config.type === 'simple_guess' &&
		typeof config.correctAnswer === 'string' &&
		config.correctAnswer.trim().length > 0
	);
}

/**
 * Validate a MultipleChoice config
 * - Must have 2-10 options
 * - Each option must have id, text
 * - Exactly one option must be marked correct
 */
export function validateMultipleChoice(config: MultipleChoiceConfig): boolean {
	if (config.type !== 'multiple_choice') return false;
	if (!Array.isArray(config.options)) return false;
	if (config.options.length < 2 || config.options.length > 10) return false;

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
 * - Must have 2-10 options
 * - Each option must have id, text
 * - At least one option must be marked correct (can have multiple correct)
 */
export function validateMultipleResponse(config: MultipleResponseConfig): boolean {
	if (config.type !== 'multiple_response') return false;
	if (!Array.isArray(config.options)) return false;
	if (config.options.length < 2 || config.options.length > 10) return false;

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
 * - Must have 2-10 tracks
 * - Each track must have id, name, url
 * - correctTrackIndex must be valid (0 to tracks.length - 1)
 * - Prompt is required
 */
export function validateSequence(config: SequenceConfig): boolean {
	if (config.type !== 'sequence') return false;
	if (!Array.isArray(config.tracks)) return false;
	if (config.tracks.length < 2 || config.tracks.length > 10) return false;
	if (typeof config.correctTrackIndex !== 'number') return false;
	if (config.correctTrackIndex < 0 || config.correctTrackIndex >= config.tracks.length)
		return false;
	if (typeof config.prompt !== 'string' || config.prompt.trim().length === 0) return false;

	for (const track of config.tracks) {
		if (typeof track.id !== 'string' || track.id.trim().length === 0) return false;
		if (typeof track.name !== 'string' || track.name.trim().length === 0) return false;
		if (typeof track.url !== 'string' || track.url.trim().length === 0) return false;
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
		case 'sequence':
			return validateSequence(config);
		default:
			return false;
	}
}

/**
 * Check if a simple guess answer is correct
 * Uses flexible matching: case-insensitive, trimmed whitespace
 */
export function checkSimpleGuessCorrect(guess: string, correctAnswer: string): boolean {
	const normalizedGuess = guess.trim().toLowerCase();
	const normalizedCorrect = correctAnswer.trim().toLowerCase();
	return normalizedGuess === normalizedCorrect;
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
export function checkMultipleResponseCorrect(
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
export function checkSequenceCorrect(selectedTrackIndex: number, config: SequenceConfig): boolean {
	return selectedTrackIndex === config.correctTrackIndex;
}

/**
 * Check if an answer is correct based on variant type
 */
export function checkAnswerCorrect(
	guess: string,
	config: VariantConfig,
	selectedOptionId?: string,
	selectedOptionIds?: string[],
	selectedTrackIndex?: number
): boolean {
	switch (config.type) {
		case 'simple_guess':
			return checkSimpleGuessCorrect(guess, config.correctAnswer);
		case 'multiple_choice':
			return selectedOptionId ? checkMultipleChoiceCorrect(selectedOptionId, config) : false;
		case 'multiple_response':
			return selectedOptionIds ? checkMultipleResponseCorrect(selectedOptionIds, config) : false;
		case 'sequence':
			return selectedTrackIndex !== undefined
				? checkSequenceCorrect(selectedTrackIndex, config)
				: false;
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
	selectedTrackIndex?: number
): AnswerDetail {
	const isCorrect = checkAnswerCorrect(
		guess,
		config,
		selectedOptionId,
		selectedOptionIds,
		selectedTrackIndex
	);

	return {
		guess,
		isCorrect,
		variantType: config.type,
		...(config.type === 'multiple_choice' && selectedOptionId ? { selectedOptionId } : {}),
		...(config.type === 'multiple_response' && selectedOptionIds ? { selectedOptionIds } : {}),
		...(config.type === 'sequence' && selectedTrackIndex !== undefined
			? { selectedTrackIndex }
			: {})
	};
}

/**
 * Get the correct answer text for display
 */
export function getCorrectAnswerText(config: VariantConfig): string {
	switch (config.type) {
		case 'simple_guess':
			return config.correctAnswer;
		case 'multiple_choice': {
			const correctOption = config.options.find((opt) => opt.isCorrect);
			return correctOption?.text ?? '';
		}
		case 'multiple_response': {
			const correctOptions = config.options.filter((opt) => opt.isCorrect);
			return correctOptions.map((opt) => opt.text).join(', ');
		}
		case 'sequence': {
			const correctTrack = config.tracks[config.correctTrackIndex];
			return correctTrack?.name ?? '';
		}
		default:
			return '';
	}
}
