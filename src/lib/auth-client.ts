import { createAuthClient } from 'better-auth/svelte';
import { inferAdditionalFields } from 'better-auth/client/plugins';
import { env } from '$env/dynamic/public';

// Better Auth client can auto-detect baseURL if not provided
// For explicit configuration, use PUBLIC_ prefixed env vars in SvelteKit
// Fallback to import.meta.env for Vite compatibility during build
const baseURL =
	env.PUBLIC_BETTER_AUTH_BASE_URL ||
	(typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_BETTER_AUTH_BASE_URL) ||
	undefined; // undefined allows Better Auth to auto-detect

// Define the additional fields to match server configuration
const additionalFields = {
	user: {
		slug: {
			type: 'string' as const,
			required: true as const
		}
	}
};

export const authClient = createAuthClient({
	...(baseURL && { baseURL }),
	plugins: [inferAdditionalFields(additionalFields)]
});

// Type for signup with custom fields (slug)
// Now properly typed through inferAdditionalFields plugin
interface SignUpWithSlug {
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
	// Type is now properly inferred through the inferAdditionalFields plugin
	return authClient.signUp.email(data);
}
