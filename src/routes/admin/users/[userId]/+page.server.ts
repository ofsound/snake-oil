import { error, fail } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';

import { canSuspendUser, canManageRoles, isAdmin } from '$lib/server/permissions';
import { db } from '$lib/server/db';
import { user, quizzes, quizAnswers, speedRunResults, adminActions } from '$lib/server/db/schema';
import { logAdminAction, AdminActionTypes, TargetTypes } from '$lib/server/audit-logger';

import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const userId = params.userId;

	// Get the target user
	const targetUser = await db.query.user.findFirst({
		where: eq(user.id, userId),
		with: {
			suspendedByUser: {
				columns: {
					name: true,
					slug: true
				}
			}
		}
	});

	if (!targetUser) {
		error(404, 'User not found');
	}

	// Get user's quizzes
	const userQuizzes = await db.query.quizzes.findMany({
		where: eq(quizzes.ownerId, userId),
		orderBy: desc(quizzes.createdAt)
	});

	// Get user's submissions
	const submissions = await db.query.quizAnswers.findMany({
		where: eq(quizAnswers.userId, userId),
		orderBy: desc(quizAnswers.createdAt),
		with: {
			quiz: {
				columns: {
					title: true,
					slug: true
				},
				with: {
					owner: {
						columns: {
							slug: true
						}
					}
				}
			}
		}
	});

	// Get user's speed run results
	const speedRuns = await db.query.speedRunResults.findMany({
		where: eq(speedRunResults.userId, userId),
		orderBy: desc(speedRunResults.createdAt),
		with: {
			speedRun: {
				with: {
					quiz: {
						columns: {
							title: true,
							slug: true
						},
						with: {
							owner: {
								columns: {
									slug: true
								}
							}
						}
					}
				}
			}
		}
	});

	// Get recent admin actions related to this user
	const recentActions = await db.query.adminActions.findMany({
		where: eq(adminActions.targetId, userId),
		orderBy: desc(adminActions.createdAt),
		limit: 10,
		with: {
			admin: {
				columns: {
					name: true,
					slug: true
				}
			}
		}
	});

	// Calculate stats
	const stats = {
		quizCount: userQuizzes.length,
		submissionCount: submissions.length,
		speedRunCount: speedRuns.length,
		publicQuizzes: userQuizzes.filter((q) => q.visibility === 'public').length,
		privateQuizzes: userQuizzes.filter((q) => q.visibility === 'private').length
	};

	return {
		targetUser,
		quizzes: userQuizzes,
		submissions,
		speedRuns,
		recentActions,
		stats,
		canSuspend: canSuspendUser(locals.user, targetUser),
		canManageRole: canManageRoles(locals.user),
		isCurrentUserAdmin: isAdmin(locals.user)
	};
};

export const actions: Actions = {
	suspend: async ({ request, locals, params }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const userId = params.userId;

		// Get target user
		const targetUser = await db.query.user.findFirst({
			where: eq(user.id, userId)
		});

		if (!targetUser) {
			return fail(404, { error: 'User not found' });
		}

		// Check permissions
		if (!canSuspendUser(locals.user, targetUser)) {
			return fail(403, { error: 'You do not have permission to suspend this user' });
		}

		const formData = await request.formData();
		const reason = formData.get('reason')?.toString();

		if (!reason) {
			return fail(400, { error: 'Suspension reason is required' });
		}

		// Suspend the user
		await db
			.update(user)
			.set({
				isSuspended: true,
				suspendedAt: new Date(),
				suspendedReason: reason,
				suspendedBy: locals.user.id
			})
			.where(eq(user.id, userId));

		// Log the action
		await logAdminAction(
			locals.user.id,
			AdminActionTypes.SUSPEND_USER,
			TargetTypes.USER,
			userId,
			undefined,
			{ reason }
		);

		return { success: true };
	},

	unsuspend: async ({ locals, params }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const userId = params.userId;

		// Get target user
		const targetUser = await db.query.user.findFirst({
			where: eq(user.id, userId)
		});

		if (!targetUser) {
			return fail(404, { error: 'User not found' });
		}

		// Check permissions (same as suspend)
		if (!canSuspendUser(locals.user, targetUser)) {
			return fail(403, { error: 'You do not have permission to unsuspend this user' });
		}

		// Unsuspend the user
		await db
			.update(user)
			.set({
				isSuspended: false,
				suspendedAt: null,
				suspendedReason: null,
				suspendedBy: null
			})
			.where(eq(user.id, userId));

		// Log the action
		await logAdminAction(locals.user.id, AdminActionTypes.UNSUSPEND_USER, TargetTypes.USER, userId);

		return { success: true };
	},

	updateRole: async ({ request, locals, params }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		// Only admins can manage roles
		if (!canManageRoles(locals.user)) {
			return fail(403, { error: 'Only admins can manage user roles' });
		}

		const userId = params.userId;

		// Get target user
		const targetUser = await db.query.user.findFirst({
			where: eq(user.id, userId)
		});

		if (!targetUser) {
			return fail(404, { error: 'User not found' });
		}

		const formData = await request.formData();
		const newRole = formData.get('role')?.toString();

		if (!newRole || !['user', 'moderator', 'admin'].includes(newRole)) {
			return fail(400, { error: 'Invalid role' });
		}

		const oldRole = targetUser.role;

		// Update role
		await db.update(user).set({ role: newRole }).where(eq(user.id, userId));

		// Log the action
		const actionType =
			newRole === 'moderator' && oldRole === 'user'
				? AdminActionTypes.PROMOTE_TO_MODERATOR
				: newRole === 'user' && oldRole === 'moderator'
					? AdminActionTypes.DEMOTE_TO_USER
					: 'update_role';

		await logAdminAction(locals.user.id, actionType, TargetTypes.USER, userId, undefined, {
			oldRole,
			newRole
		});

		return { success: true };
	}
};
