import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import * as schema from '$lib/server/db/schema';
import { env } from '$env/dynamic/private';

// Validate required environment variables
if (!env.BETTER_AUTH_SECRET) {
	throw new Error('BETTER_AUTH_SECRET is not set');
}

// Build trusted origins array
const trustedOrigins: string[] = [
	'http://localhost:5173', // Development
	'https://*.vercel.app' // All Vercel preview deployments
];

// Add production URL if available
if (env.PUBLIC_APP_URL) {
	trustedOrigins.push(env.PUBLIC_APP_URL);
}

// Also add auth URL origin if it's a different origin
const authBaseURL = env.PUBLIC_BETTER_AUTH_BASE_URL;
if (authBaseURL) {
	try {
		const authUrl = new URL(authBaseURL);
		if (!trustedOrigins.includes(authUrl.origin)) {
			trustedOrigins.push(authUrl.origin);
		}
	} catch {
		// Invalid URL, skip
	}
}

export const auth = betterAuth({
	baseURL: env.PUBLIC_BETTER_AUTH_BASE_URL,
	trustedOrigins,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account
		}
	}),
	emailAndPassword: {
		enabled: true
	},
	schema: {
		user: true,
		session: true
	},
	plugins: [sveltekitCookies(() => getRequestEvent())]
});

// Export Better Auth types for use in app.d.ts
export type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>['session']>;
export type User = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>['user']>;
