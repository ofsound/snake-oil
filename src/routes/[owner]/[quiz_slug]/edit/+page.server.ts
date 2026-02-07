import { db } from '$lib/server/db';
import { quizzes, soundbites, tracks } from '$lib/server/db/schema';
import { error, fail, redirect } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { deleteFromBlob } from '$lib/server/quiz-utils';
import { processQuizSubmission } from '$lib/server/quiz-processor';
import { user } from '$lib/server/db/schema';
import type { ImageChoiceConfig } from '$lib/server/db/schema';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.user) {
		const returnUrl = url.pathname + url.search;
		redirect(302, `/login?redirect=${encodeURIComponent(returnUrl)}`);
	}

	const { owner, quiz_slug: quizSlug } = params;

	// Find owner
	const ownerRecord = await db.query.user.findFirst({
		where: eq(user.slug, owner)
	});

	if (!ownerRecord) {
		error(404, 'User not found');
	}

	// Only allow editing if current user is the owner
	if (ownerRecord.id !== locals.user.id) {
		error(403, 'You can only edit your own quizzes');
	}

	const quiz = await db.query.quizzes.findFirst({
		where: and(eq(quizzes.ownerId, ownerRecord.id), eq(quizzes.slug, quizSlug)),
		with: {
			soundbites: {
				with: {
					track: true
				},
				orderBy: asc(soundbites.position)
			},
			speedRun: true
		}
	});

	if (!quiz) {
		error(404, 'Quiz not found');
	}

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
			createdAt: quiz.createdAt,
			owner: {
				id: ownerRecord.id,
				name: ownerRecord.name,
				slug: ownerRecord.slug
			}
		},
		soundbites: soundbiteItems,
		isSpeedRun: !!quiz.speedRun,
		speedRunConfig: quiz.speedRun
			? {
					defaultQuestionTimeLimit: quiz.speedRun.defaultQuestionTimeLimit?.toString() ?? '10',
					revealDelayMs: quiz.speedRun.revealDelayMs.toString(),
					audioLoopGapMs: quiz.speedRun.audioLoopGapMs.toString(),
					enableStreakBonus: quiz.speedRun.enableStreakBonus
				}
			: null
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

		const { owner, quiz_slug: quizSlug } = params;

		const ownerRecord = await db.query.user.findFirst({
			where: eq(user.slug, owner)
		});

		if (!ownerRecord || ownerRecord.id !== locals.user.id) {
			return fail(403, { message: 'You do not have permission to delete this quiz.' });
		}

		const existingQuiz = await db.query.quizzes.findFirst({
			where: and(eq(quizzes.ownerId, ownerRecord.id), eq(quizzes.slug, quizSlug)),
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
			const trackIds: string[] = [];
			for (const soundbite of existingQuiz.soundbites) {
				if (soundbite.track?.pathname) {
					await deleteFromBlob(soundbite.track.pathname, env.BLOB_READ_WRITE_TOKEN);
				}

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

		const { owner, quiz_slug: quizSlug } = params;

		const ownerRecord = await db.query.user.findFirst({
			where: eq(user.slug, owner)
		});

		if (!ownerRecord || ownerRecord.id !== locals.user.id) {
			return fail(403, { message: 'You do not have permission to edit this quiz.' });
		}

		const existingQuiz = await db.query.quizzes.findFirst({
			where: and(eq(quizzes.ownerId, ownerRecord.id), eq(quizzes.slug, quizSlug)),
			columns: { id: true },
			with: {
				speedRun: {
					columns: {
						id: true
					}
				}
			}
		});

		if (!existingQuiz) {
			return fail(404, { message: 'Quiz not found or you do not have permission to edit it.' });
		}

		const formData = await request.formData();

		if (existingQuiz.speedRun) {
			formData.set('quizMode', 'speed_run');
			if (!formData.get('speedRunConfig')) {
				return fail(400, { message: 'Speed run configuration is required.' });
			}
		}

		const result = await processQuizSubmission({
			formData,
			userId: locals.user.id,
			blobToken: env.BLOB_READ_WRITE_TOKEN,
			quizId: existingQuiz.id
		});

		if (!result.success) {
			return fail(400, { message: result.error || 'Failed to update quiz.' });
		}

		// If the slug changed, redirect to the new URL
		if (result.slug && result.slug !== quizSlug) {
			redirect(302, `/${owner}/${result.slug}/edit`);
		}

		return { success: true };
	}
};
