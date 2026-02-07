import { error } from '@sveltejs/kit';

import { requireModerator } from '$lib/server/permissions';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// Ensure user is moderator or admin
	requireModerator(locals);

	return {
		user: locals.user
	};
};
