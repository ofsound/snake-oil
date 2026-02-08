import { error } from '@sveltejs/kit';

import { and, eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { quizzes, user } from '$lib/server/db/schema';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	const { owner, quiz_slug: quizSlug } = params;

	// Find owner by slug
	const ownerRecord = await db.query.user.findFirst({
		where: eq(user.slug, owner)
	});

	if (!ownerRecord) {
		error(404, 'User not found');
	}

	// Find quiz by ownerId + slug
	const quiz = await db.query.quizzes.findFirst({
		where: and(eq(quizzes.ownerId, ownerRecord.id), eq(quizzes.slug, quizSlug)),
		with: {
			owner: true,
			speedRun: true
		}
	});

	if (!quiz) {
		error(404, 'Quiz not found');
	}

	// Check permissions using locals.user (not locals.auth())
	const currentUser = locals.user;

	const isOwner = currentUser?.id === quiz.ownerId;
	const isAdmin = currentUser?.role === 'admin';

	// Show nav only to owner (their quiz) or admin (any quiz)
	const showOwnerNav = isOwner || isAdmin;

	return {
		quiz: {
			id: quiz.id,
			title: quiz.title,
			slug: quiz.slug,
			owner: quiz.owner,
			hasSpeedRun: !!quiz.speedRun
		},
		showOwnerNav,
		isOwner,
		isAdmin
	};
};
