import { db } from '$lib/server/db';
import { quizzes, quizAnswers, soundbites } from '$lib/server/db/schema';
import { error, fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad, RequestEvent } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const quiz = await db.query.quizzes.findFirst({
		where: eq(quizzes.slug, params.slug),
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
		description: soundbite.description,
		position: soundbite.position,
		trackUrl: soundbite.track.url,
		trackName: soundbite.track.name
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
