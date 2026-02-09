import { eq, and } from 'drizzle-orm';

import { slugify } from '$lib/utils';
import type { VariantConfig, VariantType, ImageChoiceConfig } from '$lib/variant-types';

import { db, type Db } from './db/index.js';
import { quizzes, soundbites, tracks } from './db/schema.js';
import { findUniqueSlug } from './db/slug-utils.js';
import {
	processSequenceVariant,
	processRankVariant,
	processMultipleMatchVariant,
	processImageChoiceVariant,
	processSimpleVariant,
	isError,
	type ProcessingOutcome
} from './soundbite-processors.js';
import { parseQuizFormData, isSoundbiteRemoved, isNewSoundbite } from './form-parser.js';
import { uploadToBlob, deleteFromBlob } from './quiz-utils.js';
import { processQuizTags, handleVisibilityChange } from './tag-processor.js';
import { createOrUpdateSpeedRunConfig } from './speedrun-processor.js';
import type { SoundbiteFormData } from './form-parser.js';

interface ProcessQuizOptions {
	formData: FormData;
	userId: string;
	blobToken: string;
	quizId?: string;
}

export interface ProcessQuizResult {
	success: boolean;
	quizId?: string;
	slug?: string;
	speedRunSlug?: string;
	error?: string;
}

export interface CreateQuizInput {
	request: Request;
	userId: string;
	blobToken: string;
}
export type CreateQuizResult = ProcessQuizResult;

/**
 * Tracks created resources for cleanup on failure
 */
class ResourceTracker {
	private quizId?: string;
	private soundbiteIds: string[] = [];
	private trackIds: string[] = [];
	private uploadedBlobs: string[] = [];
	private blobToken: string;

	constructor(blobToken: string) {
		this.blobToken = blobToken;
	}

	trackQuiz(id: string) {
		this.quizId = id;
	}

	trackSoundbite(id: string) {
		this.soundbiteIds.push(id);
	}

	trackTrack(id: string) {
		this.trackIds.push(id);
	}

	trackBlob(pathname: string) {
		this.uploadedBlobs.push(pathname);
	}

	async cleanup(db: Db) {
		// Delete soundbites
		for (const id of this.soundbiteIds) {
			try {
				await db.delete(soundbites).where(eq(soundbites.id, id));
			} catch {
				// Ignore cleanup errors
			}
		}

		// Delete tracks
		for (const id of this.trackIds) {
			try {
				await db.delete(tracks).where(eq(tracks.id, id));
			} catch {
				// Ignore cleanup errors
			}
		}

		// Delete quiz (only for create mode)
		if (this.quizId) {
			try {
				await db.delete(quizzes).where(eq(quizzes.id, this.quizId));
			} catch {
				// Ignore cleanup errors
			}
		}

		// Delete uploaded blobs
		for (const pathname of this.uploadedBlobs) {
			try {
				await deleteFromBlob(pathname, this.blobToken);
			} catch {
				// Ignore cleanup errors
			}
		}
	}
}

/**
 * Unified quiz processor - handles both create and edit operations
 * REFACTORED: Tag and speed run logic extracted to separate processors
 */
export async function processQuizSubmission(
	options: ProcessQuizOptions
): Promise<ProcessQuizResult> {
	const { formData, userId, blobToken, quizId } = options;

	// Parse and validate form data with Zod
	const parseResult = parseQuizFormData(formData);

	if (!parseResult.success) {
		return {
			success: false,
			error: `Validation failed: ${parseResult.errors.map((e) => `${e.field}: ${e.message}`).join(', ')}`
		};
	}

	const data = parseResult.data;
	const tracker = new ResourceTracker(blobToken);

	try {
		let quizIdToUse: string;
		let finalSlug: string;
		let wasPublic = false;

		if (quizId) {
			// EDIT MODE: Update existing quiz
			const existingQuiz = await db.query.quizzes.findFirst({
				where: and(eq(quizzes.id, quizId), eq(quizzes.creatorId, userId)),
				columns: { id: true, visibility: true }
			});

			if (!existingQuiz) {
				return { success: false, error: 'Quiz not found or access denied' };
			}

			wasPublic = existingQuiz.visibility === 'public';

			// Handle visibility change before updating quiz
			await handleVisibilityChange({
				db,
				quizId,
				oldVisibility: existingQuiz.visibility as 'public' | 'private' | 'unlisted',
				newVisibility: data.visibility as 'public' | 'private' | 'unlisted'
			});

			// Find unique slug excluding current quiz
			finalSlug = await findUniqueSlug(data.slug, userId, quizId);
			await db
				.update(quizzes)
				.set({
					title: data.title,
					slug: finalSlug,
					description: data.description,
					visibility: data.visibility
				})
				.where(eq(quizzes.id, quizId));

			quizIdToUse = quizId;

			// Process existing soundbites
			await processExistingSoundbites(db, data.soundbites, quizIdToUse, blobToken, tracker);
		} else {
			// CREATE MODE: Insert new quiz
			const baseSlug = slugify(data.slug || data.title);
			finalSlug = await findUniqueSlug(baseSlug, userId);

			const [quiz] = await db
				.insert(quizzes)
				.values({
					creatorId: userId,
					title: data.title,
					slug: finalSlug,
					description: data.description,
					visibility: data.visibility
				})
				.returning({ id: quizzes.id, slug: quizzes.slug });

			quizIdToUse = quiz.id;
			tracker.trackQuiz(quizIdToUse);
		}

		// Process all soundbites
		await processAllSoundbites(db, data.soundbites, quizIdToUse, blobToken, tracker);

		// Handle speed run config if applicable
		if (data.quizMode === 'speed_run' && data.speedRunConfig) {
			const speedRunResult = await createOrUpdateSpeedRunConfig(
				db,
				quizIdToUse,
				data.speedRunConfig
			);

			if (!speedRunResult.success) {
				throw new Error(speedRunResult.error || 'Failed to save speed run configuration');
			}
		}

		// Handle tags using the new tag processor
		if (data.tags && data.tags.length > 0) {
			const tagResult = await processQuizTags({
				db,
				quizId: quizIdToUse,
				newTagIds: data.tags,
				visibility: data.visibility as 'public' | 'private' | 'unlisted',
				wasPublic
			});

			if (!tagResult.success) {
				throw new Error(tagResult.error || 'Failed to process tags');
			}
		} else if (quizId) {
			// All tags removed - process empty tag set
			const tagResult = await processQuizTags({
				db,
				quizId: quizIdToUse,
				newTagIds: [],
				visibility: data.visibility as 'public' | 'private' | 'unlisted',
				wasPublic
			});

			if (!tagResult.success) {
				throw new Error(tagResult.error || 'Failed to process tags');
			}
		}

		return {
			success: true,
			quizId: quizIdToUse,
			slug: finalSlug,
			speedRunSlug: data.quizMode === 'speed_run' ? finalSlug : undefined
		};
	} catch (error) {
		// Cleanup everything on any failure
		await tracker.cleanup(db);

		console.error('[Process Quiz] Error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to save quiz.';
		return { success: false, error: errorMessage };
	}
}

/**
 * Process existing soundbites during edit
 */
async function processExistingSoundbites(
	db: Db,
	soundbiteData: SoundbiteFormData[],
	quizId: string,
	blobToken: string,
	tracker: ResourceTracker
): Promise<void> {
	for (const soundbite of soundbiteData) {
		// Skip new soundbites
		if (isNewSoundbite(soundbite)) {
			continue;
		}

		const id = soundbite.id!;

		// Handle removed soundbites
		if (isSoundbiteRemoved(soundbite)) {
			// Get track info for potential cleanup
			const existingSoundbite = await db.query.soundbites.findFirst({
				where: eq(soundbites.id, id),
				with: { track: true }
			});

			if (existingSoundbite?.track?.pathname) {
				tracker.trackBlob(existingSoundbite.track.pathname);
			}

			await db.delete(soundbites).where(eq(soundbites.id, id));
			continue;
		}

		let trackId: string | undefined;

		// Handle file upload for non-sequence/rank/multiple_match variants
		if (
			soundbite.variantType !== 'sequence' &&
			soundbite.variantType !== 'rank' &&
			soundbite.variantType !== 'multiple_match'
		) {
			if (soundbite.file && soundbite.file.size > 0) {
				const blob = await uploadToBlob(soundbite.file, blobToken);
				tracker.trackBlob(blob.pathname);

				const [track] = await db
					.insert(tracks)
					.values({
						name: soundbite.file.name,
						url: blob.url,
						pathname: blob.pathname
					})
					.returning({ id: tracks.id });
				trackId = track.id;
				tracker.trackTrack(track.id);
			}
		}

		// Handle image uploads for image_choice variant
		let variantConfig = soundbite.variantConfig;
		if (
			soundbite.variantType === 'image_choice' &&
			soundbite.imageFiles &&
			soundbite.imageFiles.length > 0
		) {
			const config = variantConfig as ImageChoiceConfig;
			const uploadedOptions = [];

			for (let i = 0; i < config.options.length; i++) {
				const option = config.options[i];
				const file = soundbite.imageFiles[i];

				// If there's a new file, upload it
				if (file && file.size > 0) {
					const blob = await uploadToBlob(file, blobToken);
					tracker.trackBlob(blob.pathname);
					uploadedOptions.push({
						id: option.id,
						imageUrl: blob.url,
						pathname: blob.pathname,
						label: option.label,
						isCorrect: option.isCorrect
					});
				} else {
					// Keep existing option
					uploadedOptions.push(option);
				}
			}

			variantConfig = {
				...config,
				options: uploadedOptions
			};
		}

		// Update soundbite
		const updateData: {
			prompt: string | undefined;
			variantType: VariantType;
			variantConfig: VariantConfig;
			trackId?: string;
		} = {
			prompt: soundbite.prompt,
			variantType: soundbite.variantType,
			variantConfig
		};

		if (trackId) {
			updateData.trackId = trackId;
		}

		await db.update(soundbites).set(updateData).where(eq(soundbites.id, id));
	}
}

/**
 * Process all soundbites (new ones that need full processing)
 */
async function processAllSoundbites(
	db: Db,
	soundbiteData: SoundbiteFormData[],
	quizId: string,
	blobToken: string,
	tracker: ResourceTracker
): Promise<void> {
	// Get current max position
	const existingSoundbiteList = await db.query.soundbites.findMany({
		where: eq(soundbites.quizId, quizId),
		orderBy: (sb, { desc }) => [desc(sb.position)],
		limit: 1
	});
	const currentMaxPosition =
		existingSoundbiteList.length > 0 ? existingSoundbiteList[0].position : -1;

	// Filter to only new soundbites that need processing
	const newSoundbiteList = soundbiteData.filter((sb) => isNewSoundbite(sb));

	let position = currentMaxPosition + 1;

	for (const soundbite of newSoundbiteList) {
		// Create processing context with all necessary files
		const processingFormData = new FormData();

		// Add sequence files if present
		if (soundbite.sequenceFiles && soundbite.sequenceFiles.length > 0) {
			soundbite.sequenceFiles.forEach((file) => {
				processingFormData.append(`sequenceFiles-${position}`, file);
			});
		}

		// Add rank files if present
		if (soundbite.rankFiles && soundbite.rankFiles.length > 0) {
			soundbite.rankFiles.forEach((file) => {
				processingFormData.append(`rankFiles-${position}`, file);
			});
		}

		// Add multiple match files if present
		if (soundbite.multipleMatchFiles && soundbite.multipleMatchFiles.length > 0) {
			soundbite.multipleMatchFiles.forEach((file) => {
				processingFormData.append(`multipleMatchFiles-${position}`, file);
			});
		}

		// Add image choice files if present
		if (soundbite.imageFiles && soundbite.imageFiles.length > 0) {
			soundbite.imageFiles.forEach((file) => {
				processingFormData.append(`imageChoiceFiles-${position}`, file);
			});
		}

		const context = {
			formData: processingFormData,
			blobToken,
			soundbiteIndex: position,
			fileIndex: 0,
			files: soundbite.file ? [soundbite.file] : []
		};

		// Process the variant with proper type narrowing
		let outcome: ProcessingOutcome;

		if (soundbite.variantType === 'sequence') {
			outcome = await processSequenceVariant(
				soundbite.variantConfig as Extract<typeof soundbite.variantConfig, { type: 'sequence' }>,
				context
			);
		} else if (soundbite.variantType === 'rank') {
			outcome = await processRankVariant(
				soundbite.variantConfig as Extract<typeof soundbite.variantConfig, { type: 'rank' }>,
				context
			);
		} else if (soundbite.variantType === 'multiple_match') {
			outcome = await processMultipleMatchVariant(
				soundbite.variantConfig as Extract<
					typeof soundbite.variantConfig,
					{ type: 'multiple_match' }
				>,
				context
			);
		} else if (soundbite.variantType === 'image_choice') {
			outcome = await processImageChoiceVariant(
				soundbite.variantConfig as Extract<
					typeof soundbite.variantConfig,
					{ type: 'image_choice' }
				>,
				context
			);
		} else {
			outcome = await processSimpleVariant(soundbite.variantConfig, context);
		}

		if (isError(outcome)) {
			throw new Error(outcome.message);
		}

		const { trackId, updatedConfig } = outcome;

		// Track created resources
		if (trackId) {
			tracker.trackTrack(trackId);
		}

		// Track uploaded blobs for cleanup on failure
		if (soundbite.variantType === 'image_choice') {
			const config = updatedConfig as { options: Array<{ pathname?: string }> };
			for (const option of config.options) {
				if (option.pathname) {
					tracker.trackBlob(option.pathname);
				}
			}
		}

		// Create soundbite record
		const [newSoundbiteRecord] = await db
			.insert(soundbites)
			.values({
				quizId,
				trackId,
				position,
				prompt: soundbite.prompt ?? null,
				variantType: soundbite.variantType,
				variantConfig: updatedConfig
			})
			.returning({ id: soundbites.id });

		tracker.trackSoundbite(newSoundbiteRecord.id);
		position++;
	}
}
