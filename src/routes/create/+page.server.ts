import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions, RequestEvent } from './$types';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { quizzes, soundbites, tracks } from '$lib/server/db/schema';
import { slugify } from '$lib/utils';
import { generateUniqueSlug } from '$lib/server/db/slug-utils';
import { validateVariantConfig } from '$lib/server/variant-utils';
import {
	getSoundbiteValues,
	validateFiles,
	uploadToBlob,
	uploadBufferToBlob
} from '$lib/server/quiz-utils';
import type { SequenceConfig } from '$lib/variant-types';

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

		// Check if we have any non-sequence soundbites that require files
		const hasNonSequenceSoundbites = variantTypes.some((type) => type !== 'sequence');

		if (hasNonSequenceSoundbites) {
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

		// Count how many non-sequence soundbites we have (these need files)
		const nonSequenceCount = variantTypes.filter((type) => type !== 'sequence').length;
		if (files.length !== nonSequenceCount) {
			return fail(400, { message: 'Each non-sequence SoundBite needs an MP3 file.' });
		}

		// Validate non-sequence variant configs (sequence configs will be validated after file upload)
		for (let i = 0; i < variantConfigs.length; i++) {
			const config = variantConfigs[i];
			if (!config) {
				return fail(400, { message: `Missing configuration for SoundBite ${i + 1}.` });
			}
			// Skip sequence validation for now - will validate after file upload
			if (config.type !== 'sequence' && !validateVariantConfig(config)) {
				return fail(400, { message: `Invalid configuration for SoundBite ${i + 1}.` });
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

			let fileIndex = 0;
			for (let index = 0; index < variantTypes.length; index += 1) {
				const variantType = variantTypes[index];
				let variantConfig = variantConfigs[index]!;
				let trackId: string;

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

			return {
				success: true,
				quizId: quiz.id,
				slug: quiz.slug
			};
		} catch (error) {
			console.error('Error creating quiz:', error);
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to create quiz. Please try again.';
			return fail(500, { message: errorMessage });
		}
	}
};
