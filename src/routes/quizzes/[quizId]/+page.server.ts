import { db } from '$lib/server/db';
import {
	quizAnswers,
	quizzes,
	soundbites,
	tracks,
	speedRuns,
	speedRunResults
} from '$lib/server/db/schema';
import type { SequenceConfig, RankConfig, ImageChoiceConfig } from '$lib/server/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { slugify } from '$lib/utils';
import { findUniqueSlug } from '$lib/server/db/slug-utils';
import { validateVariantConfig } from '$lib/server/variant-utils';
import {
	getExistingSoundbites,
	getNewSoundbites,
	validateFiles,
	uploadToBlob,
	deleteFromBlob
} from '$lib/server/quiz-utils';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) {
		// Capture the current URL and pass it to login for redirect after authentication
		const returnUrl = url.pathname + url.search;
		redirect(302, `/login?redirect=${encodeURIComponent(returnUrl)}`);
	}

	const quiz = await db.query.quizzes.findFirst({
		where: and(eq(quizzes.id, params.quizId), eq(quizzes.ownerId, locals.user.id)),
		with: {
			soundbites: {
				with: {
					track: true
				},
				orderBy: asc(soundbites.position)
			},
			quizAnswers: {
				with: {
					user: true
				},
				orderBy: asc(quizAnswers.createdAt)
			},
			speedRun: {
				with: {
					results: {
						with: {
							user: true
						},
						orderBy: asc(speedRunResults.createdAt)
					}
				}
			}
		}
	});

	if (!quiz) {
		error(404, 'Quiz not found');
	}

	// Transform relational data to match frontend expectations
	const soundbiteItems = quiz.soundbites.map((soundbite) => ({
		id: soundbite.id,
		position: soundbite.position,
		trackUrl: soundbite.track.url,
		trackName: soundbite.track.name,
		question: soundbite.question,
		variantType: soundbite.variantType,
		variantConfig: soundbite.variantConfig
	}));

	const answerRows = quiz.quizAnswers.map((answer) => ({
		id: answer.id,
		createdAt: answer.createdAt,
		answers: answer.answers,
		score: answer.score,
		totalCorrect: answer.totalCorrect,
		totalQuestions: answer.totalQuestions,
		displayName: answer.displayName,
		userName: answer.user?.name ?? null,
		userEmail: answer.user?.email ?? null
	}));

	const speedRunResultsRows =
		quiz.speedRun?.results.map((result) => ({
			id: result.id,
			createdAt: result.createdAt,
			displayName: result.displayName,
			userName: result.user?.name ?? null,
			userEmail: result.user?.email ?? null,
			totalQuestions: result.totalQuestions,
			correctCount: result.correctCount,
			totalTimeMs: result.totalTimeMs,
			streakMax: result.streakMax,
			score: result.score,
			answers: result.answers
		})) ?? [];

	return {
		quiz: {
			id: quiz.id,
			title: quiz.title,
			slug: quiz.slug,
			description: quiz.description,
			createdAt: quiz.createdAt
		},
		soundbites: soundbiteItems,
		answers: answerRows,
		speedRunResults: speedRunResultsRows,
		hasSpeedRun: !!quiz.speedRun
	};
};

export const actions: Actions = {
	delete: async ({ locals, params }: RequestEvent) => {
		if (!locals.user) {
			return fail(401, { message: 'You must be signed in to delete this quiz.' });
		}

		if (!env.BLOB_READ_WRITE_TOKEN) {
			return fail(500, { message: 'Blob storage not configured.' });
		}

		const existingQuiz = await db.query.quizzes.findFirst({
			where: and(eq(quizzes.id, params.quizId), eq(quizzes.ownerId, locals.user.id)),
			columns: { id: true },
			with: {
				soundbites: {
					with: {
						track: true
					}
				}
			}
		});

		if (!existingQuiz) {
			return fail(404, { message: 'Quiz not found or you do not have permission to delete it.' });
		}

		try {
			// Delete associated blobs from Vercel Blob storage and collect track IDs
			const trackIds: string[] = [];
			for (const soundbite of existingQuiz.soundbites) {
				// Delete track audio file if it exists
				if (soundbite.track?.pathname) {
					await deleteFromBlob(soundbite.track.pathname, env.BLOB_READ_WRITE_TOKEN);
				}

				// Delete image files for image_choice variants
				if (soundbite.variantType === 'image_choice') {
					const config = soundbite.variantConfig as ImageChoiceConfig;
					for (const option of config.options) {
						if (option.pathname) {
							await deleteFromBlob(option.pathname, env.BLOB_READ_WRITE_TOKEN);
						}
					}
				}

				if (soundbite.track?.id) {
					trackIds.push(soundbite.track.id);
				}
			}

			await db.delete(quizzes).where(eq(quizzes.id, params.quizId));

			// Delete orphaned tracks after quiz and soundbites are deleted
			for (const trackId of trackIds) {
				await db.delete(tracks).where(eq(tracks.id, trackId));
			}
		} catch (err) {
			console.error(err);
			return fail(500, { message: 'Failed to delete quiz.' });
		}

		redirect(302, '/profile');
	},
	update: async ({ request, locals, params }: RequestEvent) => {
		if (!locals.user) {
			return fail(401, { message: 'You must be signed in to edit this quiz.' });
		}

		if (!env.BLOB_READ_WRITE_TOKEN) {
			return fail(500, { message: 'Blob storage not configured.' });
		}

		const formData = await request.formData();

		// Debug: Log form data entries
		console.log('[Edit Quiz Server] Form data entries:');
		for (const [key, value] of formData.entries()) {
			console.log(
				`  ${key}: ${value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value}`
			);
		}
		const title = String(formData.get('title') ?? '').trim();
		const rawSlug = String(formData.get('slug') ?? '').trim();
		const description = String(formData.get('description') ?? '').trim();

		if (!title) {
			return fail(400, { message: 'Title is required.' });
		}

		if (!description) {
			return fail(400, { message: 'Description is required.' });
		}

		const { ids, questions, variantTypes, variantConfigs, files, removed } =
			getExistingSoundbites(formData);
		const {
			questions: newQuestions,
			variantTypes: newVariantTypes,
			variantConfigs: newVariantConfigs,
			files: newFiles
		} = getNewSoundbites(formData);

		// Count non-sequence and non-rank variants (image_choice needs MP3 too)
		const simpleVariantCount = variantTypes.filter(
			(_, i) => !removed.has(ids[i]) && variantTypes[i] !== 'sequence' && variantTypes[i] !== 'rank'
		).length;
		const simpleNewCount = newVariantTypes.filter(
			(type) => type !== 'sequence' && type !== 'rank'
		).length;

		// Calculate if files are required
		const remainingSoundbites = ids.length - removed.size;
		const addingNewSoundbites = newVariantTypes.length > 0;
		const filesRequired = remainingSoundbites === 0 && !addingNewSoundbites;

		// Only validate files for simple variants (not sequence or rank)
		const simpleFiles = files.filter(
			(_, i) => variantTypes[i] !== 'sequence' && variantTypes[i] !== 'rank' && !removed.has(ids[i])
		);
		const simpleNewFiles = newFiles.filter(
			(_, i) => newVariantTypes[i] !== 'sequence' && newVariantTypes[i] !== 'rank'
		);

		const fileError = validateFiles(
			[
				...simpleFiles.filter((file: File) => file.size > 0),
				...simpleNewFiles.filter((file: File) => file.size > 0)
			],
			filesRequired
		);
		if (fileError) {
			return fail(400, { message: fileError });
		}

		if (variantTypes.length !== ids.length || variantConfigs.length !== ids.length) {
			return fail(400, { message: 'SoundBite variant configuration is missing.' });
		}

		// Check that new soundbites have proper configuration (files only required for non-sequence)
		if (newVariantConfigs.length !== newVariantTypes.length) {
			return fail(400, { message: 'Each new SoundBite needs variant configuration.' });
		}

		// Validate simple variant configs (sequence, rank, and image_choice configs will be validated after file upload)
		for (let i = 0; i < variantConfigs.length; i++) {
			const config = variantConfigs[i];
			if (
				!removed.has(ids[i]) &&
				config &&
				config.type !== 'sequence' &&
				config.type !== 'rank' &&
				config.type !== 'image_choice' &&
				!validateVariantConfig(config)
			) {
				return fail(400, { message: `Invalid configuration for SoundBite ${i + 1}.` });
			}
		}

		for (let i = 0; i < newVariantConfigs.length; i++) {
			const config = newVariantConfigs[i];
			// Skip sequence, rank, and image_choice validation for now - will validate after file upload
			if (
				!config ||
				(config.type !== 'sequence' &&
					config.type !== 'rank' &&
					config.type !== 'image_choice' &&
					!validateVariantConfig(config))
			) {
				return fail(400, { message: `Invalid configuration for new SoundBite ${i + 1}.` });
			}
		}

		const baseSlug = slugify(rawSlug || title);

		try {
			const existingQuiz = await db.query.quizzes.findFirst({
				where: and(eq(quizzes.id, params.quizId), eq(quizzes.ownerId, locals.user.id)),
				columns: { id: true }
			});

			if (!existingQuiz) {
				error(404, 'Quiz not found');
			}

			const slug = await findUniqueSlug(baseSlug, params.quizId);
			await db
				.update(quizzes)
				.set({ title, slug, description })
				.where(eq(quizzes.id, params.quizId));

			for (let index = 0; index < ids.length; index += 1) {
				const id = ids[index];
				if (removed.has(id)) {
					await db.delete(soundbites).where(eq(soundbites.id, id));
					continue;
				}

				const question = questions[index];
				const variantType = variantTypes[index];
				let variantConfig = variantConfigs[index]!;
				const file = files[index];

				// Handle image_choice image uploads for existing soundbites
				if (variantType === 'image_choice') {
					const config = variantConfig as ImageChoiceConfig;
					const uploadedOptions = [];
					const imageFiles = formData.getAll(`imageChoiceFiles-${index}`) as File[];

					console.log(
						`[Edit Quiz] Existing soundbite ${index}: Processing ${config.options.length} options, received ${imageFiles.length} files`
					);

					for (let optionIndex = 0; optionIndex < config.options.length; optionIndex++) {
						const option = config.options[optionIndex];
						const imgFile = imageFiles[optionIndex];

						console.log(
							`[Edit Quiz] Option ${optionIndex}: id=${option.id}, hasNewFile=${imgFile && imgFile.size > 0}, existingUrl=${option.imageUrl?.substring(0, 50)}...`
						);

						if (imgFile && imgFile.size > 0) {
							// New file uploaded - upload to blob
							console.log(
								`[Edit Quiz] Uploading new file for option ${optionIndex}: ${imgFile.name}`
							);
							const imgBlob = await uploadToBlob(imgFile, env.BLOB_READ_WRITE_TOKEN);
							uploadedOptions.push({
								id: option.id,
								imageUrl: imgBlob.url,
								pathname: imgBlob.pathname,
								label: option.label,
								isCorrect: option.isCorrect
							});
						} else if (option.imageUrl && option.imageUrl.startsWith('http')) {
							// Keep existing option with server URL
							console.log(`[Edit Quiz] Keeping existing option ${optionIndex} with server URL`);
							uploadedOptions.push(option);
						} else {
							// No file and no valid URL - this shouldn't happen
							console.warn(
								`[Edit Quiz] Warning: Option ${optionIndex} has no file and no valid URL`
							);
							uploadedOptions.push(option);
						}
					}
					variantConfig = { ...config, options: uploadedOptions };
				}

				if (file && file.size > 0) {
					const blob = await uploadToBlob(file, env.BLOB_READ_WRITE_TOKEN);

					const [track] = await db
						.insert(tracks)
						.values({
							name: file.name,
							url: blob.url,
							pathname: blob.pathname
						})
						.returning({ id: tracks.id });

					await db
						.update(soundbites)
						.set({ question, variantType, variantConfig, trackId: track.id })
						.where(eq(soundbites.id, id));
				} else {
					await db
						.update(soundbites)
						.set({ question, variantType, variantConfig })
						.where(eq(soundbites.id, id));
				}
			}

			const currentMaxPosition = ids.length;
			let newFileIndex = 0;

			for (let index = 0; index < newVariantTypes.length; index += 1) {
				const question = newQuestions[index];
				const variantType = newVariantTypes[index];
				let variantConfig = newVariantConfigs[index]!;
				let trackId: string;

				if (variantType === 'sequence') {
					// For sequence variants, upload the sequence files
					const config = variantConfig as SequenceConfig;
					const uploadedTracks = [];

					// Get sequence files from form data
					// Note: Client sends files with index starting from 0 for new soundbites
					const sequenceFiles = formData.getAll(`sequenceFiles-${index}`) as File[];
					console.log(
						`[Edit Quiz Server] New soundbite ${index}: Found ${sequenceFiles.length} sequence files`
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
							// If no file provided, keep the original URL
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
						return fail(400, {
							message: `Invalid configuration for new SoundBite ${index + 1}. Please ensure all sequence files were uploaded successfully.`
						});
					}

					// Create a placeholder track for the soundbite
					const [track] = await db
						.insert(tracks)
						.values({
							name: `Sequence ${currentMaxPosition + index + 1}`,
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
					// Note: Client sends files with index starting from 0 for new soundbites
					const rankFiles = formData.getAll(`rankFiles-${index}`) as File[];
					console.log(
						`[Edit Quiz Server] New soundbite ${index}: Found ${rankFiles.length} rank files`
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
						return fail(400, {
							message: `Invalid configuration for new SoundBite ${index + 1}. Please ensure all rank files were uploaded successfully.`
						});
					}

					// Create a placeholder track for the soundbite
					const [track] = await db
						.insert(tracks)
						.values({
							name: `Rank ${currentMaxPosition + index + 1}`,
							url: '',
							pathname: null
						})
						.returning({ id: tracks.id });
					trackId = track.id;
				} else if (variantType === 'image_choice') {
					// For image_choice variants, upload the MP3 file first
					const file = newFiles[newFileIndex];
					newFileIndex += 1;

					if (!file || file.size === 0) {
						return fail(400, { message: `New SoundBite ${index + 1} is missing an MP3 file.` });
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
					// Note: Client sends files with index starting from 0 for new soundbites
					const imageFiles = formData.getAll(`imageChoiceFiles-${index}`) as File[];
					console.log(
						`[Edit Quiz Server] New soundbite ${index}: Found ${imageFiles.length} image files`
					);

					for (let optionIndex = 0; optionIndex < config.options.length; optionIndex++) {
						const option = config.options[optionIndex];
						const imgFile = imageFiles[optionIndex];

						if (imgFile && imgFile.size > 0) {
							// Upload to Vercel Blob
							const imgBlob = await uploadToBlob(imgFile, env.BLOB_READ_WRITE_TOKEN);
							uploadedOptions.push({
								id: option.id,
								imageUrl: imgBlob.url,
								pathname: imgBlob.pathname,
								label: option.label,
								isCorrect: option.isCorrect
							});
						} else {
							// If no file provided, keep the original URL
							uploadedOptions.push(option);
						}
					}

					// Update config with permanent URLs
					variantConfig = {
						...config,
						options: uploadedOptions
					};

					// Validate the updated image_choice config
					if (!validateVariantConfig(variantConfig)) {
						return fail(400, {
							message: `Invalid configuration for new SoundBite ${index + 1}. Please ensure all image files were uploaded successfully.`
						});
					}
				} else {
					// For other variants, upload the file
					const file = newFiles[newFileIndex];
					newFileIndex += 1;

					if (!file || file.size === 0) {
						return fail(400, { message: `New SoundBite ${index + 1} is missing an MP3 file.` });
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
					quizId: params.quizId,
					trackId,
					position: currentMaxPosition + index,
					question,
					variantType,
					variantConfig
				});
			}

			return { success: true };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Failed to update quiz.' });
		}
	}
};
