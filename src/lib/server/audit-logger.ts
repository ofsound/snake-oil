import { db } from '$lib/server/db';
import { adminActions } from '$lib/server/db/schema';

/**
 * Log an admin action to the audit log
 * @param adminId - The ID of the admin performing the action
 * @param action - The action being performed (e.g., 'delete_quiz', 'suspend_user')
 * @param targetType - The type of target (e.g., 'quiz', 'user', 'tag')
 * @param targetId - The ID of the target (optional)
 * @param targetCreatorId - The ID of the target's creator (optional, for notifications)
 * @param details - Additional details about the action (optional)
 */
export async function logAdminAction(
	adminId: string,
	action: string,
	targetType: string,
	targetId?: string,
	targetCreatorId?: string,
	details?: Record<string, unknown>
): Promise<void> {
	await db.insert(adminActions).values({
		adminId,
		action,
		targetType,
		targetId,
		targetCreatorId,
		details: details ?? {},
		createdAt: new Date()
	});
}

/**
 * Common admin action types for consistency
 */
export const AdminActionTypes = {
	// Quiz actions
	DELETE_QUIZ: 'delete_quiz',
	EDIT_QUIZ: 'edit_quiz',
	FEATURE_QUIZ: 'feature_quiz',
	UNFEATURE_QUIZ: 'unfeature_quiz',

	// User actions
	SUSPEND_USER: 'suspend_user',
	UNSUSPEND_USER: 'unsuspend_user',
	PROMOTE_TO_MODERATOR: 'promote_to_moderator',
	DEMOTE_TO_USER: 'demote_to_user',
	BAN_USER: 'ban_user',

	// Tag actions
	CREATE_TAG: 'create_tag',
	UPDATE_TAG: 'update_tag',
	DELETE_TAG: 'delete_tag',
	MERGE_TAGS: 'merge_tags',

	// Speed run actions
	DELETE_SPEED_RUN_RESULT: 'delete_speed_run_result',
	CLEAR_LEADERBOARD: 'clear_leaderboard',

	// Report actions
	RESOLVE_REPORT: 'resolve_report',
	DISMISS_REPORT: 'dismiss_report'
} as const;

/**
 * Target types for consistency
 */
export const TargetTypes = {
	QUIZ: 'quiz',
	USER: 'user',
	TAG: 'tag',
	SPEED_RUN_RESULT: 'speed_run_result',
	REPORT: 'report'
} as const;
