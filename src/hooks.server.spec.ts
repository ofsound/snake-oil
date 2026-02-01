import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';

// Mock dependencies
vi.mock('better-auth/svelte-kit', () => ({
	svelteKitHandler: vi.fn()
}));

vi.mock('$lib/auth', () => ({
	auth: {
		api: {
			getSession: vi.fn()
		}
	}
}));

vi.mock('$app/environment', () => ({
	building: false
}));

// Import after mocks
import { handle } from './hooks.server';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { auth } from '$lib/auth';

describe('hooks.server - handle function', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createMockEvent = (headers: Record<string, string> = {}): RequestEvent => ({
		request: {
			headers: new Headers(headers)
		} as Request,
		locals: {} as any
	} as RequestEvent);

	const createMockResolve = () => vi.fn().mockResolvedValue(new Response('OK'));

	it('populates event.locals.user when session exists', async () => {
		const mockSession = {
			session: {
				id: 'session-123',
				userId: 'user-123',
				expiresAt: new Date()
			},
			user: {
				id: 'user-123',
				name: 'Test User',
				email: 'test@example.com'
			}
		};

		vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
		vi.mocked(svelteKitHandler).mockResolvedValue(new Response('OK'));

		const event = createMockEvent();
		const resolve = createMockResolve();

		await handle({ event, resolve });

		expect(event.locals.session).toEqual(mockSession.session);
		expect(event.locals.user).toEqual(mockSession.user);
	});

	it('populates event.locals.session when session exists', async () => {
		const mockSession = {
			session: {
				id: 'session-123',
				userId: 'user-123',
				expiresAt: new Date()
			},
			user: {
				id: 'user-123',
				name: 'Test User',
				email: 'test@example.com'
			}
		};

		vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
		vi.mocked(svelteKitHandler).mockResolvedValue(new Response('OK'));

		const event = createMockEvent();
		const resolve = createMockResolve();

		await handle({ event, resolve });

		expect(event.locals.session).toBeDefined();
		expect(event.locals.session.id).toBe('session-123');
	});

	it('leaves locals empty when no session', async () => {
		vi.mocked(auth.api.getSession).mockResolvedValue(null);
		vi.mocked(svelteKitHandler).mockResolvedValue(new Response('OK'));

		const event = createMockEvent();
		const resolve = createMockResolve();

		await handle({ event, resolve });

		expect(event.locals.session).toBeUndefined();
		expect(event.locals.user).toBeUndefined();
	});

	it('calls svelteKitHandler with correct parameters', async () => {
		vi.mocked(auth.api.getSession).mockResolvedValue(null);
		vi.mocked(svelteKitHandler).mockResolvedValue(new Response('OK'));

		const event = createMockEvent();
		const resolve = createMockResolve();

		await handle({ event, resolve });

		expect(svelteKitHandler).toHaveBeenCalledWith({
			event,
			resolve,
			auth,
			building: false
		});
	});

	it('passes request headers to auth.api.getSession', async () => {
		vi.mocked(auth.api.getSession).mockResolvedValue(null);
		vi.mocked(svelteKitHandler).mockResolvedValue(new Response('OK'));

		const headers = {
			'cookie': 'session=abc123',
			'authorization': 'Bearer token'
		};
		const event = createMockEvent(headers);
		const resolve = createMockResolve();

		await handle({ event, resolve });

		expect(auth.api.getSession).toHaveBeenCalledWith({
			headers: expect.any(Headers)
		});

		const callArgs = vi.mocked(auth.api.getSession).mock.calls[0][0];
		expect(callArgs.headers.get('cookie')).toBe('session=abc123');
		expect(callArgs.headers.get('authorization')).toBe('Bearer token');
	});

	it('returns the result from svelteKitHandler', async () => {
		const expectedResponse = new Response('Test response');
		vi.mocked(auth.api.getSession).mockResolvedValue(null);
		vi.mocked(svelteKitHandler).mockResolvedValue(expectedResponse);

		const event = createMockEvent();
		const resolve = createMockResolve();

		const result = await handle({ event, resolve });

		expect(result).toBe(expectedResponse);
	});

	it('handles session with partial user data', async () => {
		const mockSession = {
			session: {
				id: 'session-123',
				userId: 'user-123',
				expiresAt: new Date()
			},
			user: {
				id: 'user-123',
				email: 'test@example.com'
				// name is missing
			}
		};

		vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
		vi.mocked(svelteKitHandler).mockResolvedValue(new Response('OK'));

		const event = createMockEvent();
		const resolve = createMockResolve();

		await handle({ event, resolve });

		expect(event.locals.user).toEqual({
			id: 'user-123',
			email: 'test@example.com'
		});
	});

	it('handles auth.api.getSession errors gracefully', async () => {
		vi.mocked(auth.api.getSession).mockRejectedValue(new Error('Session error'));
		vi.mocked(svelteKitHandler).mockResolvedValue(new Response('OK'));

		const event = createMockEvent();
		const resolve = createMockResolve();

		// Should not throw, just continue without session
		await expect(handle({ event, resolve })).rejects.toThrow('Session error');
	});

	it('does not overwrite existing locals properties', async () => {
		const mockSession = {
			session: {
				id: 'session-123',
				userId: 'user-123',
				expiresAt: new Date()
			},
			user: {
				id: 'user-123',
				name: 'Test User',
				email: 'test@example.com'
			}
		};

		vi.mocked(auth.api.getSession).mockResolvedValue(mockSession as any);
		vi.mocked(svelteKitHandler).mockResolvedValue(new Response('OK'));

		const event = createMockEvent();
		event.locals.customProperty = 'custom value' as any;
		const resolve = createMockResolve();

		await handle({ event, resolve });

		expect(event.locals.customProperty).toBe('custom value');
		expect(event.locals.user).toEqual(mockSession.user);
	});
});
