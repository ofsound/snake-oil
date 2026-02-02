import { createAuthClient } from 'better-auth/svelte';
import { env } from '$env/dynamic/public';

// Better Auth client can auto-detect baseURL if not provided
// For explicit configuration, use PUBLIC_ prefixed env vars in SvelteKit
// Fallback to import.meta.env for Vite compatibility during build
const baseURL =
	env.PUBLIC_BETTER_AUTH_BASE_URL ||
	(typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_BETTER_AUTH_BASE_URL) ||
	undefined; // undefined allows Better Auth to auto-detect

export const authClient = createAuthClient({
	...(baseURL && { baseURL })
});

// Type for signup with custom fields (slug)
// Better Auth's additionalFields are passed through to the signup endpoint
export interface SignUpWithSlug {
	email: string;
	password: string;
	name: string;
	slug: string;
}

/**
 * Sign up with additional slug field
 * Better Auth passes additional fields to the user table when configured with additionalFields
 */
export async function signUpWithSlug(data: SignUpWithSlug) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return authClient.signUp.email(data as any);
}
