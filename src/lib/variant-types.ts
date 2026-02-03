// Shared variant types - accessible from both client and server

// Variant Types - extensible for future variants
export const VARIANT_TYPES = ['simple_guess', 'multiple_choice', 'multiple_response'] as const;
export type VariantType = (typeof VARIANT_TYPES)[number];

export const VARIANT_LABELS: Record<VariantType, string> = {
	simple_guess: 'Simple Guess',
	multiple_choice: 'Multiple Choice',
	multiple_response: 'Multiple Response'
};

// Variant Config Types
export type MultipleChoiceOption = {
	id: string;
	text: string;
	isCorrect: boolean;
};

export type MultipleResponseOption = {
	id: string;
	text: string;
	isCorrect: boolean;
};

export type SimpleGuessConfig = {
	type: 'simple_guess';
	correctAnswer: string;
};

export type MultipleChoiceConfig = {
	type: 'multiple_choice';
	options: MultipleChoiceOption[];
};

export type MultipleResponseConfig = {
	type: 'multiple_response';
	options: MultipleResponseOption[];
};

export type VariantConfig = SimpleGuessConfig | MultipleChoiceConfig | MultipleResponseConfig;

// Answer Detail Types
export type AnswerDetail = {
	guess: string;
	isCorrect: boolean;
	variantType: VariantType;
	selectedOptionId?: string; // For multiple_choice
	selectedOptionIds?: string[]; // For multiple_response
};

export type AnswersPayload = Record<string, AnswerDetail>;
