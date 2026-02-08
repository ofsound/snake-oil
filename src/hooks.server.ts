import { building } from '$app/environment';
import { error } from '@sveltejs/kit';

import { svelteKitHandler } from 'better-auth/svelte-kit';
import { eq } from 'drizzle-orm';

import { auth } from '$lib/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	// Populate session and user in locals for use in load functions.
	// svelteKitHandler handles auth API routes but doesn't populate locals,
	// so we fetch the session once here for all routes.
	const sessionResult = await auth.api.getSession({
		headers: event.request.headers
	});

	if (sessionResult?.session && sessionResult?.user) {
		// Check if user is suspended by querying the database
		const userRecord = await db.query.user.findFirst({
			where: eq(user.id, sessionResult.user.id),
			columns: {
				isSuspended: true
			}
		});

		if (userRecord?.isSuspended) {
			error(403, 'Your account has been suspended');
		}

		// Assign session and user to locals
		Object.assign(event.locals, {
			session: sessionResult.session,
			user: sessionResult.user
		});
	}

	return svelteKitHandler({ event, resolve, auth, building });
};
