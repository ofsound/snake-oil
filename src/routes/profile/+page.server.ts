import { redirect } from '@sveltejs/kit';

import { desc, eq, inArray } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { quizzes, quizTags, tags } from '$lib/server/db/schema';
import { getLoginUrl } from '$lib/constants/routes';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Ensure user is authenticated - Better Auth handles this in hooks.server.ts
	// but we can add explicit checks for protected routes
	if (!locals.user) {
		// Capture the current URL and pass it to login for redirect after authentication
		const returnUrl = url.pathname + url.search;
		redirect(302, getLoginUrl(returnUrl));
	}

	// Fetch all quizzes owned by the current user, ordered by creation date (newest first)
	const userQuizzes = await db.query.quizzes.findMany({
		where: eq(quizzes.ownerId, locals.user.id),
		orderBy: desc(quizzes.createdAt),
		columns: {
			id: true,
			title: true,
			slug: true,
			description: true,
			visibility: true,
			createdAt: true
		},
		with: {
			speedRun: {
				columns: {
					id: true
				}
			},
			owner: {
				columns: {
					slug: true,
					name: true
				}
			}
		}
	});

	// Fetch tags for all quizzes
	const quizIds = userQuizzes.map((q) => q.id);
	const tagsData =
		quizIds.length > 0
			? await db
					.select({
						quizId: quizTags.quizId,
						id: tags.id,
						label: tags.label,
						slug: tags.slug
					})
					.from(quizTags)
					.innerJoin(tags, eq(quizTags.tagId, tags.id))
					.where(inArray(quizTags.quizId, quizIds))
			: [];

	// Group tags by quiz
	const tagsByQuiz = new Map<string, typeof tagsData>();
	for (const tag of tagsData) {
		if (!tagsByQuiz.has(tag.quizId)) {
			tagsByQuiz.set(tag.quizId, []);
		}
		tagsByQuiz.get(tag.quizId)!.push(tag);
	}

	const quizzesWithTags = userQuizzes.map((quiz) => ({
		...quiz,
		tags: tagsByQuiz.get(quiz.id)?.map((t) => ({ id: t.id, label: t.label, slug: t.slug })) || []
	}));

	return {
		user: locals.user,
		profile: locals.user,
		quizzes: quizzesWithTags
	};
};
