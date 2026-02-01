import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect, fail } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

// Mock dependencies
vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		redirect: vi.fn((status: number, location: string) => {
			throw { status, location };
		}),
		fail: vi.fn((status: number, data: any) => ({ status, data }))
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
		insert: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema', () => ({
	quizzes: {},
	soundbites: {},
	tracks: {}
}));

vi.mock('$lib/server/db/slug-utils', () => ({
	generateUniqueSlug: vi.fn()
}));

// Import after mocks
import { load, actions } from './+page.server';
import { put } from '@vercel/blob';
import { db } from '$lib/server/db';
import { generateUniqueSlug } from '$lib/server/db/slug-utils';
import { env } from '$env/dynamic/private';

describe('create page - load function', () => {
	it('redirects unauthenticated users', async () => {
		const locals = { user: null } as any;
		
		await expect(load({ locals } as any)).rejects.toMatchObject({
			status: 302,
			location: '/'
		});
		
		expect(redirect).toHaveBeenCalledWith(302, '/');
	});

	it('allows authenticated users through', async () => {
		const locals = { user: { id: 'user-123', name: 'Test User' } } as any;
		
		const result = await load({ locals } as any);
		
		expect(result).toEqual({});
	});
});

describe('create page - action validation', () => {
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

	const createMockRequest = (formData: FormData): RequestEvent => ({
		request: {
			formData: async () => formData
		} as Request,
		locals: {
			user: { id: 'user-123', name: 'Test User' }
		}
	} as RequestEvent);

	it('requires authentication', async () => {
		const formData = createFormData({ title: 'Test Quiz' });
		const event = createMockRequest(formData);
		event.locals.user = null;

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 401,
			data: { message: 'You must be signed in to create a quiz.' }
		});
		expect(fail).toHaveBeenCalledWith(401, { message: 'You must be signed in to create a quiz.' });
	});

	it('validates title is required', async () => {
		const formData = createFormData({
			title: '',
			description: 'Test description',
			soundbiteDescription: ['Soundbite 1'],
			soundbiteFile: [new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })]
		});
		const event = createMockRequest(formData);

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
			soundbiteDescription: ['Soundbite 1'],
			soundbiteFile: [new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })]
		});
		const event = createMockRequest(formData);

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 400,
			data: { message: 'Description is required.' }
		});
	});

	it('validates title length <= 200 chars', async () => {
		const longTitle = 'a'.repeat(201);
		const formData = createFormData({
			title: longTitle,
			description: 'Test description',
			soundbiteDescription: ['Soundbite 1'],
			soundbiteFile: [new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })]
		});
		const event = createMockRequest(formData);

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 400,
			data: { message: 'Title must be 200 characters or less.' }
		});
	});

	it('validates description length <= 2000 chars', async () => {
		const longDescription = 'a'.repeat(2001);
		const formData = createFormData({
			title: 'Test Quiz',
			description: longDescription,
			soundbiteDescription: ['Soundbite 1'],
			soundbiteFile: [new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })]
		});
		const event = createMockRequest(formData);

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 400,
			data: { message: 'Description must be 2000 characters or less.' }
		});
	});

	it('validates at least one soundbite file is required', async () => {
		const formData = createFormData({
			title: 'Test Quiz',
			description: 'Test description',
			soundbiteDescription: [],
			soundbiteFile: []
		});
		const event = createMockRequest(formData);

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 400,
			data: { message: 'At least one SoundBite is required.' }
		});
	});

	it('validates each soundbite has an MP3 file', async () => {
		const emptyFile = new File([], 'empty.mp3', { type: 'audio/mpeg' });
		const formData = createFormData({
			title: 'Test Quiz',
			description: 'Test description',
			soundbiteDescription: ['Soundbite 1'],
			soundbiteFile: [emptyFile]
		});
		const event = createMockRequest(formData);

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 400,
			data: { message: 'Each SoundBite must include an MP3 file.' }
		});
	});

	it('validates soundbite descriptions match files count', async () => {
		const formData = createFormData({
			title: 'Test Quiz',
			description: 'Test description',
			soundbiteDescription: ['Soundbite 1', 'Soundbite 2'],
			soundbiteFile: [new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })]
		});
		const event = createMockRequest(formData);

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 400,
			data: { message: 'Each SoundBite needs a description and file.' }
		});
	});

	it('trims whitespace from inputs', async () => {
		const mockDb = db as any;
		mockDb.insert.mockReturnValue({
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([{ id: 'quiz-123', slug: 'test-quiz' }])
			})
		});

		vi.mocked(generateUniqueSlug).mockImplementation(async (slug, operation) => {
			return await operation(slug);
		});

		vi.mocked(put).mockResolvedValue({
			url: 'https://example.com/test.mp3',
			pathname: 'test.mp3'
		} as any);

		const formData = createFormData({
			title: '  Test Quiz  ',
			slug: '  custom-slug  ',
			description: '  Test description  ',
			soundbiteDescription: ['  Soundbite 1  '],
			soundbiteFile: [new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })]
		});
		const event = createMockRequest(formData);

		await actions.default(event);

		// Verify that insert was called with trimmed values
		const insertCall = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
		expect(insertCall.title).toBe('Test Quiz');
		expect(insertCall.description).toBe('Test description');
	});

	it('creates quiz successfully with valid data', async () => {
		const mockDb = db as any;
		mockDb.insert.mockReturnValue({
			values: vi.fn().mockReturnValue({
				returning: vi.fn().mockResolvedValue([{ id: 'quiz-123', slug: 'test-quiz' }])
			})
		});

		vi.mocked(generateUniqueSlug).mockImplementation(async (slug, operation) => {
			return await operation(slug);
		});

		vi.mocked(put).mockResolvedValue({
			url: 'https://example.com/test.mp3',
			pathname: 'test.mp3'
		} as any);

		const formData = createFormData({
			title: 'Test Quiz',
			description: 'Test description',
			soundbiteDescription: ['Soundbite 1'],
			soundbiteFile: [new File(['audio'], 'test.mp3', { type: 'audio/mpeg' })]
		});
		const event = createMockRequest(formData);

		const result = await actions.default(event);

		expect(result).toEqual({
			success: true,
			quizId: 'quiz-123',
			slug: 'test-quiz'
		});
	});

	it('handles blob storage not configured', async () => {
		const originalToken = env.BLOB_READ_WRITE_TOKEN;
		(env as any).BLOB_READ_WRITE_TOKEN = undefined;

		const formData = createFormData({
			title: 'Test Quiz',
			description: 'Test description'
		});
		const event = createMockRequest(formData);

		const result = await actions.default(event);

		expect(result).toEqual({
			status: 500,
			data: { message: 'Blob storage not configured.' }
		});

		(env as any).BLOB_READ_WRITE_TOKEN = originalToken;
	});
});