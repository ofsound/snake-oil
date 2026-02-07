import { eq, and, asc, desc } from 'drizzle-orm';
import { db } from './db/index.js';
import { quizzes, soundbites, tracks, speedRuns } from './db/schema.js';
import type { VariantConfig, VariantType } from '$lib/variant-types';

// Export the db type for use in other modules
export type Db = typeof db;

/**
 * Insert a new quiz
 */
export async function insertQuiz(
	db: Db,
	data: {
		ownerId: string;
		title: string;
		slug: string;
		description: string;
		visibility: 'public' | 'unlisted';
	}
) {
	const [quiz] = await db
		.insert(quizzes)
		.values({
			ownerId: data.ownerId,
			title: data.title,
			slug: data.slug,
			description: data.description,
			visibility: data.visibility
		})
		.returning({
			id: quizzes.id,
			slug: quizzes.slug
		});
	return quiz;
}

/**
 * Update an existing quiz
 */
export async function updateQuiz(
	db: Db,
	quizId: string,
	data: {
		title?: string;
		slug?: string;
		description?: string;
		visibility?: 'public' | 'unlisted';
	}
) {
	await db.update(quizzes).set(data).where(eq(quizzes.id, quizId));
}

/**
 * Find quiz by ID with ownership check
 */
export async function findQuizById(db: Db, quizId: string, ownerId: string) {
	return db.query.quizzes.findFirst({
		where: and(eq(quizzes.id, quizId), eq(quizzes.ownerId, ownerId)),
		columns: { id: true }
	});
}

/**
 * Insert a new soundbite
 */
export async function insertSoundbite(
	db: Db,
	data: {
		quizId: string;
		trackId: string;
		position: number;
		question: string | null;
		variantType: VariantType;
		variantConfig: VariantConfig;
	}
) {
	const [soundbite] = await db
		.insert(soundbites)
		.values({
			quizId: data.quizId,
			trackId: data.trackId,
			position: data.position,
			question: data.question,
			variantType: data.variantType,
			variantConfig: data.variantConfig
		})
		.returning({
			id: soundbites.id
		});
	return soundbite;
}

/**
 * Update an existing soundbite
 */
export async function updateSoundbite(
	db: Db,
	soundbiteId: string,
	data: {
		question?: string | null;
		variantType?: VariantType;
		variantConfig?: VariantConfig;
		trackId?: string;
	}
) {
	await db.update(soundbites).set(data).where(eq(soundbites.id, soundbiteId));
}

/**
 * Delete a soundbite by ID
 */
export async function deleteSoundbite(db: Db, soundbiteId: string) {
	await db.delete(soundbites).where(eq(soundbites.id, soundbiteId));
}

/**
 * Get soundbite with track info for cleanup
 */
export async function getSoundbiteWithTrack(db: Db, soundbiteId: string) {
	return db.query.soundbites.findFirst({
		where: eq(soundbites.id, soundbiteId),
		with: { track: true }
	});
}

/**
 * Get existing soundbites for a quiz, ordered by position
 */
export async function getQuizSoundbites(db: Db, quizId: string) {
	return db.query.soundbites.findMany({
		where: eq(soundbites.quizId, quizId),
		orderBy: asc(soundbites.position)
	});
}

/**
 * Get the maximum position of soundbites in a quiz
 */
export async function getMaxSoundbitePosition(db: Db, quizId: string): Promise<number> {
	const result = await db
		.select({ position: soundbites.position })
		.from(soundbites)
		.where(eq(soundbites.quizId, quizId))
		.orderBy(desc(soundbites.position))
		.limit(1);

	return result.length > 0 ? result[0].position : -1;
}

/**
 * Insert a new track
 */
export async function insertTrack(
	db: Db,
	data: {
		name: string;
		url: string;
		pathname: string | null;
	}
) {
	const [track] = await db
		.insert(tracks)
		.values({
			name: data.name,
			url: data.url,
			pathname: data.pathname
		})
		.returning({
			id: tracks.id
		});
	return track;
}

/**
 * Delete a track by ID
 */
export async function deleteTrack(db: Db, trackId: string) {
	await db.delete(tracks).where(eq(tracks.id, trackId));
}

/**
 * Insert speed run configuration
 */
export async function insertSpeedRun(
	db: Db,
	data: {
		quizId: string;
		defaultQuestionTimeLimit: number | null;
		revealDelayMs: number;
		audioLoopGapMs: number;
		enableStreakBonus: boolean;
	}
) {
	await db.insert(speedRuns).values({
		quizId: data.quizId,
		defaultQuestionTimeLimit: data.defaultQuestionTimeLimit,
		revealDelayMs: data.revealDelayMs,
		audioLoopGapMs: data.audioLoopGapMs,
		enableStreakBonus: data.enableStreakBonus
	});
}

/**
 * Update speed run configuration
 */
export async function updateSpeedRun(
	db: Db,
	quizId: string,
	data: {
		defaultQuestionTimeLimit?: number | null;
		revealDelayMs?: number;
		audioLoopGapMs?: number;
		enableStreakBonus?: boolean;
	}
) {
	await db.update(speedRuns).set(data).where(eq(speedRuns.quizId, quizId));
}

/**
 * Find speed run config by quiz ID
 */
export async function findSpeedRunByQuizId(db: Db, quizId: string) {
	return db.query.speedRuns.findFirst({
		where: eq(speedRuns.quizId, quizId)
	});
}

/**
 * Check if a slug is unique for an owner (excluding a specific quiz for edits)
 */
export async function isSlugUnique(
	db: Db,
	slug: string,
	ownerId: string,
	excludeQuizId?: string
): Promise<boolean> {
	const conditions = [eq(quizzes.slug, slug), eq(quizzes.ownerId, ownerId)];

	if (excludeQuizId) {
		conditions.push(eq(quizzes.id, excludeQuizId));
	}

	const existing = await db.query.quizzes.findFirst({
		where: and(...conditions),
		columns: { id: true }
	});

	return !existing;
}
