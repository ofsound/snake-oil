import { createAuthClient } from 'better-auth/svelte';
import { env } from '$env/dynamic/public';

// Better Auth client can auto-detect baseURL if not provided
// For explicit configuration, use PUBLIC_ prefixed env vars in SvelteKit
// Fallback to import.meta.env for Vite compatibility during build
const baseURL =
	env.PUBLIC_BETTER_AUTH_BASE_URL ||
	env.PUBLIC_BETTER_AUTH_URL ||
	(typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_BETTER_AUTH_BASE_URL) ||
	(typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_BETTER_AUTH_URL) ||
	undefined; // undefined allows Better Auth to auto-detect

export const authClient = createAuthClient({
	...(baseURL && { baseURL })
});
