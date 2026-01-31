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

/**
 * Wrapper for useSession that accepts initial server-side session data.
 *
 * Better Auth's useSession accepts initial data at runtime, but TypeScript types
 * don't reflect this yet. Using `as any` is a pragmatic workaround.
 */
export function useSessionWithInitialData(initialData: { session: unknown; user: unknown } | null) {
	// Cast the entire function call to bypass TypeScript's strict checking
	// Better Auth accepts this at runtime even though types don't reflect it
	return (authClient.useSession as any)({ data: initialData });
}
