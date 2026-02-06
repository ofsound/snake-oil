import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions, RequestEvent } from './$types';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { quizzes, soundbites, tracks, speedRuns } from '$lib/server/db/schema';
import { slugify } from '$lib/utils';
import { generateUniqueSlug } from '$lib/server/db/slug-utils';
import { validateVariantConfig } from '$lib/server/variant-utils';
import {
	getSoundbiteValues,
	validateFiles,
	uploadToBlob,

} from '$lib/server/quiz-utils';
import type { SequenceConfig, RankConfig, ImageChoiceConfig } from '$lib/variant-types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Check for active user session
	if (!locals.user) {
		// Capture the current URL and pass it to login for redirect after authentication
		const returnUrl = url.pathname + url.search;
		redirect(302, `/login?redirect=${encodeURIComponent(returnUrl)}`);
	}

	// Return empty data for now since the page will be blank
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }: RequestEvent) => {
		const userId = locals.user?.id;
		if (!userId) {
			return fail(401, { message: 'You must be signed in to create a quiz.' });
		}

		if (!env.BLOB_READ_WRITE_TOKEN) {
			return fail(500, { message: 'Blob storage not configured.' });
		}

		const formData = await request.formData();
		const title = String(formData.get('title') ?? '').trim();
		const rawSlug = String(formData.get('slug') ?? '').trim();
		const description = String(formData.get('description') ?? '').trim();
		const quizMode = String(formData.get('quizMode') ?? 'standard') as 'standard' | 'speed_run';
		const speedRunConfigJson = String(formData.get('speedRunConfig') ?? '{}');
		const { files, questions, variantTypes, variantConfigs } = getSoundbiteValues(formData);

		if (!title) {
			return fail(400, { message: 'Title is required.' });
		}

		if (!description) {
			return fail(400, { message: 'Description is required.' });
		}

		if (title.length > 200) {
			return fail(400, { message: 'Title must be 200 characters or less.' });
		}

		if (description.length > 2000) {
			return fail(400, { message: 'Description must be 2000 characters or less.' });
		}

		// Check if we have any non-sequence and non-rank soundbites that require files (image_choice needs MP3 too)
		const hasSimpleSoundbites = variantTypes.some((type) => type !== 'sequence' && type !== 'rank');

		if (hasSimpleSoundbites) {
			const fileError = validateFiles(files, true);
			if (fileError) {
				return fail(400, { message: fileError });
			}
		}

		// Ensure we have at least one soundbite
		if (variantTypes.length === 0) {
			return fail(400, { message: 'At least one SoundBite is required.' });
		}

		if (variantConfigs.length !== variantTypes.length) {
			return fail(400, { message: 'Each SoundBite needs variant configuration.' });
		}

		// Count how many simple soundbites we have (these need single files)
		// image_choice needs an MP3 file like other simple variants
		const simpleSoundbiteCount = variantTypes.filter(
			(type) => type !== 'sequence' && type !== 'rank'
		).length;
		if (files.length !== simpleSoundbiteCount) {
			return fail(400, { message: 'Each SoundBite needs an MP3 file.' });
		}

		// Validate simple variant configs (sequence, rank, and image_choice configs will be validated after file upload)
		for (let i = 0; i < variantConfigs.length; i++) {
			const config = variantConfigs[i];
			if (!config) {
				return fail(400, { message: `Missing configuration for SoundBite ${i + 1}.` });
			}
			// Skip sequence, rank, and image_choice validation for now - will validate after file upload
			if (
				config.type !== 'sequence' &&
				config.type !== 'rank' &&
				config.type !== 'image_choice' &&
				!validateVariantConfig(config)
			) {
				return fail(400, { message: `Invalid configuration for SoundBite ${i + 1}.` });
			}
		}

		// For speed run mode, ensure all questions are multiple_choice
		if (quizMode === 'speed_run') {
			const nonMultipleChoice = variantTypes.filter((type) => type !== 'multiple_choice');
			if (nonMultipleChoice.length > 0) {
				return fail(400, {
					message: `Speed Run mode only supports Multiple Choice questions. Found ${nonMultipleChoice.length} unsupported question type(s).`
				});
			}
		}

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
				let variantConfig = variantConfigs[index]!;
				let trackId: string;

				console.log(
					`[Create Quiz] Processing SoundBite ${index + 1}: type=${variantType}, fileIndex=${fileIndex}`
				);

				if (variantType === 'sequence') {
					// For sequence variants, upload the sequence files
					const config = variantConfig as SequenceConfig;
					const uploadedTracks = [];

					// Get sequence files from form data
					const sequenceFiles = formData.getAll(`sequenceFiles-${index}`) as File[];
					console.log(
						`[Create Quiz] SoundBite ${index + 1} (sequence): Found ${sequenceFiles.length} files, expected ${config.tracks.length} tracks`
					);

					for (let trackIndex = 0; trackIndex < config.tracks.length; trackIndex++) {
						const track = config.tracks[trackIndex];
						const file = sequenceFiles[trackIndex];

						if (file && file.size > 0) {
							// Upload to Vercel Blob
							const blob = await uploadToBlob(file, env.BLOB_READ_WRITE_TOKEN);
							uploadedTracks.push({
								id: track.id,
								name: track.name,
								url: blob.url
							});
						} else {
							// If no file provided, keep the original URL (might be an edit)
							uploadedTracks.push(track);
						}
					}

					// Update config with permanent URLs
					variantConfig = {
						...config,
						tracks: uploadedTracks
					};

					// Validate the updated sequence config
					if (!validateVariantConfig(variantConfig)) {
						console.error(
							`[Create Quiz] Sequence validation failed for SoundBite ${index + 1}:`,
							variantConfig
						);
						return fail(400, {
							message: `Invalid configuration for SoundBite ${index + 1}. Please ensure all sequence files were uploaded successfully.`
						});
					}

					// Create a placeholder track for the soundbite
					const [track] = await db
						.insert(tracks)
						.values({
							name: `Sequence ${index + 1}`,
							url: '',
							pathname: null
						})
						.returning({ id: tracks.id });
					trackId = track.id;
				} else if (variantType === 'rank') {
					// For rank variants, upload the rank files
					const config = variantConfig as RankConfig;
					const uploadedItems = [];

					// Get rank files from form data
					const rankFiles = formData.getAll(`rankFiles-${index}`) as File[];
					console.log(
						`[Create Quiz] SoundBite ${index + 1} (rank): Found ${rankFiles.length} files, expected ${config.items.length} items`
					);

					for (let itemIndex = 0; itemIndex < config.items.length; itemIndex++) {
						const item = config.items[itemIndex];
						const file = rankFiles[itemIndex];

						if (file && file.size > 0) {
							// Upload to Vercel Blob
							const blob = await uploadToBlob(file, env.BLOB_READ_WRITE_TOKEN);
							uploadedItems.push({
								id: item.id,
								name: item.name,
								url: blob.url
							});
						} else {
							// If no file provided, keep the original URL
							uploadedItems.push(item);
						}
					}

					// Update config with permanent URLs
					variantConfig = {
						...config,
						items: uploadedItems
					};

					// Validate the updated rank config
					if (!validateVariantConfig(variantConfig)) {
						console.error(
							`[Create Quiz] Rank validation failed for SoundBite ${index + 1}:`,
							variantConfig
						);
						return fail(400, {
							message: `Invalid configuration for SoundBite ${index + 1}. Please ensure all rank files were uploaded successfully.`
						});
					}

					// Create a placeholder track for the soundbite
					const [track] = await db
						.insert(tracks)
						.values({
							name: `Rank ${index + 1}`,
							url: '',
							pathname: null
						})
						.returning({ id: tracks.id });
					trackId = track.id;
				} else if (variantType === 'image_choice') {
					// For image_choice variants, upload the MP3 file first
					console.log(
						`[Create Quiz] image_choice: Getting MP3 file at index ${fileIndex}, files.length=${files.length}`
					);
					const file = files[fileIndex];
					fileIndex += 1;

					console.log(
						`[Create Quiz] image_choice: mp3file=${file ? file.name : 'undefined'}, size=${file ? file.size : 0}`
					);

					if (!file || file.size === 0) {
						return fail(400, { message: `SoundBite ${index + 1} is missing an MP3 file.` });
					}

					const blob = await uploadToBlob(file, env.BLOB_READ_WRITE_TOKEN);

					const [track] = await db
						.insert(tracks)
						.values({
							name: file.name,
							url: blob.url,
							pathname: blob.pathname
						})
						.returning({ id: tracks.id });
					trackId = track.id;

					// Now handle the image files
					const config = variantConfig as ImageChoiceConfig;
					const uploadedOptions = [];

					// Get image files from form data
					const imageFiles = formData.getAll(`imageChoiceFiles-${index}`) as File[];
					console.log(
						`[Create Quiz] SoundBite ${index + 1} (image_choice): Found ${imageFiles.length} files in formData, expected ${config.options.length} images`
					);

					// Log all files received
					imageFiles.forEach((f, i) => {
						console.log(
							`[Create Quiz] image_choice file ${i}: name=${f.name}, size=${f.size}, type=${f.type}`
						);
					});

					for (let optionIndex = 0; optionIndex < config.options.length; optionIndex++) {
						const option = config.options[optionIndex];
						const imgFile = imageFiles[optionIndex];

						console.log(
							`[Create Quiz] Processing option ${optionIndex}: id=${option.id}, imgFile=${imgFile ? imgFile.name : 'none'}, imgFileSize=${imgFile ? imgFile.size : 0}`
						);

						if (imgFile && imgFile.size > 0) {
							// Upload to Vercel Blob
							console.log(`[Create Quiz] Uploading image ${optionIndex}: ${imgFile.name}`);
							const imgBlob = await uploadToBlob(imgFile, env.BLOB_READ_WRITE_TOKEN);
							console.log(
								`[Create Quiz] Image ${optionIndex} uploaded: url=${imgBlob.url.substring(0, 50)}..., pathname=${imgBlob.pathname}`
							);
							uploadedOptions.push({
								id: option.id,
								imageUrl: imgBlob.url,
								pathname: imgBlob.pathname,
								label: option.label,
								isCorrect: option.isCorrect
							});
						} else {
							// No file - this shouldn't happen on CREATE
							console.error(
								`[Create Quiz] ERROR: No image file for option ${optionIndex} on CREATE`
							);
							return fail(400, {
								message: `SoundBite ${index + 1} is missing image ${optionIndex + 1}. Please upload all images.`
							});
						}
					}

					// Update config with permanent URLs
					variantConfig = {
						...config,
						options: uploadedOptions
					};

					console.log(
						`[Create Quiz] Final variantConfig for soundbite ${index + 1}:`,
						JSON.stringify(variantConfig, null, 2)
					);

					// Validate the updated image_choice config
					if (!validateVariantConfig(variantConfig)) {
						console.error(
							`[Create Quiz] ImageChoice validation failed for SoundBite ${index + 1}:`,
							variantConfig
						);
						return fail(400, {
							message: `Invalid configuration for SoundBite ${index + 1}. Please ensure all image files were uploaded successfully.`
						});
					}
				} else {
					// For other variants, upload the file
					const file = files[fileIndex];
					fileIndex += 1;

					if (!file || file.size === 0) {
						return fail(400, { message: `SoundBite ${index + 1} is missing an MP3 file.` });
					}

					const blob = await uploadToBlob(file, env.BLOB_READ_WRITE_TOKEN);

					const [track] = await db
						.insert(tracks)
						.values({
							name: file.name,
							url: blob.url,
							pathname: blob.pathname
						})
						.returning({ id: tracks.id });
					trackId = track.id;
				}

				await db.insert(soundbites).values({
					quizId: quiz.id,
					trackId,
					position: index,
					question: questions[index],
					variantType,
					variantConfig
				});
			}

			// Create speed run configuration if applicable
			if (quizMode === 'speed_run') {
				const speedRunConfig = JSON.parse(speedRunConfigJson);
				await db.insert(speedRuns).values({
					quizId: quiz.id,
					defaultQuestionTimeLimit: speedRunConfig.defaultQuestionTimeLimit || null,
					revealDelayMs: speedRunConfig.revealDelayMs || 3000,
					audioLoopGapMs: speedRunConfig.audioLoopGapMs || 2000,
					enableStreakBonus: speedRunConfig.enableStreakBonus ?? true
				});
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
			return fail(500, { message: errorMessage });
		}
	}
};
