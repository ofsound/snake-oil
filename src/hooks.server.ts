import type { Handle } from '@sveltejs/kit';
import { auth } from '$lib/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { building } from '$app/environment';

export const handle: Handle = async ({ event, resolve }) => {
	// Session is read from the request Cookie header. For the server to see the session,
	// auth must run on the same origin as the app (VITE_NEON_AUTH_URL = app URL).
	// Otherwise the browser never sends auth cookies to this server (cross-origin).
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	// Make session and user available on server
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
