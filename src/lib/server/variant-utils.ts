import type {
	VariantConfig,
	SimpleGuessConfig,
	MultipleChoiceConfig,
	MultipleResponseConfig,
	ImageChoiceConfig,
	SequenceConfig,
	RankConfig,
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
 * Validate a Rank config
 * - Must have 2-10 items
 * - Each item must have id, name, url
 * - correctOrder must be a valid permutation of item indices
 * - Prompt is required
 */
export function validateRank(config: RankConfig): boolean {
	if (config.type !== 'rank') return false;
	if (!Array.isArray(config.items)) return false;
	if (config.items.length < 2 || config.items.length > 10) return false;
	if (!Array.isArray(config.correctOrder)) return false;
	if (config.correctOrder.length !== config.items.length) return false;
	if (typeof config.prompt !== 'string' || config.prompt.trim().length === 0) return false;

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
 * Validate an ImageChoice config
 * - Must have 2-10 options
 * - Each option must have id, imageUrl, pathname, label
 * - Exactly one option must be marked correct
 */
export function validateImageChoice(config: ImageChoiceConfig): boolean {
	console.log('[validateImageChoice] Validating config:', JSON.stringify(config, null, 2));

	if (config.type !== 'image_choice') {
		console.log('[validateImageChoice] FAILED: type is not image_choice');
		return false;
	}
	if (!Array.isArray(config.options)) {
		console.log('[validateImageChoice] FAILED: options is not an array');
		return false;
	}
	if (config.options.length < 2 || config.options.length > 10) {
		console.log(
			`[validateImageChoice] FAILED: options length ${config.options.length} is not between 2-10`
		);
		return false;
	}

	const correctCount = config.options.filter((opt) => opt.isCorrect).length;
	if (correctCount !== 1) {
		console.log(
			`[validateImageChoice] FAILED: ${correctCount} options marked correct (expected 1)`
		);
		return false;
	}

	for (let i = 0; i < config.options.length; i++) {
		const option = config.options[i];
		console.log(`[validateImageChoice] Checking option ${i}:`, {
			id: option.id,
			imageUrl: option.imageUrl?.substring(0, 30),
			pathname: option.pathname?.substring(0, 30),
			label: option.label,
			isCorrect: option.isCorrect
		});

		if (typeof option.id !== 'string' || option.id.trim().length === 0) {
			console.log(`[validateImageChoice] FAILED: option ${i} has invalid id`);
			return false;
		}
		if (typeof option.imageUrl !== 'string' || option.imageUrl.trim().length === 0) {
			console.log(`[validateImageChoice] FAILED: option ${i} has invalid imageUrl`);
			return false;
		}
		if (typeof option.pathname !== 'string' || option.pathname.trim().length === 0) {
			console.log(`[validateImageChoice] FAILED: option ${i} has invalid pathname`);
			return false;
		}
		if (typeof option.label !== 'string') {
			console.log(`[validateImageChoice] FAILED: option ${i} has invalid label`);
			return false;
		}
	}

	console.log('[validateImageChoice] SUCCESS: config is valid');
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
 * Calculate Kendall Tau distance between two permutations
 * Returns normalized score (0-1) where 1 = perfect match, 0 = completely reversed
 * Based on counting discordant pairs (inversions)
 */
export function calculateKendallTauScore(userOrder: number[], correctOrder: number[]): number {
	if (userOrder.length !== correctOrder.length) return 0;
	if (userOrder.length === 0) return 0;

	// Create position maps: for each item index, what position is it in?
	const userPos = new Map<number, number>();
	const correctPos = new Map<number, number>();

	userOrder.forEach((itemIdx, pos) => userPos.set(itemIdx, pos));
	correctOrder.forEach((itemIdx, pos) => correctPos.set(itemIdx, pos));

	// Count discordant pairs
	let discordant = 0;
	const n = userOrder.length;

	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const item1 = userOrder[i];
			const item2 = userOrder[j];

			const userDiff = userPos.get(item1)! - userPos.get(item2)!;
			const correctDiff = correctPos.get(item1)! - correctPos.get(item2)!;

			// If signs differ, they're discordant (inverted relative to correct order)
			if (userDiff * correctDiff < 0) {
				discordant++;
			}
		}
	}

	const maxPairs = (n * (n - 1)) / 2;
	return maxPairs > 0 ? 1 - discordant / maxPairs : 1;
}

/**
 * Check if a rank answer is correct
 * Uses Kendall Tau distance - 100% match required for "correct" status
 */
export function checkRankCorrect(userOrder: number[], config: RankConfig): boolean {
	const score = calculateKendallTauScore(userOrder, config.correctOrder);
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
export function checkAnswerCorrect(
	guess: string,
	config: VariantConfig,
	selectedOptionId?: string,
	selectedOptionIds?: string[],
	selectedTrackIndex?: number,
	userOrder?: number[]
): boolean {
	switch (config.type) {
		case 'simple_guess':
			return checkSimpleGuessCorrect(guess, config.correctAnswer);
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
		...(config.type === 'rank' && userOrder ? { userOrder } : {})
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
		case 'rank': {
			// Return the ranked item names in correct order
			return config.correctOrder
				.map((idx) => config.items[idx]?.name ?? '')
				.filter((name) => name.length > 0)
				.join(' → ');
		}
		case 'image_choice': {
			const correctOption = config.options.find((opt) => opt.isCorrect);
			return correctOption?.label ?? '';
		}
		default:
			return '';
	}
}
