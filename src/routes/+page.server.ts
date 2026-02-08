import { count, desc, eq, inArray } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { quizzes, quizTags, tags } from '$lib/server/db/schema';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	const recentQuizzes = await db.query.quizzes.findMany({
		where: eq(quizzes.visibility, 'public'),
		orderBy: desc(quizzes.createdAt),
		limit: 5,
		columns: {
			id: true,
			title: true,
			slug: true,
			description: true,
			createdAt: true
		},
		with: {
			owner: {
				columns: {
					name: true,
					slug: true
				}
			},
			speedRun: {
				columns: {
					id: true
				}
			}
		}
	});

	// Fetch tags for all quizzes
	const quizIds = recentQuizzes.map((q) => q.id);
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

	const quizzesWithTags = recentQuizzes.map((quiz) => ({
		...quiz,
		tags: tagsByQuiz.get(quiz.id)?.map((t) => ({ id: t.id, label: t.label, slug: t.slug })) || []
	}));

	// Get user's quiz count if logged in
	let userQuizCount = 0;
	if (user) {
		const result = await db
			.select({ count: count() })
			.from(quizzes)
			.where(eq(quizzes.ownerId, user.id));
		userQuizCount = result[0]?.count ?? 0;
	}

	return {
		quizzes: quizzesWithTags,
		user: user
			? {
					...user,
					quizCount: userQuizCount
				}
			: null
	};
};
