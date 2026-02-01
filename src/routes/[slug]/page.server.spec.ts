import { describe, it, expect, vi, beforeEach } from 'vitest';
import { error } from '@sveltejs/kit';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock dependencies
vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		error: vi.fn((status: number, message: string) => {
			throw { status, message };
		}),
		fail: vi.fn((status: number, data: any) => ({ status, data }))
	};
});

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			quizzes: {
				findFirst: vi.fn()
			}
		},
		insert: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	quizzes: {},
	quizAnswers: {},
	soundbites: {}
}));

// Import after mocks
import { load, actions } from './+page.server';
import { db } from '$lib/server/db';

describe('[slug] page - load function', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('loads quiz data successfully', async () => {
		const mockQuiz = {
			id: 'quiz-123',
			title: 'Test Quiz',
			slug: 'test-quiz',
			description: 'Test description',
			createdAt: new Date('2024-01-01'),
			owner: {
				id: 'user-123',
				name: 'Test User',
				slug: 'test-user'
			},
			soundbites: [
				{
					id: 'sb-1',
					description: 'Soundbite 1',
					position: 0,
					track: {
						url: 'https://example.com/track1.mp3',
						name: 'track1.mp3'
					}
				},
				{
					id: 'sb-2',
					description: 'Soundbite 2',
					position: 1,
					track: {
						url: 'https://example.com/track2.mp3',
						name: 'track2.mp3'
					}
				}
			]
		};

		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue(mockQuiz as any);

		const result = await load({
			params: { slug: 'test-quiz' },
			locals: { user: { id: 'user-123', name: 'Test User', email: 'test@example.com' } }
		} as any);

		if (!result) throw new Error('Expected result');

		expect(result.quiz).toEqual({
			id: 'quiz-123',
			title: 'Test Quiz',
			slug: 'test-quiz',
			description: 'Test description',
			createdAt: new Date('2024-01-01'),
			owner: {
				id: 'user-123',
				name: 'Test User',
				slug: 'test-user'
			}
		});

		expect(result.soundbites).toEqual([
			{
				id: 'sb-1',
				description: 'Soundbite 1',
				position: 0,
				trackUrl: 'https://example.com/track1.mp3',
				trackName: 'track1.mp3'
			},
			{
				id: 'sb-2',
				description: 'Soundbite 2',
				position: 1,
				trackUrl: 'https://example.com/track2.mp3',
				trackName: 'track2.mp3'
			}
		]);

		expect(result.user).toEqual({
			id: 'user-123',
			name: 'Test User',
			email: 'test@example.com'
		});
	});

	it('returns null user when not authenticated', async () => {
		const mockQuiz = {
			id: 'quiz-123',
			title: 'Test Quiz',
			slug: 'test-quiz',
			description: 'Test description',
			createdAt: new Date('2024-01-01'),
			owner: {
				id: 'user-123',
				name: 'Test User',
				slug: 'test-user'
			},
			soundbites: []
		};

		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue(mockQuiz as any);

		const result = await load({
			params: { slug: 'test-quiz' },
			locals: { user: null }
		} as any);

		if (!result) throw new Error('Expected result');

		expect(result.user).toBeNull();
	});

	it('throws 404 when quiz not found', async () => {
		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue(undefined);

		await expect(
			load({
				params: { slug: 'non-existent' },
				locals: { user: null }
			} as any)
		).rejects.toMatchObject({
			status: 404,
			message: 'Quiz not found'
		});

		expect(error).toHaveBeenCalledWith(404, 'Quiz not found');
	});
});

describe('[slug] page - action validation', () => {
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

	it('requires displayName for anonymous users', async () => {
		const formData = createFormData({
			displayName: '',
			soundbiteId: ['sb-1'],
			'answer-sb-1': 'Test answer'
		});
		const event = createMockRequest(formData, { user: null }, { slug: 'test-quiz' });

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 400,
			data: { message: 'Please enter a display name.' }
		});
	});

	it('allows authenticated users without displayName', async () => {
		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue({ id: 'quiz-123' } as any);

		const mockDb = db as any;
		mockDb.insert.mockReturnValue({
			values: vi.fn().mockResolvedValue(undefined)
		});

		const formData = createFormData({
			displayName: '',
			soundbiteId: ['sb-1'],
			'answer-sb-1': 'Test answer'
		});
		const event = createMockRequest(
			formData,
			{ user: { id: 'user-123', name: 'Test User' } },
			{ slug: 'test-quiz' }
		);

		const result = await actions.default(event);

		expect(result).toEqual({ success: true });
	});

	it('requires at least one answer', async () => {
		const formData = createFormData({
			displayName: 'Test User',
			soundbiteId: []
		});
		const event = createMockRequest(formData, { user: null }, { slug: 'test-quiz' });

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 400,
			data: { message: 'No answers submitted.' }
		});
	});

	it('throws 404 if quiz does not exist', async () => {
		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue(undefined);

		const formData = createFormData({
			displayName: 'Test User',
			soundbiteId: ['sb-1'],
			'answer-sb-1': 'Test answer'
		});
		const event = createMockRequest(formData, { user: null }, { slug: 'non-existent' });

		await expect(actions.default(event)).rejects.toMatchObject({
			status: 404,
			message: 'Quiz not found'
		});
	});

	it('builds answers payload correctly', async () => {
		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue({ id: 'quiz-123' } as any);

		const mockDb = db as any;
		const insertValuesMock = vi.fn().mockResolvedValue(undefined);
		mockDb.insert.mockReturnValue({
			values: insertValuesMock
		});

		const formData = createFormData({
			displayName: 'Test User',
			soundbiteId: ['sb-1', 'sb-2', 'sb-3'],
			'answer-sb-1': 'Answer 1',
			'answer-sb-2': '  Answer 2  ',
			'answer-sb-3': ''
		});
		const event = createMockRequest(formData, { user: null }, { slug: 'test-quiz' });

		await actions.default(event);

		expect(insertValuesMock).toHaveBeenCalledWith({
			quizId: 'quiz-123',
			userId: null,
			displayName: 'Test User',
			answers: {
				'sb-1': 'Answer 1',
				'sb-2': 'Answer 2',
				'sb-3': ''
			}
		});
	});

	it('trims answer values', async () => {
		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue({ id: 'quiz-123' } as any);

		const mockDb = db as any;
		const insertValuesMock = vi.fn().mockResolvedValue(undefined);
		mockDb.insert.mockReturnValue({
			values: insertValuesMock
		});

		const formData = createFormData({
			displayName: '  Test User  ',
			soundbiteId: ['sb-1'],
			'answer-sb-1': '  Test answer with spaces  '
		});
		const event = createMockRequest(formData, { user: null }, { slug: 'test-quiz' });

		await actions.default(event);

		const callArgs = insertValuesMock.mock.calls[0][0];
		expect(callArgs.displayName).toBe('Test User');
		expect(callArgs.answers['sb-1']).toBe('Test answer with spaces');
	});

	it('handles missing answers gracefully', async () => {
		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue({ id: 'quiz-123' } as any);

		const mockDb = db as any;
		const insertValuesMock = vi.fn().mockResolvedValue(undefined);
		mockDb.insert.mockReturnValue({
			values: insertValuesMock
		});

		const formData = createFormData({
			displayName: 'Test User',
			soundbiteId: ['sb-1', 'sb-2']
			// Only sb-1 has an answer
		});
		formData.append('answer-sb-1', 'Answer 1');

		const event = createMockRequest(formData, { user: null }, { slug: 'test-quiz' });

		await actions.default(event);

		const callArgs = insertValuesMock.mock.calls[0][0];
		expect(callArgs.answers).toEqual({
			'sb-1': 'Answer 1',
			'sb-2': ''
		});
	});

	it('stores userId when user is authenticated', async () => {
		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue({ id: 'quiz-123' } as any);

		const mockDb = db as any;
		const insertValuesMock = vi.fn().mockResolvedValue(undefined);
		mockDb.insert.mockReturnValue({
			values: insertValuesMock
		});

		const formData = createFormData({
			soundbiteId: ['sb-1'],
			'answer-sb-1': 'Test answer'
		});
		const event = createMockRequest(
			formData,
			{ user: { id: 'user-123', name: 'Test User' } },
			{ slug: 'test-quiz' }
		);

		await actions.default(event);

		const callArgs = insertValuesMock.mock.calls[0][0];
		expect(callArgs.userId).toBe('user-123');
		expect(callArgs.displayName).toBeNull();
	});

	it('returns success on successful submission', async () => {
		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue({ id: 'quiz-123' } as any);

		const mockDb = db as any;
		mockDb.insert.mockReturnValue({
			values: vi.fn().mockResolvedValue(undefined)
		});

		const formData = createFormData({
			displayName: 'Test User',
			soundbiteId: ['sb-1'],
			'answer-sb-1': 'Test answer'
		});
		const event = createMockRequest(formData, { user: null }, { slug: 'test-quiz' });

		const result = await actions.default(event);

		expect(result).toEqual({ success: true });
	});

	it('handles database errors gracefully', async () => {
		vi.mocked(db.query.quizzes.findFirst).mockResolvedValue({ id: 'quiz-123' } as any);

		const mockDb = db as any;
		mockDb.insert.mockReturnValue({
			values: vi.fn().mockRejectedValue(new Error('Database error'))
		});

		const formData = createFormData({
			displayName: 'Test User',
			soundbiteId: ['sb-1'],
			'answer-sb-1': 'Test answer'
		});
		const event = createMockRequest(formData, { user: null }, { slug: 'test-quiz' });

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 500,
			data: { message: 'Failed to submit answers.' }
		});
	});
});