import type { Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';

import { auth } from '$lib/auth';
import { building } from '$app/environment';

export const handle: Handle = async ({ event, resolve }) => {
	// Populate session and user in locals for use in load functions.
	// svelteKitHandler handles auth API routes but doesn't populate locals,
	// so we fetch the session once here for all routes.
	const sessionResult = await auth.api.getSession({
		headers: event.request.headers
	});

	if (sessionResult?.session && sessionResult?.user) {
		// Assign session and user to locals
		Object.assign(event.locals, {
			session: sessionResult.session,
			user: sessionResult.user
		});
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
