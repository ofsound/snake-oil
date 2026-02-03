import { db } from '$lib/server/db';
import { quizAnswers, quizzes, soundbites, tracks } from '$lib/server/db/schema';
import type { VariantType, VariantConfig } from '$lib/server/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { del, put } from '@vercel/blob';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { slugify } from '$lib/utils';
import { findUniqueSlug } from '$lib/server/db/slug-utils';
import { validateVariantConfig } from '$lib/server/variant-utils';

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

	return {
		quiz: {
			id: quiz.id,
			title: quiz.title,
			slug: quiz.slug,
			description: quiz.description,
			createdAt: quiz.createdAt
		},
		soundbites: soundbiteItems,
		answers: answerRows
	};
};

const getExistingSoundbites = (formData: FormData) => {
	const ids = formData.getAll('existingSoundbiteId').map((value) => String(value));
	const questions = formData
		.getAll('existingSoundbiteQuestion')
		.map((value) => String(value).trim() || null);
	const variantTypes = formData
		.getAll('existingSoundbiteVariantType')
		.map((value) => String(value) as VariantType);
	const variantConfigs = formData.getAll('existingSoundbiteVariantConfig').map((value) => {
		try {
			return JSON.parse(String(value)) as VariantConfig;
		} catch {
			return null;
		}
	});
	const files = formData.getAll('existingSoundbiteFile') as File[];
	const removed = new Set(formData.getAll('existingSoundbiteRemove').map((value) => String(value)));

	return { ids, questions, variantTypes, variantConfigs, files, removed };
};

const getNewSoundbites = (formData: FormData) => {
	const questions = formData
		.getAll('newSoundbiteQuestion')
		.map((value) => String(value).trim() || null);
	const variantTypes = formData
		.getAll('newSoundbiteVariantType')
		.map((value) => String(value) as VariantType);
	const variantConfigs = formData.getAll('newSoundbiteVariantConfig').map((value) => {
		try {
			return JSON.parse(String(value)) as VariantConfig;
		} catch {
			return null;
		}
	});
	const files = formData.getAll('newSoundbiteFile') as File[];

	return { questions, variantTypes, variantConfigs, files };
};

const validateFiles = (files: File[], isRequired: boolean) => {
	if (isRequired && files.length === 0) {
		return 'At least one SoundBite is required.';
	}

	for (const file of files) {
		if (file && file.size > 0) {
			if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3')) {
				return 'All SoundBite files must be MP3 audio.';
			}
		}
	}

	return null;
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
				if (soundbite.track?.pathname) {
					await del(soundbite.track.pathname, {
						token: env.BLOB_READ_WRITE_TOKEN
					});
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

		const remainingSoundbites = ids.length - removed.size;
		const addingNewSoundbites = newFiles.length > 0;
		// Files are only required if all existing soundbites are removed and no new ones are added
		const filesRequired = remainingSoundbites === 0 && !addingNewSoundbites;

		const fileError = validateFiles(
			[...files.filter((file) => file.size > 0), ...newFiles.filter((file) => file.size > 0)],
			filesRequired
		);
		if (fileError) {
			return fail(400, { message: fileError });
		}

		if (variantTypes.length !== ids.length || variantConfigs.length !== ids.length) {
			return fail(400, { message: 'SoundBite variant configuration is missing.' });
		}

		if (newVariantTypes.length !== newFiles.length || newVariantConfigs.length !== newFiles.length) {
			return fail(400, { message: 'Each new SoundBite needs variant configuration.' });
		}

		// Validate all variant configs
		for (let i = 0; i < variantConfigs.length; i++) {
			const config = variantConfigs[i];
			if (!removed.has(ids[i]) && (!config || !validateVariantConfig(config))) {
				return fail(400, { message: `Invalid configuration for SoundBite ${i + 1}.` });
			}
		}

		for (let i = 0; i < newVariantConfigs.length; i++) {
			const config = newVariantConfigs[i];
			if (!config || !validateVariantConfig(config)) {
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
				const variantConfig = variantConfigs[index]!;
				const file = files[index];

				if (file && file.size > 0) {
					const blob = await put(file.name, file, {
						access: 'public',
						addRandomSuffix: true,
						token: env.BLOB_READ_WRITE_TOKEN
					});

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

			for (let index = 0; index < newFiles.length; index += 1) {
				const file = newFiles[index];
				const question = newQuestions[index];
				const variantType = newVariantTypes[index];
				const variantConfig = newVariantConfigs[index]!;

				const blob = await put(file.name, file, {
					access: 'public',
					addRandomSuffix: true,
					token: env.BLOB_READ_WRITE_TOKEN
				});

				const [track] = await db
					.insert(tracks)
					.values({
						name: file.name,
						url: blob.url,
						pathname: blob.pathname
					})
					.returning({ id: tracks.id });

				await db.insert(soundbites).values({
					quizId: params.quizId,
					trackId: track.id,
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
