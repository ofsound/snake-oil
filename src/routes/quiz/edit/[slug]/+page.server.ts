import { db } from '$lib/server/db';
import {
	quizAnswers,
	quizzes,
	soundbites,
	tracks,
	speedRuns,
	speedRunResults
} from '$lib/server/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { deleteFromBlob } from '$lib/server/quiz-utils';
import { processQuizSubmission } from '$lib/server/quiz-processor';
import type { ImageChoiceConfig } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) {
		// Capture the current URL and pass it to login for redirect after authentication
		const returnUrl = url.pathname + url.search;
		redirect(302, `/login?redirect=${encodeURIComponent(returnUrl)}`);
	}

	const quiz = await db.query.quizzes.findFirst({
		where: and(eq(quizzes.slug, params.slug), eq(quizzes.ownerId, locals.user.id)),
		with: {
			soundbites: {
				with: {
					track: true
				},
				orderBy: asc(soundbites.position)
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

	return {
		quiz: {
			id: quiz.id,
			title: quiz.title,
			slug: quiz.slug,
			description: quiz.description,
			visibility: quiz.visibility,
			createdAt: quiz.createdAt
		},
		soundbites: soundbiteItems
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
			where: and(eq(quizzes.slug, params.slug), eq(quizzes.ownerId, locals.user.id)),
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

			await db.delete(quizzes).where(eq(quizzes.id, existingQuiz.id));

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

		// First, find the quiz by slug to get its ID
		const existingQuiz = await db.query.quizzes.findFirst({
			where: and(eq(quizzes.slug, params.slug), eq(quizzes.ownerId, locals.user.id)),
			columns: { id: true }
		});

		if (!existingQuiz) {
			return fail(404, { message: 'Quiz not found or you do not have permission to edit it.' });
		}

		const formData = await request.formData();

		const result = await processQuizSubmission({
			formData,
			userId: locals.user.id,
			blobToken: env.BLOB_READ_WRITE_TOKEN,
			quizId: existingQuiz.id
		});

		if (!result.success) {
			return fail(400, { message: result.error || 'Failed to update quiz.' });
		}

		return { success: true };
	}
};
