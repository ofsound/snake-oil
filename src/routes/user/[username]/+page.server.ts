import { error } from '@sveltejs/kit';
import { desc, eq, and, inArray } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { quizzes, user, quizTags, tags } from '$lib/server/db/schema';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// Validate slug parameter exists (param is named 'username' for backward compatibility)
	const userSlug = params.username;

	if (!userSlug) {
		error(400, 'User slug parameter is required');
	}

	// Query user by slug instead of name
	const userProfile = await db
		.select({
			id: user.id,
			email: user.email,
			name: user.name,
			slug: user.slug,
			emailVerified: user.emailVerified,
			image: user.image,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		})
		.from(user)
		.where(eq(user.slug, userSlug))
		.limit(1);

	if (!userProfile[0]) {
		error(404, 'User not found');
	}

	const foundUser = userProfile[0];

	// Fetch public quizzes owned by this user, ordered by creation date (newest first)
	const userQuizzes = await db.query.quizzes.findMany({
		where: and(eq(quizzes.creatorId, foundUser.id), eq(quizzes.visibility, 'public')),
		orderBy: desc(quizzes.createdAt),
		columns: {
			id: true,
			title: true,
			slug: true,
			description: true,
			createdAt: true
		},
		with: {
			speedRun: {
				columns: {
					id: true
				}
			},
			creator: {
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
		user: foundUser,
		quizzes: quizzesWithTags
	};
};
