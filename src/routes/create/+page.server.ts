import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions, RequestEvent } from './$types';
import { put } from '@vercel/blob';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { quizzes, soundbites, tracks } from '$lib/server/db/schema';
import type { VariantType, VariantConfig } from '$lib/server/db/schema';
import { slugify } from '$lib/utils';
import { generateUniqueSlug } from '$lib/server/db/slug-utils';
import { validateVariantConfig } from '$lib/server/variant-utils';

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

const getSoundbiteValues = (formData: FormData) => {
	const files = formData.getAll('soundbiteFile') as File[];
	const questions = formData
		.getAll('soundbiteQuestion')
		.map((value) => String(value).trim() || null);
	const variantTypes = formData
		.getAll('soundbiteVariantType')
		.map((value) => String(value) as VariantType);
	const variantConfigs = formData.getAll('soundbiteVariantConfig').map((value) => {
		try {
			return JSON.parse(String(value)) as VariantConfig;
		} catch {
			return null;
		}
	});

	return { files, questions, variantTypes, variantConfigs };
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

		const fileError = validateFiles(files);
		if (fileError) {
			return fail(400, { message: fileError });
		}

		if (variantTypes.length !== files.length || variantConfigs.length !== files.length) {
			return fail(400, { message: 'Each SoundBite needs variant configuration.' });
		}

		// Validate all variant configs
		for (let i = 0; i < variantConfigs.length; i++) {
			const config = variantConfigs[i];
			if (!config || !validateVariantConfig(config)) {
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

			for (let index = 0; index < files.length; index += 1) {
				const file = files[index];
				const variantType = variantTypes[index];
				const variantConfig = variantConfigs[index]!;

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
					quizId: quiz.id,
					trackId: track.id,
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
