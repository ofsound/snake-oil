import type {
	VariantConfig,
	SimpleGuessConfig,
	MultipleChoiceConfig,
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
 * Validate any variant config
 */
export function validateVariantConfig(config: VariantConfig): boolean {
	switch (config.type) {
		case 'simple_guess':
			return validateSimpleGuess(config);
		case 'multiple_choice':
			return validateMultipleChoice(config);
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
 * Check if an answer is correct based on variant type
 */
export function checkAnswerCorrect(
	guess: string,
	config: VariantConfig,
	selectedOptionId?: string
): boolean {
	switch (config.type) {
		case 'simple_guess':
			return checkSimpleGuessCorrect(guess, config.correctAnswer);
		case 'multiple_choice':
			return selectedOptionId ? checkMultipleChoiceCorrect(selectedOptionId, config) : false;
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
	selectedOptionId?: string
): AnswerDetail {
	const isCorrect = checkAnswerCorrect(guess, config, selectedOptionId);

	return {
		guess,
		isCorrect,
		variantType: config.type,
		...(config.type === 'multiple_choice' && selectedOptionId ? { selectedOptionId } : {})
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
		default:
			return '';
	}
}
