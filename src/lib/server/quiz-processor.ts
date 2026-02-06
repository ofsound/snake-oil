import { db } from './db';
import { quizzes, soundbites, tracks, speedRuns } from './db/schema';
import { eq, and } from 'drizzle-orm';
import { findUniqueSlug, generateUniqueSlug } from './db/slug-utils';
import { slugify } from '$lib/utils';
import {
	processSequenceVariant,
	processRankVariant,
	processImageChoiceVariant,
	processSimpleVariant,
	isError,
	type ProcessingContext
} from './soundbite-processors';
import type { VariantConfig } from './db/schema';
import { uploadToBlob, deleteFromBlob } from './quiz-utils';

export interface ProcessQuizOptions {
	formData: FormData;
	userId: string;
	blobToken: string;
	quizId?: string; // If provided, we're editing
	existingSoundbiteIds?: string[]; // For edit: which soundbites exist
}

export interface ProcessQuizResult {
	success: boolean;
	quizId?: string;
	slug?: string;
	speedRunSlug?: string;
	error?: string;
}

// Backward compatibility exports
export interface CreateQuizInput {
	request: Request;
	userId: string;
	blobToken: string;
}
export type CreateQuizResult = ProcessQuizResult;

/**
 * Tracks created resources for cleanup on failure
 * (Neon HTTP driver doesn't support transactions, so we do manual rollback)
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

	async cleanup() {
		console.log('[Resource Cleanup] Starting cleanup due to error...');

		// Delete soundbites
		for (const id of this.soundbiteIds) {
			try {
				await db.delete(soundbites).where(eq(soundbites.id, id));
				console.log(`[Resource Cleanup] Deleted soundbite: ${id}`);
			} catch (err) {
				console.error(`[Resource Cleanup] Failed to delete soundbite ${id}:`, err);
			}
		}

		// Delete tracks
		for (const id of this.trackIds) {
			try {
				await db.delete(tracks).where(eq(tracks.id, id));
				console.log(`[Resource Cleanup] Deleted track: ${id}`);
			} catch (err) {
				console.error(`[Resource Cleanup] Failed to delete track ${id}:`, err);
			}
		}

		// Delete quiz (only for create mode)
		if (this.quizId) {
			try {
				await db.delete(quizzes).where(eq(quizzes.id, this.quizId));
				console.log(`[Resource Cleanup] Deleted quiz: ${this.quizId}`);
			} catch (err) {
				console.error(`[Resource Cleanup] Failed to delete quiz ${this.quizId}:`, err);
			}
		}

		// Delete uploaded blobs
		for (const pathname of this.uploadedBlobs) {
			try {
				await deleteFromBlob(pathname, this.blobToken);
				console.log(`[Resource Cleanup] Deleted blob: ${pathname}`);
			} catch (err) {
				console.error(`[Resource Cleanup] Failed to delete blob ${pathname}:`, err);
			}
		}

		console.log('[Resource Cleanup] Cleanup complete');
	}
}

/**
 * Unified quiz processor - handles both create and edit operations
 * Note: Neon HTTP driver doesn't support transactions, so we implement manual rollback
 * - If one soundbite fails, we manually delete everything that was created
 * - Cleans up uploaded blobs on failure
 */
export async function processQuizSubmission(
	options: ProcessQuizOptions
): Promise<ProcessQuizResult> {
	const { formData, userId, blobToken, quizId } = options;
	const tracker = new ResourceTracker(blobToken);

	// Extract basic fields
	const title = String(formData.get('title') ?? '').trim();
	const description = String(formData.get('description') ?? '').trim();
	const rawSlug = String(formData.get('slug') ?? '').trim();
	const quizMode = String(formData.get('quizMode') ?? 'standard') as 'standard' | 'speed_run';
	const speedRunConfigJson = String(formData.get('speedRunConfig') ?? '{}');
	const visibility = String(formData.get('visibility') ?? 'public') as 'public' | 'unlisted';
	const baseSlug = slugify(rawSlug || title);

	if (!title || !description) {
		return { success: false, error: 'Title and description are required.' };
	}

	try {
		let quizIdToUse: string;
		let finalSlug: string;

		if (quizId) {
			// EDIT MODE: Update existing quiz
			const existingQuiz = await db.query.quizzes.findFirst({
				where: and(eq(quizzes.id, quizId), eq(quizzes.ownerId, userId)),
				columns: { id: true }
			});

			if (!existingQuiz) {
				return { success: false, error: 'Quiz not found or access denied' };
			}

			// Find unique slug excluding current quiz (unique per owner)
			finalSlug = await findUniqueSlug(baseSlug, userId, quizId);
			await db
				.update(quizzes)
				.set({ title, slug: finalSlug, description, visibility })
				.where(eq(quizzes.id, quizId));

			quizIdToUse = quizId;

			// Process existing soundbites
			await processExistingSoundbites(db, formData, quizIdToUse, blobToken, tracker);
		} else {
			// CREATE MODE: Insert new quiz
			const result = await generateUniqueSlug(baseSlug, async (candidateSlug) => {
				const [quiz] = await db
					.insert(quizzes)
					.values({
						ownerId: userId,
						title,
						slug: candidateSlug,
						description,
						visibility
					})
					.returning({ id: quizzes.id, slug: quizzes.slug });
				return quiz;
			});

			quizIdToUse = result.id;
			finalSlug = result.slug;
			tracker.trackQuiz(quizIdToUse);
		}

		// Process new soundbites (for both create and edit)
		await processNewSoundbites(db, formData, quizIdToUse, blobToken, tracker);

		// Handle speed run config if applicable
		if (quizMode === 'speed_run') {
			await createOrUpdateSpeedRunConfig(db, quizIdToUse, speedRunConfigJson);
		}

		return {
			success: true,
			quizId: quizIdToUse,
			slug: finalSlug,
			speedRunSlug: quizMode === 'speed_run' ? finalSlug : undefined
		};
	} catch (error) {
		// Cleanup everything on any failure
		await tracker.cleanup();

		console.error('[Process Quiz] Error:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to save quiz.';
		return { success: false, error: errorMessage };
	}
}

/**
 * Process existing soundbites during edit
 */
async function processExistingSoundbites(
	db: any,
	formData: FormData,
	quizId: string,
	blobToken: string,
	tracker: ResourceTracker
): Promise<void> {
	// Extract existing soundbite data from form
	const ids = formData.getAll('existingSoundbiteId').map((v) => String(v));
	const removed = new Set(formData.getAll('existingSoundbiteRemove').map((v) => String(v)));
	const questions = formData
		.getAll('existingSoundbiteQuestion')
		.map((v) => String(v).trim() || null);
	const variantTypes = formData.getAll('existingSoundbiteVariantType').map((v) => String(v));
	const variantConfigs = formData.getAll('existingSoundbiteVariantConfig').map((value) => {
		try {
			return JSON.parse(String(value)) as VariantConfig;
		} catch {
			return null;
		}
	});
	const files = formData.getAll('existingSoundbiteFile') as File[];

	for (let index = 0; index < ids.length; index++) {
		const id = ids[index];

		// Handle removed soundbites
		if (removed.has(id)) {
			// Get track info for potential cleanup
			const soundbite = await db.query.soundbites.findFirst({
				where: eq(soundbites.id, id),
				with: { track: true }
			});

			if (soundbite?.track?.pathname) {
				tracker.trackBlob(soundbite.track.pathname);
			}

			await db.delete(soundbites).where(eq(soundbites.id, id));
			continue;
		}

		const question = questions[index];
		const variantType = variantTypes[index];
		let variantConfig = variantConfigs[index];
		const file = files[index];

		if (!variantConfig) {
			throw new Error(`Invalid configuration for existing SoundBite ${index + 1}`);
		}

		let trackId: string | undefined;

		// Handle file upload for non-sequence/rank variants
		if (variantType !== 'sequence' && variantType !== 'rank') {
			if (file && file.size > 0) {
				const blob = await uploadToBlob(file, blobToken);
				tracker.trackBlob(blob.pathname);

				const [track] = await db
					.insert(tracks)
					.values({
						name: file.name,
						url: blob.url,
						pathname: blob.pathname
					})
					.returning({ id: tracks.id });
				trackId = track.id;
				tracker.trackTrack(track.id);
			}
		}

		// Update soundbite
		const updateData: any = {
			question,
			variantType: variantType as any,
			variantConfig
		};
		if (trackId) {
			updateData.trackId = trackId;
		}

		await db.update(soundbites).set(updateData).where(eq(soundbites.id, id));
	}
}

/**
 * Process new soundbites (for both create and edit)
 */
async function processNewSoundbites(
	db: any,
	formData: FormData,
	quizId: string,
	blobToken: string,
	tracker: ResourceTracker
): Promise<void> {
	// Extract new soundbite data
	// Try 'newSoundbite' prefix first (edit page), then 'soundbite' prefix (create page)
	const questions = (
		formData.getAll('newSoundbiteQuestion').length > 0
			? formData.getAll('newSoundbiteQuestion')
			: formData.getAll('soundbiteQuestion')
	).map((v) => String(v).trim() || null);

	const variantTypes = (
		formData.getAll('newSoundbiteVariantType').length > 0
			? formData.getAll('newSoundbiteVariantType')
			: formData.getAll('soundbiteVariantType')
	).map((v) => String(v));

	const variantConfigs = (
		formData.getAll('newSoundbiteVariantConfig').length > 0
			? formData.getAll('newSoundbiteVariantConfig')
			: formData.getAll('soundbiteVariantConfig')
	).map((value) => {
		try {
			return JSON.parse(String(value)) as VariantConfig;
		} catch {
			return null;
		}
	});

	const files = (
		formData.getAll('newSoundbiteFile').length > 0
			? formData.getAll('newSoundbiteFile')
			: formData.getAll('soundbiteFile')
	) as File[];

	if (variantTypes.length === 0) {
		return; // No new soundbites to process
	}

	// Get current max position
	const existingSoundbites = await db.query.soundbites.findMany({
		where: eq(soundbites.quizId, quizId),
		orderBy: (soundbites: any, { desc }: any) => [desc(soundbites.position)],
		limit: 1
	});
	const currentMaxPosition = existingSoundbites.length > 0 ? existingSoundbites[0].position : -1;

	let fileIndex = 0;

	for (let index = 0; index < variantTypes.length; index++) {
		const question = questions[index];
		const variantType = variantTypes[index];
		const variantConfig = variantConfigs[index];

		if (!variantConfig) {
			throw new Error(`Invalid configuration for new SoundBite ${index + 1}`);
		}

		const context: ProcessingContext = {
			formData,
			blobToken,
			soundbiteIndex: index,
			fileIndex,
			files
		};

		// Process the variant
		const outcome = await processVariant(variantType, variantConfig, context);

		if (isError(outcome)) {
			throw new Error(outcome.message);
		}

		const { trackId, updatedConfig, newFileIndex } = outcome;
		fileIndex = newFileIndex;

		// Track created resources
		if (trackId) {
			tracker.trackTrack(trackId);
		}

		// Track uploaded blobs for cleanup on failure
		if (variantType === 'image_choice') {
			const config = updatedConfig as any;
			for (const option of config.options) {
				if (option.pathname) {
					tracker.trackBlob(option.pathname);
				}
			}
		}

		// Create soundbite record
		const [soundbite] = await db
			.insert(soundbites)
			.values({
				quizId,
				trackId,
				position: currentMaxPosition + index + 1,
				question,
				variantType: variantType as any,
				variantConfig: updatedConfig
			})
			.returning({ id: soundbites.id });

		tracker.trackSoundbite(soundbite.id);
	}
}

/**
 * Process a variant using the existing processors
 */
async function processVariant(
	variantType: string,
	variantConfig: VariantConfig,
	context: ProcessingContext
) {
	switch (variantType) {
		case 'sequence':
			return await processSequenceVariant(variantConfig as any, context);
		case 'rank':
			return await processRankVariant(variantConfig as any, context);
		case 'image_choice':
			return await processImageChoiceVariant(variantConfig as any, context);
		default:
			return await processSimpleVariant(variantConfig, context);
	}
}

/**
 * Create or update speed run configuration
 */
async function createOrUpdateSpeedRunConfig(
	db: any,
	quizId: string,
	configJson: string
): Promise<void> {
	const config = JSON.parse(configJson);

	// Check if speed run config exists
	const existing = await db.query.speedRuns.findFirst({
		where: eq(speedRuns.quizId, quizId)
	});

	if (existing) {
		await db
			.update(speedRuns)
			.set({
				defaultQuestionTimeLimit: config.defaultQuestionTimeLimit || null,
				revealDelayMs: config.revealDelayMs || 3000,
				audioLoopGapMs: config.audioLoopGapMs || 2000,
				enableStreakBonus: config.enableStreakBonus ?? true
			})
			.where(eq(speedRuns.quizId, quizId));
	} else {
		await db.insert(speedRuns).values({
			quizId,
			defaultQuestionTimeLimit: config.defaultQuestionTimeLimit || null,
			revealDelayMs: config.revealDelayMs || 3000,
			audioLoopGapMs: config.audioLoopGapMs || 2000,
			enableStreakBonus: config.enableStreakBonus ?? true
		});
	}
}
