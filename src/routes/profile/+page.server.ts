import { redirect } from '@sveltejs/kit';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Ensure user is authenticated - Better Auth handles this in hooks.server.ts
	// but we can add explicit checks for protected routes
	if (!locals.user) {
		redirect(302, '/login');
	}

	return {
		user: locals.user,
		profile: locals.user
	};
};
