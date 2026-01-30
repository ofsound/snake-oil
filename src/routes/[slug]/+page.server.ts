import { db } from '$lib/server/db';
import { quizzes, quizAnswers, soundbites, tracks } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
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
		.where(eq(quizzes.slug, params.slug))
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

	return {
		quiz,
		soundbites: soundbiteItems,
		user: locals.user ? { id: locals.user.id, name: locals.user.name, email: locals.user.email } : null
	};
};

const buildAnswersPayload = (formData: FormData) => {
	const ids = formData.getAll('soundbiteId').map((value) => String(value));
	const answers: Record<string, string> = {};

	for (const id of ids) {
		answers[id] = String(formData.get(`answer-${id}`) ?? '').trim();
	}

	return { ids, answers };
};

export const actions: Actions = {
	default: async ({ request, locals, params }: RequestEvent) => {
		const formData = await request.formData();
		const displayName = String(formData.get('displayName') ?? '').trim();
		const { ids, answers } = buildAnswersPayload(formData);

		if (!locals.user && !displayName) {
			return fail(400, { message: 'Please enter a display name.' });
		}

		if (ids.length === 0) {
			return fail(400, { message: 'No answers submitted.' });
		}

		const existingQuiz = await db
			.select({ id: quizzes.id })
			.from(quizzes)
			.where(eq(quizzes.slug, params.slug))
			.limit(1);

		if (existingQuiz.length === 0) {
			error(404, 'Quiz not found');
		}

		try {
			await db.insert(quizAnswers).values({
				quizId: existingQuiz[0].id,
				userId: locals.user?.id ?? null,
				displayName: locals.user ? null : displayName,
				answers
			});

			return { success: true };
		} catch (error) {
			console.error(error);
			return fail(500, { message: 'Failed to submit answers.' });
		}
	}
};
