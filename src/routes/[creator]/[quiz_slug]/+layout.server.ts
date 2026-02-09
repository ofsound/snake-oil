import { error } from '@sveltejs/kit';

import { and, eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { quizzes, user } from '$lib/server/db/schema';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	const { creator, quiz_slug: quizSlug } = params;

	// Find creator by slug
	const creatorRecord = await db.query.user.findFirst({
		where: eq(user.slug, creator)
	});

	if (!creatorRecord) {
		error(404, 'User not found');
	}

	// Find quiz by creatorId + slug
	const quiz = await db.query.quizzes.findFirst({
		where: and(eq(quizzes.creatorId, creatorRecord.id), eq(quizzes.slug, quizSlug)),
		with: {
			creator: true,
			speedRun: true
		}
	});

	if (!quiz) {
		error(404, 'Quiz not found');
	}

	// Check permissions using locals.user (not locals.auth())
	const currentUser = locals.user;

	const isCreator = currentUser?.id === quiz.creatorId;
	const isAdmin = currentUser?.role === 'admin';

	// Show nav only to creator (their quiz) or admin (any quiz)
	const showCreatorNav = isCreator || isAdmin;

	return {
		quiz: {
			id: quiz.id,
			title: quiz.title,
			slug: quiz.slug,
			creator: quiz.creator,
			hasSpeedRun: !!quiz.speedRun
		},
		showCreatorNav,
		isCreator,
		isAdmin
	};
};
