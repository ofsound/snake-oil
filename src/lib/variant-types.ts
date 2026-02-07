// Shared variant types - accessible from both client and server

// Variant Types - extensible for future variants
export const VARIANT_TYPES = [
	'simple_guess',
	'multiple_choice',
	'multiple_response',
	'sequence',
	'rank',
	'image_choice'
] as const;
export type VariantType = (typeof VARIANT_TYPES)[number];

export const VARIANT_LABELS: Record<VariantType, string> = {
	simple_guess: 'Simple Guess',
	multiple_choice: 'Multiple Choice',
	multiple_response: 'Multiple Response',
	sequence: 'Audio Sequence',
	rank: 'Audio Ranking',
	image_choice: 'Image Choice'
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

export type ImageChoiceOption = {
	id: string;
	imageUrl: string;
	pathname: string;
	label: string;
	isCorrect: boolean;
};

export type SimpleGuessConfig = {
	type: 'simple_guess';
	correctAnswer: string;
};

export type MultipleChoiceConfig = {
	type: 'multiple_choice';
	options: MultipleChoiceOption[];
	questionTimeLimit?: number; // Optional per-question timer in seconds (for speed runs)
};

export type MultipleResponseConfig = {
	type: 'multiple_response';
	options: MultipleResponseOption[];
};

export type ImageChoiceConfig = {
	type: 'image_choice';
	options: ImageChoiceOption[];
};

export type SequenceTrack = {
	id: string;
	name: string;
	url: string;
};

export type SequenceConfig = {
	type: 'sequence';
	tracks: SequenceTrack[];
	correctTrackIndex: number;
	prompt: string;
};

// Rank variant types
export type RankItem = {
	id: string;
	name: string;
	url: string;
};

export type RankConfig = {
	type: 'rank';
	items: RankItem[];
	correctOrder: number[];
	prompt: string;
};

export type VariantConfig =
	| SimpleGuessConfig
	| MultipleChoiceConfig
	| MultipleResponseConfig
	| ImageChoiceConfig
	| SequenceConfig
	| RankConfig;

// Answer Detail Types
export type AnswerDetail = {
	guess: string;
	isCorrect: boolean;
	variantType: VariantType;
	selectedOptionId?: string; // For multiple_choice
	selectedOptionIds?: string[]; // For multiple_response
	selectedTrackIndex?: number; // For sequence
	userOrder?: number[]; // For rank - user's final order as array of item indices
};

export type AnswersPayload = Record<string, AnswerDetail>;

import { z } from 'zod';

// Zod schemas for runtime validation (shared between client and server)

export const MultipleChoiceOptionSchema = z.object({
	id: z.string(),
	text: z.string(),
	isCorrect: z.boolean()
});

export const MultipleResponseOptionSchema = z.object({
	id: z.string(),
	text: z.string(),
	isCorrect: z.boolean()
});

export const ImageChoiceOptionSchema = z.object({
	id: z.string(),
	imageUrl: z.string(),
	pathname: z.string(),
	label: z.string(),
	isCorrect: z.boolean()
});

export const SequenceTrackSchema = z.object({
	id: z.string(),
	name: z.string(),
	url: z.string()
});

export const RankItemSchema = z.object({
	id: z.string(),
	name: z.string(),
	url: z.string()
});

export const SimpleGuessConfigSchema = z.object({
	type: z.literal('simple_guess'),
	correctAnswer: z.string()
});

export const MultipleChoiceConfigSchema = z.object({
	type: z.literal('multiple_choice'),
	options: z.array(MultipleChoiceOptionSchema),
	questionTimeLimit: z.number().optional()
});

export const MultipleResponseConfigSchema = z.object({
	type: z.literal('multiple_response'),
	options: z.array(MultipleResponseOptionSchema)
});

export const ImageChoiceConfigSchema = z.object({
	type: z.literal('image_choice'),
	options: z.array(ImageChoiceOptionSchema)
});

export const SequenceConfigSchema = z.object({
	type: z.literal('sequence'),
	tracks: z.array(SequenceTrackSchema),
	correctTrackIndex: z.number(),
	prompt: z.string()
});

export const RankConfigSchema = z.object({
	type: z.literal('rank'),
	items: z.array(RankItemSchema),
	correctOrder: z.array(z.number()),
	prompt: z.string()
});

export const VariantConfigSchema = z.discriminatedUnion('type', [
	SimpleGuessConfigSchema,
	MultipleChoiceConfigSchema,
	MultipleResponseConfigSchema,
	ImageChoiceConfigSchema,
	SequenceConfigSchema,
	RankConfigSchema
]);

// Type guards using Zod for runtime validation
export function isRankConfig(value: unknown): value is RankConfig {
	return RankConfigSchema.safeParse(value).success;
}

export function isImageChoiceConfig(value: unknown): value is ImageChoiceConfig {
	return ImageChoiceConfigSchema.safeParse(value).success;
}

export function isMultipleResponseConfig(value: unknown): value is MultipleResponseConfig {
	return MultipleResponseConfigSchema.safeParse(value).success;
}

export function isMultipleChoiceConfig(value: unknown): value is MultipleChoiceConfig {
	return MultipleChoiceConfigSchema.safeParse(value).success;
}

export function validateVariantConfig(value: unknown): value is VariantConfig {
	return VariantConfigSchema.safeParse(value).success;
}
