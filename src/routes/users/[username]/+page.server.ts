import { error } from '@sveltejs/kit';
import { desc, eq, and } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { quizzes, user } from '$lib/server/db/schema';

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
		where: and(eq(quizzes.ownerId, foundUser.id), eq(quizzes.visibility, 'public')),
		orderBy: desc(quizzes.createdAt),
		columns: {
			id: true,
			title: true,
			slug: true,
			description: true,
			createdAt: true
		}
	});

	return {
		user: foundUser,
		quizzes: userQuizzes
	};
};
