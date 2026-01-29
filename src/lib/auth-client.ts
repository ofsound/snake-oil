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

// Type-safe helper to use session with initial server data
// Better Auth's useSession accepts initial data at runtime, but TypeScript types don't reflect this yet
// This wrapper provides proper typing while maintaining runtime compatibility
type SessionData = typeof authClient.$Infer.Session;
type SessionStore = ReturnType<typeof authClient.useSession>;

// Extend the useSession signature to accept initial data
interface UseSessionOptions {
	data?: SessionData | null;
}

/**
 * Type-safe wrapper for useSession that accepts initial server-side session data.
 * 
 * Better Auth's useSession accepts initial data at runtime via { data: ... },
 * but the TypeScript types don't include this parameter yet. This function:
 * 1. Accepts the server data structure (which may differ from Better Auth's full type)
 * 2. Properly types the return value
 * 3. Uses an explicit type assertion (safer than @ts-expect-error) to pass data to useSession
 * 
 * @param initialData - Server-side session data from layout load function, or null
 * @returns The session store from Better Auth
 */
export function useSessionWithInitialData(
	initialData: { session: unknown; user: unknown } | null
): SessionStore {
	// Better Auth supports passing initial data at runtime even if types differ.
	// We use a type assertion that's more explicit than @ts-expect-error
	// because we're documenting the intentional type conversion.
	const session = (authClient.useSession as (options?: UseSessionOptions) => SessionStore)({
		data: (initialData as SessionData) ?? undefined
	});

	return session;
}

