import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { quizzes } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
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

	return {
		user: locals.user,
		profile: locals.user,
		quizzes: userQuizzes
	};
};
