import { env } from '$env/dynamic/public';
import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const handle: Handle = async ({ event, resolve }) => {
	// Get session from cookies using server-side fetch
	if (env.PUBLIC_NEON_AUTH_URL) {
		try {
			// Use event.fetch to preserve cookies automatically
			// Neon Auth API endpoint for getting session
			const response = await event.fetch(`${env.PUBLIC_NEON_AUTH_URL}/api/get-session`, {
				method: 'GET',
				credentials: 'include'
			});

			if (response.ok) {
				const result = await response.json();

				// Make session available in server-side code
				if (result.data?.session && result.data?.user) {
					const userId = result.data.session.userId;

					event.locals.session = {
						id: result.data.session.id,
						userId: userId,
						expiresAt: new Date(result.data.session.expiresAt)
					};

					// Query user email from database using Drizzle
					try {
						const dbUser = await db
							.select({
								id: user.id,
								email: user.email,
								name: user.name
							})
							.from(user)
							.where(eq(user.id, userId))
							.limit(1);

						if (dbUser.length > 0) {
							event.locals.user = {
								id: dbUser[0].id,
								email: dbUser[0].email,
								name: dbUser[0].name || undefined
							};
						} else {
							// Fallback to API response if user not found in DB
							event.locals.user = {
								id: result.data.user.id,
								email: result.data.user.email,
								name: result.data.user.name
							};
						}
					} catch (dbError) {
						// If database query fails, fallback to API response
						console.error('Error querying user from database:', dbError);
						event.locals.user = {
							id: result.data.user.id,
							email: result.data.user.email,
							name: result.data.user.name
						};
					}
				}
			}
		} catch {
			// If auth is not configured yet or request fails, continue without session
			// This is expected if PUBLIC_NEON_AUTH_URL is not set or auth is not provisioned
		}
	}

	return resolve(event);
};
