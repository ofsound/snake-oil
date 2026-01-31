import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions, RequestEvent } from './$types';
import { put } from '@vercel/blob';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { quizzes, soundbites, tracks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { slugify, generateUniqueSlug } from '$lib/server/db/slug-utils';

export const load: PageServerLoad = async ({ locals }) => {
	// Check for active user session
	if (!locals.user) {
		redirect(302, '/');
	}

	// Return empty data for now since the page will be blank
	return {};
};

const getSoundbiteValues = (formData: FormData) => {
	const descriptions = formData.getAll('soundbiteDescription').map((value) => String(value).trim());
	const files = formData.getAll('soundbiteFile') as File[];

	return { descriptions, files };
};

const validateFiles = (files: File[]) => {
	if (files.length === 0) {
		return 'At least one SoundBite is required.';
	}

	for (const file of files) {
		if (!file || file.size === 0) {
			return 'Each SoundBite must include an MP3 file.';
		}
		if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3')) {
			return 'All SoundBite files must be MP3 audio.';
		}
	}

	return null;
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
		const { descriptions, files } = getSoundbiteValues(formData);

		if (!title) {
			return fail(400, { message: 'Title is required.' });
		}

		if (!description) {
			return fail(400, { message: 'Description is required.' });
		}

		const fileError = validateFiles(files);
		if (fileError) {
			return fail(400, { message: fileError });
		}

		if (descriptions.length !== files.length) {
			return fail(400, { message: 'Each SoundBite needs a description and file.' });
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

			for (let index = 0; index < files.length; index += 1) {
				const file = files[index];
				const descriptionText = descriptions[index] || '';
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
					quizId: quiz.id,
					trackId: track.id,
					description: descriptionText,
					position: index
				});
			}

			return {
				success: true,
				quizId: quiz.id,
				slug: quiz.slug
			};
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Failed to create quiz.' });
		}
	}
};