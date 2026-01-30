import { db } from '$lib/server/db';
import { quizAnswers, quizzes, soundbites, tracks, user } from '$lib/server/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, eq, ne } from 'drizzle-orm';
import { put } from '@vercel/blob';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const rows = await db
		.select({
			quizId: quizzes.id,
			title: quizzes.title,
			slug: quizzes.slug,
			description: quizzes.description,
			createdAt: quizzes.createdAt,
			soundbiteId: soundbites.id,
			soundbiteDescription: soundbites.description,
			position: soundbites.position,
			trackUrl: tracks.url,
			trackName: tracks.name
		})
		.from(quizzes)
		.leftJoin(soundbites, eq(soundbites.quizId, quizzes.id))
		.leftJoin(tracks, eq(tracks.id, soundbites.trackId))
		.where(and(eq(quizzes.id, params.quizId), eq(quizzes.ownerId, locals.user.id)))
		.orderBy(asc(soundbites.position));

	if (rows.length === 0) {
		error(404, 'Quiz not found');
	}

	const quiz = {
		id: rows[0].quizId,
		title: rows[0].title,
		slug: rows[0].slug,
		description: rows[0].description,
		createdAt: rows[0].createdAt
	};

	const soundbiteItems = rows
		.filter((row) => row.soundbiteId !== null)
		.map((row) => ({
			id: row.soundbiteId as number,
			description: row.soundbiteDescription as string,
			position: row.position as number,
			trackUrl: row.trackUrl as string,
			trackName: row.trackName as string
		}));

	const answerRows = await db
		.select({
			id: quizAnswers.id,
			createdAt: quizAnswers.createdAt,
			answers: quizAnswers.answers,
			displayName: quizAnswers.displayName,
			userName: user.name,
			userEmail: user.email
		})
		.from(quizAnswers)
		.leftJoin(user, eq(quizAnswers.userId, user.id))
		.where(eq(quizAnswers.quizId, quiz.id))
		.orderBy(asc(quizAnswers.createdAt));

	return {
		quiz,
		soundbites: soundbiteItems,
		answers: answerRows
	};
};

const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

const ensureUniqueSlug = async (quizId: string, baseSlug: string) => {
	const base = baseSlug || 'quiz';
	let candidate = base;
	let counter = 2;

	while (true) {
		const existing = await db
			.select({ id: quizzes.id })
			.from(quizzes)
			.where(and(eq(quizzes.slug, candidate), ne(quizzes.id, quizId)))
			.limit(1);
		if (existing.length === 0) return candidate;
		candidate = `${base}-${counter}`;
		counter += 1;
	}
};

const getExistingSoundbites = (formData: FormData) => {
	const ids = formData.getAll('existingSoundbiteId').map((value) => Number(value));
	const descriptions = formData
		.getAll('existingSoundbiteDescription')
		.map((value) => String(value).trim());
	const files = formData.getAll('existingSoundbiteFile') as File[];
	const removed = new Set(formData.getAll('existingSoundbiteRemove').map((value) => Number(value)));

	return { ids, descriptions, files, removed };
};

const getNewSoundbites = (formData: FormData) => {
	const descriptions = formData.getAll('newSoundbiteDescription').map((value) => String(value).trim());
	const files = formData.getAll('newSoundbiteFile') as File[];

	return { descriptions, files };
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
	default: async ({ request, locals, params }: RequestEvent) => {
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

		const { ids, descriptions, files, removed } = getExistingSoundbites(formData);
		const { descriptions: newDescriptions, files: newFiles } = getNewSoundbites(formData);

		const fileError = validateFiles(
			[...files.filter((file) => file.size > 0), ...newFiles.filter((file) => file.size > 0)],
			ids.length - removed.size + newFiles.length > 0
		);
		if (fileError) {
			return fail(400, { message: fileError });
		}

		if (descriptions.length !== ids.length) {
			return fail(400, { message: 'SoundBite descriptions are missing.' });
		}

		if (newDescriptions.length !== newFiles.length) {
			return fail(400, { message: 'Each new SoundBite needs a description and file.' });
		}

		const baseSlug = slugify(rawSlug || title);
		const slug = await ensureUniqueSlug(params.quizId, baseSlug);

		try {
			const existingQuiz = await db
				.select({ id: quizzes.id })
				.from(quizzes)
				.where(and(eq(quizzes.id, params.quizId), eq(quizzes.ownerId, locals.user.id)))
				.limit(1);

			if (existingQuiz.length === 0) {
				error(404, 'Quiz not found');
			}

			await db.update(quizzes).set({ title, slug, description }).where(eq(quizzes.id, params.quizId));

			for (let index = 0; index < ids.length; index += 1) {
				const id = ids[index];
				if (removed.has(id)) {
					await db.delete(soundbites).where(eq(soundbites.id, id));
					continue;
				}

				const descriptionText = descriptions[index] || '';
				const file = files[index];

				if (file && file.size > 0) {
					const blob = await put(file.name, file, {
						access: 'public',
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
						.set({ description: descriptionText, trackId: track.id })
						.where(eq(soundbites.id, id));
				} else {
					await db.update(soundbites).set({ description: descriptionText }).where(eq(soundbites.id, id));
				}
			}

			const currentMaxPosition = ids.length;

			for (let index = 0; index < newFiles.length; index += 1) {
				const file = newFiles[index];
				const descriptionText = newDescriptions[index] || '';

				const blob = await put(file.name, file, {
					access: 'public',
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
					description: descriptionText,
					position: currentMaxPosition + index
				});
			}

			return { success: true };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Failed to update quiz.' });
		}
	}
};
