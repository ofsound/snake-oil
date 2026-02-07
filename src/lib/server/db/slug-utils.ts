import { eq, and, ne } from 'drizzle-orm';

import { db } from './index';
import { quizzes } from './schema';

/**
 * Utility functions for generating URL-friendly slugs
 */

/**
 * Finds a unique slug by querying the database for existing slugs and retrying with
 * incremented suffixes until a unique one is found. This is a query-only operation
 * that does not perform any database writes.
 *
 * Slugs are now unique per owner, not globally unique.
 *
 * @param baseSlug - The base slug to use (will be used as-is if available)
 * @param ownerId - The owner ID to check uniqueness against
 * @param excludeQuizId - Optional quiz ID to exclude from uniqueness check (useful when updating)
 * @param maxRetries - Maximum number of retry attempts (default: 100)
 * @returns A promise that resolves to a unique slug string
 * @throws An error if max retries exceeded
 */
export async function findUniqueSlug(
	baseSlug: string,
	ownerId: string,
	excludeQuizId?: string,
	maxRetries = 100
): Promise<string> {
	const base = baseSlug || 'quiz';
	let candidate = base;
	let counter = 2;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		// Build the where clause: check if (ownerId, slug) exists, excluding the current quiz if provided
		let conditions = and(eq(quizzes.ownerId, ownerId), eq(quizzes.slug, candidate));

		if (excludeQuizId) {
			conditions = and(conditions, ne(quizzes.id, excludeQuizId));
		}

		const existing = await db.select({ id: quizzes.id }).from(quizzes).where(conditions).limit(1);

		// If no existing quiz found with this (ownerId, slug) combination, it's unique
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
