import { and, eq, ne, notExists, sql } from 'drizzle-orm';

import type { Db } from '$lib/server/db';
import { quizzes, quizAnswers, user, speedRuns } from '$lib/server/db/schema';

export interface NextQuizResult {
	id: string;
	title: string;
	slug: string;
	creatorSlug: string;
}

export async function getNextQuiz(
	db: Db,
	options: {
		creatorId: string;
		currentQuizId: string;
		userId?: string;
		mode: 'regular' | 'speedrun';
	}
): Promise<NextQuizResult | null> {
	const { creatorId, currentQuizId, userId, mode } = options;

	// Build the base query conditions
	const baseConditions = [
		eq(quizzes.creatorId, creatorId),
		ne(quizzes.id, currentQuizId),
		eq(quizzes.visibility, 'public')
	];

	// Add mode-specific condition
	if (mode === 'speedrun') {
		// Speedrun mode: quizzes must have speedRuns association
		baseConditions.push(
			notExists(
				db.select().from(speedRuns).where(eq(speedRuns.quizId, quizzes.id)).limit(1).offset(1) // This subquery should NOT exist, so we use offset to make it return nothing
			)
		);
	} else {
		// Regular mode: quizzes must NOT have speedRuns association
		baseConditions.push(
			notExists(db.select().from(speedRuns).where(eq(speedRuns.quizId, quizzes.id)))
		);
	}

	// First, try to find an unplayed quiz (only if user is logged in)
	if (userId) {
		const unplayedQuiz = await db
			.select({
				id: quizzes.id,
				title: quizzes.title,
				slug: quizzes.slug,
				creatorSlug: user.slug
			})
			.from(quizzes)
			.innerJoin(user, eq(quizzes.creatorId, user.id))
			.where(
				and(
					...baseConditions,
					notExists(
						db
							.select()
							.from(quizAnswers)
							.where(and(eq(quizAnswers.quizId, quizzes.id), eq(quizAnswers.userId, userId)))
					)
				)
			)
			.orderBy(sql`RANDOM()`)
			.limit(1);

		if (unplayedQuiz.length > 0) {
			return unplayedQuiz[0];
		}
	}

	// Fallback: return a random quiz from the same creator with matching mode
	const fallbackQuiz = await db
		.select({
			id: quizzes.id,
			title: quizzes.title,
			slug: quizzes.slug,
			creatorSlug: user.slug
		})
		.from(quizzes)
		.innerJoin(user, eq(quizzes.creatorId, user.id))
		.where(and(...baseConditions))
		.orderBy(sql`RANDOM()`)
		.limit(1);

	return fallbackQuiz[0] ?? null;
}
