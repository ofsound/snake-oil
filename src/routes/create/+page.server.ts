import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Check for active user session
	if (!locals.user) {
		redirect(302, '/');
	}

	// Return empty data for now since the page will be blank
	return {};
};