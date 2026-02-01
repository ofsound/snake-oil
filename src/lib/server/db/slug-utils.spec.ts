import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateUniqueSlug, findUniqueSlug } from './slug-utils';
import * as dbModule from './index';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock the database module
vi.mock('./index', () => ({
	db: {
		select: vi.fn(),
		query: {
			quizzes: {
				findFirst: vi.fn()
			}
		}
	}
}));

// Mock the schema
vi.mock('./schema', () => ({
	quizzes: {
		id: 'id',
		slug: 'slug'
	}
}));

describe('generateUniqueSlug', () => {
	it('returns base slug when operation succeeds', async () => {
		const operation = vi.fn().mockResolvedValue({ id: '123', slug: 'test-slug' });
		const result = await generateUniqueSlug('test-slug', operation);
		
		expect(result).toEqual({ id: '123', slug: 'test-slug' });
		expect(operation).toHaveBeenCalledTimes(1);
		expect(operation).toHaveBeenCalledWith('test-slug');
	});

	it('appends counter when slug exists', async () => {
		const operation = vi.fn()
			.mockRejectedValueOnce({ code: '23505' }) // unique constraint violation
			.mockResolvedValueOnce({ id: '123', slug: 'test-slug-2' });
		
		const result = await generateUniqueSlug('test-slug', operation);
		
		expect(result).toEqual({ id: '123', slug: 'test-slug-2' });
		expect(operation).toHaveBeenCalledTimes(2);
		expect(operation).toHaveBeenNthCalledWith(1, 'test-slug');
		expect(operation).toHaveBeenNthCalledWith(2, 'test-slug-2');
	});

	it('increments counter multiple times', async () => {
		const operation = vi.fn()
			.mockRejectedValueOnce({ code: '23505' })
			.mockRejectedValueOnce({ code: '23505' })
			.mockRejectedValueOnce({ code: '23505' })
			.mockResolvedValueOnce({ id: '123', slug: 'test-slug-4' });
		
		const result = await generateUniqueSlug('test-slug', operation);
		
		expect(result).toEqual({ id: '123', slug: 'test-slug-4' });
		expect(operation).toHaveBeenCalledTimes(4);
		expect(operation).toHaveBeenNthCalledWith(4, 'test-slug-4');
	});

	it('throws non-constraint errors immediately', async () => {
		const customError = new Error('Database connection failed');
		const operation = vi.fn().mockRejectedValue(customError);
		
		await expect(generateUniqueSlug('test-slug', operation)).rejects.toThrow('Database connection failed');
		expect(operation).toHaveBeenCalledTimes(1);
	});

	it('respects max retries limit', async () => {
		const operation = vi.fn().mockRejectedValue({ code: '23505' });
		
		await expect(generateUniqueSlug('test-slug', operation, 3)).rejects.toThrow(
			'Failed to generate unique slug after 3 attempts'
		);
		expect(operation).toHaveBeenCalledTimes(4); // initial + 3 retries
	});

	it('uses "quiz" as default when baseSlug is empty', async () => {
		const operation = vi.fn().mockResolvedValue({ id: '123', slug: 'quiz' });
		
		const result = await generateUniqueSlug('', operation);
		
		expect(result).toEqual({ id: '123', slug: 'quiz' });
		expect(operation).toHaveBeenCalledWith('quiz');
	});

	it('handles unique constraint violation with null code', async () => {
		const operation = vi.fn().mockRejectedValue({ code: null });
		
		await expect(generateUniqueSlug('test-slug', operation)).rejects.toEqual({ code: null });
		expect(operation).toHaveBeenCalledTimes(1);
	});
});

describe('findUniqueSlug', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns base slug if unique', async () => {
		const mockDb = dbModule.db as any;
		mockDb.select.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue([]) // no existing quiz
				})
			})
		});

		const result = await findUniqueSlug('unique-slug');
		
		expect(result).toBe('unique-slug');
	});

	it('appends counter for existing slugs', async () => {
		const mockDb = dbModule.db as any;
		mockDb.select
			.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: 'existing' }]) // slug exists
					})
				})
			})
			.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([]) // slug-2 is unique
					})
				})
			});

		const result = await findUniqueSlug('existing-slug');
		
		expect(result).toBe('existing-slug-2');
	});

	it('excludes quiz ID when updating', async () => {
		const mockDb = dbModule.db as any;
		mockDb.select.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue([]) // no conflict when excluding current quiz
				})
			})
		});

		const result = await findUniqueSlug('test-slug', 'quiz-id-123');
		
		expect(result).toBe('test-slug');
	});

	it('handles empty base slug', async () => {
		const mockDb = dbModule.db as any;
		mockDb.select.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue([])
				})
			})
		});

		const result = await findUniqueSlug('');
		
		expect(result).toBe('quiz');
	});

	it('respects max retries', async () => {
		const mockDb = dbModule.db as any;
		mockDb.select.mockReturnValue({
			from: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue([{ id: 'existing' }]) // always exists
				})
			})
		});

		await expect(findUniqueSlug('test-slug', undefined, 2)).rejects.toThrow(
			'Failed to find unique slug after 2 attempts'
		);
	});

	it('increments counter correctly through multiple attempts', async () => {
		const mockDb = dbModule.db as any;
		mockDb.select
			.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: '1' }])
					})
				})
			})
			.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: '2' }])
					})
				})
			})
			.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([{ id: '3' }])
					})
				})
			})
			.mockReturnValueOnce({
				from: vi.fn().mockReturnValue({
					where: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue([])
					})
				})
			});

		const result = await findUniqueSlug('popular-slug');
		
		expect(result).toBe('popular-slug-4');
	});
});
