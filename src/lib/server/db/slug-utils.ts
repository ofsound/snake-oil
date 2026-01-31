import { db } from './index';
import { quizzes } from './schema';
import { eq, and, ne } from 'drizzle-orm';

/**
 * Utility functions for generating URL-friendly slugs
 */

/**
 * Checks if an error is a PostgreSQL unique constraint violation
 */
const isUniqueConstraintViolation = (error: unknown): boolean => {
	if (error && typeof error === 'object' && 'code' in error) {
		return error.code === '23505';
	}
	return false;
};

/**
 * Generates a unique slug by attempting the provided operation and retrying with
 * incremented suffixes if a unique constraint violation occurs.
 *
 * @param baseSlug - The base slug to use (will be used as-is if available)
 * @param operation - An async function that performs the database operation with a candidate slug
 * @param maxRetries - Maximum number of retry attempts (default: 100)
 * @returns The result of the operation that successfully completed
 * @throws The original error if it's not a unique constraint violation or max retries exceeded
 */
export async function generateUniqueSlug<T>(
	baseSlug: string,
	operation: (candidateSlug: string) => Promise<T>,
	maxRetries = 100
): Promise<T> {
	const base = baseSlug || 'quiz';
	let candidate = base;
	let counter = 2;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await operation(candidate);
		} catch (error) {
			// Only retry on unique constraint violations
			if (!isUniqueConstraintViolation(error)) {
				throw error;
			}

			// If we've exceeded max retries, throw an error
			if (attempt >= maxRetries) {
				throw new Error(
					`Failed to generate unique slug after ${maxRetries} attempts. Last candidate: ${candidate}`
				);
			}

			// Try next candidate
			candidate = `${base}-${counter}`;
			counter += 1;
		}
	}

	// This should never be reached, but TypeScript needs it
	throw new Error('Failed to generate unique slug');
}

/**
 * Finds a unique slug by querying the database for existing slugs and retrying with
 * incremented suffixes until a unique one is found. This is a query-only operation
 * that does not perform any database writes.
 *
 * @param baseSlug - The base slug to use (will be used as-is if available)
 * @param excludeQuizId - Optional quiz ID to exclude from uniqueness check (useful when updating)
 * @param maxRetries - Maximum number of retry attempts (default: 100)
 * @returns A promise that resolves to a unique slug string
 * @throws An error if max retries exceeded
 */
export async function findUniqueSlug(
	baseSlug: string,
	excludeQuizId?: string,
	maxRetries = 100
): Promise<string> {
	const base = baseSlug || 'quiz';
	let candidate = base;
	let counter = 2;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		// Build the where clause: check if slug exists, excluding the current quiz if provided
		const conditions = excludeQuizId
			? and(eq(quizzes.slug, candidate), ne(quizzes.id, excludeQuizId))
			: eq(quizzes.slug, candidate);

		const existing = await db
			.select({ id: quizzes.id })
			.from(quizzes)
			.where(conditions)
			.limit(1);

		// If no existing quiz found with this slug, it's unique
		if (existing.length === 0) {
			return candidate;
		}

		// If we've exceeded max retries, throw an error
		if (attempt >= maxRetries) {
			throw new Error(
				`Failed to find unique slug after ${maxRetries} attempts. Last candidate: ${candidate}`
			);
		}

		// Try next candidate
		candidate = `${base}-${counter}`;
		counter += 1;
	}

	// This should never be reached, but TypeScript needs it
	throw new Error('Failed to find unique slug');
}
