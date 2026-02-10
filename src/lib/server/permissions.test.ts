import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	isAdmin,
	isModeratorOrBetter,
	canDeleteQuiz,
	canSuspendUser,
	canManageRoles,
	requireModerator
} from './permissions';

vi.mock('@sveltejs/kit', () => ({
	error: vi.fn((status: number, message: string) => {
		const err = new Error(message) as Error & { status?: number };
		err.status = status;
		throw err;
	})
}));

describe('permissions', () => {
	describe('isAdmin', () => {
		it('returns true for admin role', () => {
			expect(isAdmin({ id: '1', role: 'admin' })).toBe(true);
		});

		it('returns false for moderator', () => {
			expect(isAdmin({ id: '1', role: 'moderator' })).toBe(false);
		});

		it('returns false for user role', () => {
			expect(isAdmin({ id: '1', role: 'user' })).toBe(false);
		});

		it('returns false for undefined user', () => {
			expect(isAdmin(undefined)).toBe(false);
		});

		it('returns false for user with no role', () => {
			expect(isAdmin({ id: '1' })).toBe(false);
		});
	});

	describe('isModeratorOrBetter', () => {
		it('returns true for admin', () => {
			expect(isModeratorOrBetter({ id: '1', role: 'admin' })).toBe(true);
		});

		it('returns true for moderator', () => {
			expect(isModeratorOrBetter({ id: '1', role: 'moderator' })).toBe(true);
		});

		it('returns false for user role', () => {
			expect(isModeratorOrBetter({ id: '1', role: 'user' })).toBe(false);
		});

		it('returns false for undefined user', () => {
			expect(isModeratorOrBetter(undefined)).toBe(false);
		});
	});

	describe('canDeleteQuiz', () => {
		it('returns true for admin', () => {
			expect(canDeleteQuiz({ id: '1', role: 'admin' })).toBe(true);
		});

		it('returns true for moderator', () => {
			expect(canDeleteQuiz({ id: '1', role: 'moderator' })).toBe(true);
		});

		it('returns false for user', () => {
			expect(canDeleteQuiz({ id: '1', role: 'user' })).toBe(false);
		});

		it('returns false for undefined', () => {
			expect(canDeleteQuiz(undefined)).toBe(false);
		});
	});

	describe('canSuspendUser', () => {
		const regularUser = { id: 'u1', role: 'user' };
		const moderator = { id: 'm1', role: 'moderator' };
		const admin = { id: 'a1', role: 'admin' };

		it('returns false when currentUser is undefined', () => {
			expect(canSuspendUser(undefined, regularUser)).toBe(false);
		});

		it('returns false when targetUser is undefined', () => {
			expect(canSuspendUser(admin, undefined)).toBe(false);
		});

		it('returns false when regular user tries to suspend anyone', () => {
			expect(canSuspendUser(regularUser, regularUser)).toBe(false);
		});

		it('returns false when moderator tries to suspend admin', () => {
			expect(canSuspendUser(moderator, admin)).toBe(false);
		});

		it('returns false when moderator tries to suspend another moderator', () => {
			expect(canSuspendUser(moderator, { id: 'm2', role: 'moderator' })).toBe(false);
		});

		it('returns true when moderator suspends regular user', () => {
			expect(canSuspendUser(moderator, regularUser)).toBe(true);
		});

		it('returns true when admin suspends regular user', () => {
			expect(canSuspendUser(admin, regularUser)).toBe(true);
		});

		it('returns true when admin suspends moderator', () => {
			expect(canSuspendUser(admin, moderator)).toBe(true);
		});

		it('returns false when admin tries to suspend another admin', () => {
			expect(canSuspendUser(admin, { id: 'a2', role: 'admin' })).toBe(false);
		});
	});

	describe('canManageRoles', () => {
		it('returns true for admin', () => {
			expect(canManageRoles({ id: '1', role: 'admin' })).toBe(true);
		});

		it('returns false for moderator', () => {
			expect(canManageRoles({ id: '1', role: 'moderator' })).toBe(false);
		});

		it('returns false for user', () => {
			expect(canManageRoles({ id: '1', role: 'user' })).toBe(false);
		});

		it('returns false for undefined', () => {
			expect(canManageRoles(undefined)).toBe(false);
		});
	});

	describe('requireModerator', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('does not throw when user is admin', () => {
			expect(() =>
				requireModerator({ user: { id: '1', role: 'admin' } } as App.Locals)
			).not.toThrow();
		});

		it('does not throw when user is moderator', () => {
			expect(() =>
				requireModerator({ user: { id: '1', role: 'moderator' } } as App.Locals)
			).not.toThrow();
		});

		it('throws 403 when user is regular user', () => {
			expect(() => requireModerator({ user: { id: '1', role: 'user' } } as App.Locals)).toThrow(
				'Moderator access required'
			);
		});

		it('throws 403 when user is undefined', () => {
			expect(() => requireModerator({} as App.Locals)).toThrow('Moderator access required');
		});
	});
});
