import { error, json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { speedRuns, speedRunResults, soundbites } from '$lib/server/db/schema';
import { eq, desc, asc, sql } from 'drizzle-orm';
import { checkMultipleChoiceCorrect } from '$lib/server/variant-utils';
import { calculateSpeedRunScore, calculateMaxStreak } from '$lib/speed-run/scoring';
import type { SpeedRunSubmitRequest, SpeedRunSubmitResponse } from '$lib/speed-run/types';
import type { MultipleChoiceConfig } from '$lib/variant-types';

/**
 * POST /api/speed-run/submit
 * Submits final speed run results
 * Validates all answers, calculates score, updates leaderboard
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body: SpeedRunSubmitRequest = await request.json();
		const { speedRunId, answers, startTime, endTime, displayName } = body;

		if (!speedRunId || !answers || !Array.isArray(answers)) {
			return json({ success: false, error: 'Invalid request format' } as SpeedRunSubmitResponse, {
				status: 400
			});
		}

		// Validate speed run exists
		const speedRun = await db.query.speedRuns.findFirst({
			where: eq(speedRuns.id, speedRunId),
			with: {
				quiz: {
					with: {
						soundbites: {
							orderBy: asc(soundbites.position)
						}
					}
				}
			}
		});

		if (!speedRun) {
			return json({ success: false, error: 'Speed run not found' } as SpeedRunSubmitResponse, {
				status: 404
			});
		}

		// Validate all answers against correct answers
		const soundbitesMap = new Map(speedRun.quiz.soundbites.map((sb) => [sb.id, sb]));

		const validatedAnswers = answers.map((answer) => {
			const soundbite = soundbitesMap.get(answer.soundbiteId);
			if (!soundbite) {
				return { ...answer, isCorrect: false };
			}

			let isCorrect = false;
			if (soundbite.variantType === 'multiple_choice') {
				const config = soundbite.variantConfig as MultipleChoiceConfig;
				isCorrect = checkMultipleChoiceCorrect(answer.guess, config);
			}

			return {
				...answer,
				isCorrect,
				variantType: soundbite.variantType,
				selectedOptionId: answer.guess
			};
		});

		const totalQuestions = validatedAnswers.length;
		const correctCount = validatedAnswers.filter((a) => a.isCorrect).length;
		const totalTimeMs = endTime - startTime;
		const streakMax = calculateMaxStreak(validatedAnswers);
		const score = calculateSpeedRunScore(correctCount, totalTimeMs);

		// Insert result
		const result = await db
			.insert(speedRunResults)
			.values({
				speedRunId,
				userId: locals.user?.id ?? null,
				displayName: displayName || locals.user?.name || 'Anonymous',
				answers: validatedAnswers,
				totalQuestions,
				correctCount,
				totalTimeMs,
				streakMax,
				score,
				createdAt: new Date()
			})
			.returning();

		// Get user's rank using COUNT query - O(1) instead of O(n)
		// Count how many results are BETTER than this one (higher correct, or same correct but faster, or tiebreaker)
		const rankResult = await db
			.select({
				count: sql<number>`COUNT(*) + 1`.as('rank')
			})
			.from(speedRunResults)
			.where(
				sql`${speedRunResults.speedRunId} = ${speedRunId} AND (
					${speedRunResults.correctCount} > ${correctCount}
					OR (
						${speedRunResults.correctCount} = ${correctCount}
						AND ${speedRunResults.totalTimeMs} < ${totalTimeMs}
					)
					OR (
						${speedRunResults.correctCount} = ${correctCount}
						AND ${speedRunResults.totalTimeMs} = ${totalTimeMs}
						AND ${speedRunResults.createdAt} < ${result[0].createdAt}
					)
				)`
			);

		const rank = rankResult[0]?.count ?? 1;

		// Get updated top 10 (LIMIT 10 query - always efficient)
		const top10Results = await db.query.speedRunResults.findMany({
			where: eq(speedRunResults.speedRunId, speedRunId),
			orderBy: [
				desc(speedRunResults.correctCount),
				asc(speedRunResults.totalTimeMs),
				asc(speedRunResults.createdAt)
			],
			limit: 10
		});

		const top10 = top10Results.map((r) => ({
			id: r.id,
			displayName: r.displayName,
			correctCount: r.correctCount,
			totalTimeMs: r.totalTimeMs,
			streakMax: r.streakMax,
			score: r.score,
			createdAt: r.createdAt,
			isCurrentUser: r.id === result[0].id
		}));

		const response: SpeedRunSubmitResponse = {
			success: true,
			result: {
				id: result[0].id,
				correctCount,
				totalTimeMs,
				score,
				streakMax
			},
			rank,
			top10
		};

		return json(response);
	} catch (err) {
		console.error('[API Submit Error]', err);
		return json({ success: false, error: 'Internal server error' } as SpeedRunSubmitResponse, {
			status: 500
		});
	}
};
