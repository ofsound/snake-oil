import { db } from '$lib/server/db';
import { quizzes } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const recentQuizzes = await db.query.quizzes.findMany({
		orderBy: desc(quizzes.createdAt),
		limit: 5,
		columns: {
			id: true,
			title: true,
			slug: true,
			description: true,
			createdAt: true
		},
		with: {
			owner: {
				columns: {
					name: true,
					slug: true
				}
			},
			speedRun: {
				columns: {
					id: true
				}
			}
		}
	});

	return {
		quizzes: recentQuizzes
	};
};
