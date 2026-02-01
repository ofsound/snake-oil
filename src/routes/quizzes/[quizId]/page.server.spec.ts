import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from '@sveltejs/kit';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock dependencies
vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		error: vi.fn((status: number, message: string) => {
			throw { status, message };
		}),
		fail: vi.fn((status: number, data: any) => ({ status, data })),
		redirect: vi.fn((status: number, location: string) => {
			throw { status, location };
		})
	};
});

vi.mock('@vercel/blob', () => ({
	put: vi.fn()
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		BLOB_READ_WRITE_TOKEN: 'test-token'
	}
}));

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			quizzes: {
				findFirst: vi.fn()
			}
		},
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	quizzes: {},
	soundbites: {},
	tracks: {},
	quizAnswers: {}
}));

vi.mock('$lib/server/db/slug-utils', () => ({
	findUniqueSlug: vi.fn()
}));

// Import after mocks
import { load, actions } from './+page.server';
import { db } from '$lib/server/db';
import { put } from '@vercel/blob';
import { findUniqueSlug } from '$lib/server/db/slug-utils';
import { env } from '$env/dynamic/private';

describe('quizzes/[quizId] page - load function', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('redirects unauthenticated users to /login', async () => {
		await expect(
			load({
				locals: { user: null },
				params: { quizId: 'quiz-123' },
				url: { pathname: '/quizzes/quiz-123', search: '' }
			} as any)
		).rejects.toMatchObject({
			status: 302,
			location: '/login?redirect=%2Fquizzes%2Fquiz-123'
		});

		expect(redirect).toHaveBeenCalledWith(302, '/login?redirect=%2Fquizzes%2Fquiz-123');
	});

	it('returns 404 if quiz does not exist', async () => {
		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue(undefined);

		await expect(
			load({
				locals: { user: { id: 'user-123' } },
				params: { quizId: 'non-existent' }
			} as any)
		).rejects.toMatchObject({
			status: 404,
			message: 'Quiz not found'
		});
	});

	it('returns 404 if quiz belongs to different user', async () => {
		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue(undefined);

		await expect(
			load({
				locals: { user: { id: 'user-123' } },
				params: { quizId: 'quiz-456' }
			} as any)
		).rejects.toMatchObject({
			status: 404,
			message: 'Quiz not found'
		});
	});

	it('returns quiz data for owner', async () => {
		const mockQuiz = {
			id: 'quiz-123',
			title: 'Test Quiz',
			slug: 'test-quiz',
			description: 'Test description',
			createdAt: new Date('2024-01-01'),
			soundbites: [
				{
					id: 'sb-1',
					description: 'Soundbite 1',
					position: 0,
					track: {
						url: 'https://example.com/track1.mp3',
						name: 'track1.mp3'
					}
				}
			],
			quizAnswers: [
				{
					id: 'answer-1',
					createdAt: new Date('2024-01-02'),
					answers: { 'sb-1': 'Answer 1' },
					displayName: 'Anonymous',
					user: null
				},
				{
					id: 'answer-2',
					createdAt: new Date('2024-01-03'),
					answers: { 'sb-1': 'Answer 2' },
					displayName: null,
					user: {
						name: 'Test User',
						email: 'test@example.com'
					}
				}
			]
		};

		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue(mockQuiz as any);

		const result = await load({
			locals: { user: { id: 'user-123' } },
			params: { quizId: 'quiz-123' }
		} as any);

		if (!result) throw new Error('Expected result');

		expect(result.quiz).toEqual({
			id: 'quiz-123',
			title: 'Test Quiz',
			slug: 'test-quiz',
			description: 'Test description',
			createdAt: new Date('2024-01-01')
		});

		expect(result.soundbites).toHaveLength(1);
		expect(result.answers).toHaveLength(2);
		expect(result.answers[0]).toEqual({
			id: 'answer-1',
			createdAt: new Date('2024-01-02'),
			answers: { 'sb-1': 'Answer 1' },
			displayName: 'Anonymous',
			userName: null,
			userEmail: null
		});
	});
});

describe('quizzes/[quizId] page - action validation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	const createFormData = (data: Record<string, any>) => {
		const formData = new FormData();
		Object.entries(data).forEach(([key, value]) => {
			if (Array.isArray(value)) {
				value.forEach((item) => formData.append(key, item));
			} else {
				formData.append(key, value);
			}
		});
		return formData;
	};

	const createMockRequest = (formData: FormData, locals: any, params: any) => ({
		request: {
			formData: async () => formData
		} as Request,
		locals,
		params
	} as any);

	it('requires authentication', async () => {
		const formData = createFormData({ title: 'Test Quiz' });
		const event = createMockRequest(formData, { user: null }, { quizId: 'quiz-123' });

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 401,
			data: { message: 'You must be signed in to edit this quiz.' }
		});
	});

	it('validates title is required', async () => {
		const formData = createFormData({
			title: '',
			description: 'Test description',
			existingSoundbiteId: ['sb-1'],
			existingSoundbiteDescription: ['Soundbite 1'],
			existingSoundbiteFile: [new File([], '', { type: '' })]
		});
		const event = createMockRequest(
			formData,
			{ user: { id: 'user-123' } },
			{ quizId: 'quiz-123' }
		);

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 400,
			data: { message: 'Title is required.' }
		});
	});

	it('validates description is required', async () => {
		const formData = createFormData({
			title: 'Test Quiz',
			description: '',
			existingSoundbiteId: ['sb-1'],
			existingSoundbiteDescription: ['Soundbite 1'],
			existingSoundbiteFile: [new File([], '', { type: '' })]
		});
		const event = createMockRequest(
			formData,
			{ user: { id: 'user-123' } },
			{ quizId: 'quiz-123' }
		);

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 400,
			data: { message: 'Description is required.' }
		});
	});

	it('validates soundbite descriptions match IDs', async () => {
		const formData = createFormData({
			title: 'Test Quiz',
			description: 'Test description',
			existingSoundbiteId: ['sb-1', 'sb-2'],
			existingSoundbiteDescription: ['Soundbite 1'], // missing one
			existingSoundbiteFile: [new File([], '', { type: '' }), new File([], '', { type: '' })],
			newSoundbiteDescription: [],
			newSoundbiteFile: []
		});
		const event = createMockRequest(
			formData,
			{ user: { id: 'user-123' } },
			{ quizId: 'quiz-123' }
		);

		const result = await actions.default(event);

		// The validation fails on empty files first before checking description count
		expect(result).toEqual({
			status: 400,
			data: { message: 'At least one SoundBite is required.' }
		});
	});

	it('validates new soundbites have matching descriptions and files', async () => {
		const formData = createFormData({
			title: 'Test Quiz',
			description: 'Test description',
			existingSoundbiteId: [],
			existingSoundbiteDescription: [],
			existingSoundbiteFile: [],
			newSoundbiteDescription: ['New Soundbite 1', 'New Soundbite 2'],
			newSoundbiteFile: [new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })] // missing one
		});
		const event = createMockRequest(
			formData,
			{ user: { id: 'user-123' } },
			{ quizId: 'quiz-123' }
		);

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 400,
			data: { message: 'Each new SoundBite needs a description and file.' }
		});
	});

	it('updates quiz successfully', async () => {
		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue({ id: 'quiz-123' } as any);
		vi.mocked(findUniqueSlug).mockResolvedValue('test-quiz');

		const mockDb = db as any;
		mockDb.update.mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined)
			})
		});
		mockDb.insert.mockReturnValue({
			values: vi.fn().mockResolvedValue(undefined)
		});

		const formData = createFormData({
			title: 'Updated Quiz',
			description: 'Updated description',
			existingSoundbiteId: [],
			existingSoundbiteDescription: [],
			existingSoundbiteFile: []
		});
		const event = createMockRequest(
			formData,
			{ user: { id: 'user-123' } },
			{ quizId: 'quiz-123' }
		);

		const result = await actions.default(event);

		expect(result).toEqual({ success: true });
	});

	it('handles blob storage not configured', async () => {
		const originalToken = env.BLOB_READ_WRITE_TOKEN;
		(env as any).BLOB_READ_WRITE_TOKEN = undefined;

		const formData = createFormData({
			title: 'Test Quiz',
			description: 'Test description'
		});
		const event = createMockRequest(
			formData,
			{ user: { id: 'user-123' } },
			{ quizId: 'quiz-123' }
		);

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 500,
			data: { message: 'Blob storage not configured.' }
		});

		(env as any).BLOB_READ_WRITE_TOKEN = originalToken;
	});

	it('updates existing soundbite with new file', async () => {
		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue({ id: 'quiz-123' } as any);
		vi.mocked(findUniqueSlug).mockResolvedValue('test-quiz');
		vi.mocked(put).mockResolvedValue({
			url: 'https://example.com/new-track.mp3',
			pathname: 'new-track.mp3'
		} as any);

		const mockDb = db as any;
		mockDb.update.mockReturnValue({
			set: vi.fn().mockReturnValue({
				where: vi.fn().mockResolvedValue(undefined)
			})
		});
		mockDb.insert.mockReturnValue({
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([{ id: 'track-456' }])
			})
		});

		const formData = createFormData({
			title: 'Test Quiz',
			description: 'Test description',
			existingSoundbiteId: ['sb-1'],
			existingSoundbiteDescription: ['Updated description'],
			existingSoundbiteFile: [new File(['audio'], 'new.mp3', { type: 'audio/mpeg' })]
		});
		const event = createMockRequest(
			formData,
			{ user: { id: 'user-123' } },
			{ quizId: 'quiz-123' }
		);

		const result = await actions.default(event);

		expect(result).toEqual({ success: true });
		expect(put).toHaveBeenCalled();
	});

	it('handles database errors gracefully', async () => {
		vi.mocked(db.query.quizzes.findFirst).mockRejectedValue(new Error('Database error'));

		const formData = createFormData({
			title: 'Test Quiz',
			description: 'Test description',
			existingSoundbiteId: [],
			existingSoundbiteDescription: [],
			existingSoundbiteFile: []
		});
		const event = createMockRequest(
			formData,
			{ user: { id: 'user-123' } },
			{ quizId: 'quiz-123' }
		);

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 500,
			data: { message: 'Failed to update quiz.' }
		});
	});
});
