import { fail } from '@sveltejs/kit';
import { db } from './db';
import { quizzes, soundbites, speedRuns } from './db/schema';
import { generateUniqueSlug } from './db/slug-utils';
import { slugify } from '$lib/utils';
import { extractFormData, validateQuizInput } from './quiz-validation';
import {
	processSequenceVariant,
	processRankVariant,
	processImageChoiceVariant,
	processSimpleVariant,
	isError,
	type ProcessingContext
} from './soundbite-processors';
import type {
	SequenceConfig,
	RankConfig,
	ImageChoiceConfig,
	VariantConfig
} from '$lib/variant-types';
import type { RequestEvent } from '@sveltejs/kit';

export interface CreateQuizInput {
	request: Request;
	userId: string;
	blobToken: string;
}

export interface CreateQuizResult {
	success: boolean;
	quizId?: string;
	slug?: string;
	quizMode?: string;
	speedRunSlug?: string | null;
	error?: { message: string };
}

export async function createQuiz(input: CreateQuizInput): Promise<CreateQuizResult> {
	const { request, userId, blobToken } = input;

	const formData = await request.formData();

	// Extract form data
	const validationInput = extractFormData(formData);
	const { title, description, quizMode } = validationInput;
	const { files, questions, variantTypes, variantConfigs } = validationInput;

	// Validate input
	const validation = validateQuizInput(validationInput);
	if (!validation.valid) {
		return { success: false, error: validation.error };
	}

	// Get slug from form data (separate from validation)
	const rawSlug = String(formData.get('slug') ?? '').trim();
	const speedRunConfigJson = String(formData.get('speedRunConfig') ?? '{}');
	const baseSlug = slugify(rawSlug || title);

	try {
		const [quiz] = await generateUniqueSlug(baseSlug, async (candidateSlug) => {
			return await db
				.insert(quizzes)
				.values({
					ownerId: userId,
					title,
					slug: candidateSlug,
					description
				})
				.returning({ id: quizzes.id, slug: quizzes.slug });
		});

		console.log('[Create Quiz] Starting soundbite creation:', {
			quizMode,
			variantTypes,
			filesCount: files.length,
			files: files.map((f) => ({ name: f.name, size: f.size }))
		});

		let fileIndex = 0;
		for (let index = 0; index < variantTypes.length; index += 1) {
			const variantType = variantTypes[index];
			const variantConfig = variantConfigs[index]!;

			console.log(
				`[Create Quiz] Processing SoundBite ${index + 1}: type=${variantType}, fileIndex=${fileIndex}`
			);

			const context: ProcessingContext = {
				formData,
				blobToken,
				soundbiteIndex: index,
				fileIndex,
				files
			};

			// Process the variant and get the result
			const outcome = await processVariant(variantType, variantConfig, context);

			if (isError(outcome)) {
				return { success: false, error: { message: outcome.message } };
			}

			const { trackId, updatedConfig, newFileIndex } = outcome;
			fileIndex = newFileIndex;

			// Create the soundbite record
			await db.insert(soundbites).values({
				quizId: quiz.id,
				trackId,
				position: index,
				question: questions[index],
				variantType: variantType as import('./db/schema').VariantType,
				variantConfig: updatedConfig
			});
		}

		// Create speed run configuration if applicable
		if (quizMode === 'speed_run') {
			await createSpeedRunConfig(quiz.id, speedRunConfigJson);
		}

		return {
			success: true,
			quizId: quiz.id,
			slug: quiz.slug,
			quizMode,
			speedRunSlug: quizMode === 'speed_run' ? quiz.slug : null
		};
	} catch (error) {
		console.error('Error creating quiz:', error);
		const errorMessage =
			error instanceof Error ? error.message : 'Failed to create quiz. Please try again.';
		return { success: false, error: { message: errorMessage } };
	}
}

async function processVariant(
	variantType: string,
	variantConfig: VariantConfig,
	context: ProcessingContext
) {
	switch (variantType) {
		case 'sequence':
			return await processSequenceVariant(variantConfig as SequenceConfig, context);
		case 'rank':
			return await processRankVariant(variantConfig as RankConfig, context);
		case 'image_choice':
			return await processImageChoiceVariant(variantConfig as ImageChoiceConfig, context);
		default:
			return await processSimpleVariant(variantConfig, context);
	}
}

async function createSpeedRunConfig(quizId: string, configJson: string): Promise<void> {
	const speedRunConfig = JSON.parse(configJson);
	await db.insert(speedRuns).values({
		quizId,
		defaultQuestionTimeLimit: speedRunConfig.defaultQuestionTimeLimit || null,
		revealDelayMs: speedRunConfig.revealDelayMs || 3000,
		audioLoopGapMs: speedRunConfig.audioLoopGapMs || 2000,
		enableStreakBonus: speedRunConfig.enableStreakBonus ?? true
	});
}

export function handleCreateQuizResult(result: CreateQuizResult) {
	if (!result.success) {
		return fail(400, { message: result.error?.message || 'An error occurred' });
	}
	return result;
}
