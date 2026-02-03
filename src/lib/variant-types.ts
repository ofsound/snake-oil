// Shared variant types - accessible from both client and server

// Variant Types - extensible for future variants
export const VARIANT_TYPES = ['simple_guess', 'multiple_choice'] as const;
export type VariantType = (typeof VARIANT_TYPES)[number];

export const VARIANT_LABELS: Record<VariantType, string> = {
	simple_guess: 'Simple Guess',
	multiple_choice: 'Multiple Choice'
};

// Variant Config Types
export type MultipleChoiceOption = {
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

export type VariantConfig = SimpleGuessConfig | MultipleChoiceConfig;

// Answer Detail Types
export type AnswerDetail = {
	guess: string;
	isCorrect: boolean;
	variantType: VariantType;
	selectedOptionId?: string; // For multiple_choice
};

export type AnswersPayload = Record<string, AnswerDetail>;
