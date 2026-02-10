import { error } from '@sveltejs/kit';

// Flexible user interface that works with both auth User and schema User
type UserLike = {
	id: string;
	role?: string;
	isSuspended?: boolean | null;
};

/**
 * Check if user has admin role
 */
export function isAdmin(user: UserLike | undefined): boolean {
	return user?.role === 'admin';
}

/**
 * Check if user has moderator or admin role
 */
export function isModeratorOrBetter(user: UserLike | undefined): boolean {
	return user?.role === 'admin' || user?.role === 'moderator';
}

/**
 * Check if user can delete any quiz
 * Only moderators and admins can delete any quiz
 */
export function canDeleteQuiz(user: UserLike | undefined): boolean {
	return isModeratorOrBetter(user);
}

/**
 * Check if user can suspend another user
 * Moderators can suspend regular users
 * Admins can suspend anyone including moderators
 */
export function canSuspendUser(
	currentUser: UserLike | undefined,
	targetUser: UserLike | undefined
): boolean {
	if (!currentUser || !targetUser) return false;
	if (!isModeratorOrBetter(currentUser)) return false;
	if (targetUser.role === 'admin') return false; // Cannot suspend admins
	if (targetUser.role === 'moderator' && currentUser.role !== 'admin') return false; // Only admins can suspend mods
	return true;
}

/**
 * Check if user can manage roles
 * Only admins can promote/demote users
 */
export function canManageRoles(user: UserLike | undefined): boolean {
	return isAdmin(user);
}

/**
 * Require moderator or admin role, throw 403 if not authorized
 */
export function requireModerator(locals: App.Locals): void {
	if (!isModeratorOrBetter(locals.user)) {
		error(403, 'Moderator access required');
	}
}
