/**
 * Route path constants
 * Centralized to prevent typos and make redirects easier to maintain
 */

const ROUTES = {
	HOME: '/',
	LOGIN: '/login',
	SIGNUP: '/signup',
	PROFILE: '/profile',
	QUIZZES: '/quizzes',
	CREATE: '/create',
	PLAYER: '/player'
} as const;

/**
 * Get login URL with redirect parameter
 */
export function getLoginUrl(redirectPath: string): string {
	return `${ROUTES.LOGIN}?redirect=${encodeURIComponent(redirectPath)}`;
}
