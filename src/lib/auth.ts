import { createAuthClient } from '@neondatabase/neon-js/auth';
import { env } from '$env/dynamic/public';

if (!env.PUBLIC_NEON_AUTH_URL) {
	throw new Error('PUBLIC_NEON_AUTH_URL is not set');
}

// The auth client automatically handles cookies in the browser
// Cookies should be set by Neon Auth when sign-in/sign-up succeeds
export const authClient = createAuthClient(env.PUBLIC_NEON_AUTH_URL);
