import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { env } from '$env/dynamic/private';
import { createQuiz, handleCreateQuizResult } from '$lib/server/create-quiz';
import { getLoginUrl } from '$lib/constants/routes';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Check for active user session
	if (!locals.user) {
		// Capture the current URL and pass it to login for redirect after authentication
		const returnUrl = url.pathname + url.search;
		redirect(302, getLoginUrl(returnUrl));
	}

	// Return user data so the page can build correct URLs
	return {
		user: locals.user
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const userId = locals.user?.id;
		if (!userId) {
			return fail(401, { message: 'You must be signed in to create a quiz.' });
		}

		if (!env.BLOB_READ_WRITE_TOKEN) {
			return fail(500, { message: 'Blob storage not configured.' });
		}

		const result = await createQuiz({
			request,
			userId,
			blobToken: env.BLOB_READ_WRITE_TOKEN
		});

		return handleCreateQuizResult(result);
	}
};
