import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

/** @type {import('./$types').PageServerLoad} */
export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated - Better Auth handles this in hooks.server.ts
	// but we can add explicit checks for protected routes
	if (!locals.user) {
		redirect(302, '/login');
	}

	// Fetch additional user profile data from database
	// locals.user contains the basic user info, but we can enrich it with more data
	const userProfile = await db
		.select({
			id: user.id,
			email: user.email,
			name: user.name,
			emailVerified: user.emailVerified,
			image: user.image,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		})
		.from(user)
		.where(eq(user.id, locals.user.id))
		.limit(1);

	if (!userProfile[0]) {
		// This shouldn't happen if locals.user exists, but just in case
		redirect(302, '/login');
	}

	return {
		user: locals.user,
		profile: userProfile[0]
	};
};
