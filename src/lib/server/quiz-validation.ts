import type { VariantConfig } from './db/schema';
import { validateVariantConfig } from './variant-utils';
import { validateFiles, getSoundbiteValues } from './quiz-utils';

export interface ValidationInput {
	title: string;
	description: string;
	quizMode: 'standard' | 'speed_run';
	files: File[];
	questions: (string | null)[];
	variantTypes: string[];
	variantConfigs: (VariantConfig | null)[];
}

export interface ValidationResult {
	valid: boolean;
	error?: { message: string };
}

export function validateQuizInput(input: ValidationInput): ValidationResult {
	const { title, description, quizMode, files, variantTypes, variantConfigs } = input;

	// Basic field validation
	if (!title) {
		return { valid: false, error: { message: 'Title is required.' } };
	}

	if (!description) {
		return { valid: false, error: { message: 'Description is required.' } };
	}

	if (title.length > 200) {
		return { valid: false, error: { message: 'Title must be 200 characters or less.' } };
	}

	if (description.length > 2000) {
		return { valid: false, error: { message: 'Description must be 2000 characters or less.' } };
	}

	// Check if we have any non-sequence and non-rank soundbites that require files
	const hasSimpleSoundbites = variantTypes.some((type) => type !== 'sequence' && type !== 'rank');

	if (hasSimpleSoundbites) {
		const fileError = validateFiles(files, true);
		if (fileError) {
			return { valid: false, error: { message: fileError } };
		}
	}

	// Ensure we have at least one soundbite
	if (variantTypes.length === 0) {
		return { valid: false, error: { message: 'At least one SoundBite is required.' } };
	}

	if (variantConfigs.length !== variantTypes.length) {
		return { valid: false, error: { message: 'Each SoundBite needs variant configuration.' } };
	}

	// Count how many simple soundbites we have (these need single files)
	const simpleSoundbiteCount = variantTypes.filter(
		(type) => type !== 'sequence' && type !== 'rank'
	).length;

	if (files.length !== simpleSoundbiteCount) {
		return { valid: false, error: { message: 'Each SoundBite needs an MP3 file.' } };
	}

	// Validate simple variant configs
	for (let i = 0; i < variantConfigs.length; i++) {
		const config = variantConfigs[i];
		if (!config) {
			return {
				valid: false,
				error: { message: `Missing configuration for SoundBite ${i + 1}.` }
			};
		}
		// Skip sequence, rank, and image_choice validation - will validate after file upload
		if (
			config.type !== 'sequence' &&
			config.type !== 'rank' &&
			config.type !== 'image_choice' &&
			!validateVariantConfig(config)
		) {
			return {
				valid: false,
				error: { message: `Invalid configuration for SoundBite ${i + 1}.` }
			};
		}
	}

	// For speed run mode, ensure all questions are multiple_choice
	if (quizMode === 'speed_run') {
		const nonMultipleChoice = variantTypes.filter((type) => type !== 'multiple_choice');
		if (nonMultipleChoice.length > 0) {
			return {
				valid: false,
				error: {
					message: `Speed Run mode only supports Multiple Choice questions. Found ${nonMultipleChoice.length} unsupported question type(s).`
				}
			};
		}
	}

	return { valid: true };
}

export function extractFormData(formData: FormData): ValidationInput {
	const title = String(formData.get('title') ?? '').trim();
	const description = String(formData.get('description') ?? '').trim();
	const quizMode = String(formData.get('quizMode') ?? 'standard') as 'standard' | 'speed_run';
	const { files, questions, variantTypes, variantConfigs } = getSoundbiteValues(formData);

	return {
		title,
		description,
		quizMode,
		files,
		questions,
		variantTypes,
		variantConfigs
	};
}
