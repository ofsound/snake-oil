import { eq, and } from 'drizzle-orm';

import type { Db } from './db/index.js';
import { quizTags, tags, tagCooccurrence } from './db/schema.js';

/**
 * Decrement use count for tags when they're removed from a public quiz
 */
export async function decrementTagCounts(db: Db, tagIds: string[]): Promise<void> {
	if (tagIds.length === 0) return;

	for (const tagId of tagIds) {
		// Get current count
		const tag = await db.query.tags.findFirst({
			where: eq(tags.id, tagId),
			columns: { useCount: true }
		});

		if (tag && tag.useCount > 0) {
			await db
				.update(tags)
				.set({ useCount: tag.useCount - 1 })
				.where(eq(tags.id, tagId));
		}
	}
}

/**
 * Get all tag IDs associated with a quiz
 */
export async function getQuizTagIds(db: Db, quizId: string): Promise<string[]> {
	const associations = await db.query.quizTags.findMany({
		where: eq(quizTags.quizId, quizId),
		columns: { tagId: true }
	});
	return associations.map((a) => a.tagId);
}

/**
 * Decrement co-occurrence counts for tag pairs
 */
export async function decrementTagCooccurrences(db: Db, tagIds: string[]): Promise<void> {
	if (tagIds.length < 2) return;

	for (let i = 0; i < tagIds.length; i++) {
		for (let j = i + 1; j < tagIds.length; j++) {
			const tagA = tagIds[i];
			const tagB = tagIds[j];

			// Decrement both directions
			const existingA = await db.query.tagCooccurrence.findFirst({
				where: and(eq(tagCooccurrence.tagId, tagA), eq(tagCooccurrence.relatedTagId, tagB))
			});

			if (existingA) {
				if (existingA.cooccurrenceCount <= 1) {
					// Remove if count would go to 0
					await db
						.delete(tagCooccurrence)
						.where(and(eq(tagCooccurrence.tagId, tagA), eq(tagCooccurrence.relatedTagId, tagB)));
				} else {
					await db
						.update(tagCooccurrence)
						.set({ cooccurrenceCount: existingA.cooccurrenceCount - 1 })
						.where(and(eq(tagCooccurrence.tagId, tagA), eq(tagCooccurrence.relatedTagId, tagB)));
				}
			}

			const existingB = await db.query.tagCooccurrence.findFirst({
				where: and(eq(tagCooccurrence.tagId, tagB), eq(tagCooccurrence.relatedTagId, tagA))
			});

			if (existingB) {
				if (existingB.cooccurrenceCount <= 1) {
					await db
						.delete(tagCooccurrence)
						.where(and(eq(tagCooccurrence.tagId, tagB), eq(tagCooccurrence.relatedTagId, tagA)));
				} else {
					await db
						.update(tagCooccurrence)
						.set({ cooccurrenceCount: existingB.cooccurrenceCount - 1 })
						.where(and(eq(tagCooccurrence.tagId, tagB), eq(tagCooccurrence.relatedTagId, tagA)));
				}
			}
		}
	}
}

/**
 * Handle tag count changes when a quiz is deleted or visibility changes
 * Call this BEFORE deleting the quiz or changing visibility
 */
export async function handleQuizTagRemoval(
	db: Db,
	quizId: string,
	wasPublic: boolean
): Promise<void> {
	if (!wasPublic) return;

	const tagIds = await getQuizTagIds(db, quizId);
	if (tagIds.length === 0) return;

	await decrementTagCounts(db, tagIds);
	await decrementTagCooccurrences(db, tagIds);
}
