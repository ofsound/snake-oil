import {
	pgTable,
	text,
	boolean,
	timestamp,
	uuid,
	integer,
	jsonb,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Re-export variant types from shared file for convenience
// Using relative import for drizzle-kit compatibility
export {
	VARIANT_TYPES,
	VARIANT_LABELS,
	type VariantType,
	type MultipleChoiceOption,
	type MultipleResponseOption,
	type ImageChoiceOption,
	type SimpleGuessConfig,
	type MultipleChoiceConfig,
	type MultipleResponseConfig,
	type ImageChoiceConfig,
	type SequenceConfig,
	type SequenceTrack,
	type RankItem,
	type RankConfig,
	type MultipleMatchItem,
	type MultipleMatchConfig,
	type VariantConfig,
	type AnswerDetail,
	type AnswersPayload
} from '../../variant-types';

import type { VariantType, VariantConfig, AnswersPayload } from '../../variant-types';
import type { SpeedRunAnswer } from '../../speed-run/types';

// Better Auth core tables (see https://better-auth.com/docs/concepts/database)
export const user = pgTable(
	'user',
	{
		id: text('id').primaryKey(),
		email: text('email').notNull(),
		name: text('name'),
		slug: text('slug').notNull(),
		emailVerified: boolean('email_verified'),
		image: text('image'),
		bio: jsonb('bio').$type<Record<string, unknown> | null>(),
		role: text('role').notNull().default('user'),
		isSuspended: boolean('is_suspended').default(false),
		suspendedAt: timestamp('suspended_at'),
		suspendedReason: text('suspended_reason'),
		suspendedBy: text('suspended_by'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('user_slug_unique').on(table.slug),
		index('user_role_idx').on(table.role),
		index('user_suspended_idx').on(table.isSuspended)
	]
);

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	token: text('token').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	idToken: text('id_token'),
	password: text('password'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const tracks = pgTable('tracks', {
	id: uuid('id').defaultRandom().primaryKey(),
	name: text('name').notNull(),
	url: text('url').notNull(), // The Vercel Blob URL
	pathname: text('pathname'), // Useful for deleting the file later
	createdAt: timestamp('created_at').defaultNow()
});

export const quizzes = pgTable(
	'quizzes',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		creatorId: text('creator_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		slug: text('slug').notNull(),
		description: text('description').notNull(),
		visibility: text('visibility').notNull().default('public'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('quizzes_creator_slug_unique').on(table.creatorId, table.slug),
		index('quizzes_creator_idx').on(table.creatorId),
		index('quizzes_visibility_idx').on(table.visibility)
	]
);

export const soundbites = pgTable(
	'soundbites',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		quizId: uuid('quiz_id')
			.notNull()
			.references(() => quizzes.id, { onDelete: 'cascade' }),
		trackId: uuid('track_id')
			.notNull()
			.references(() => tracks.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		prompt: text('prompt'), // Optional prompt shown below audio player
		variantType: text('variant_type').$type<VariantType>().notNull().default('simple_guess'),
		variantConfig: jsonb('variant_config').$type<VariantConfig>().notNull()
	},
	(table) => [index('soundbites_quiz_idx').on(table.quizId)]
);

export const quizAnswers = pgTable(
	'quiz_answers',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		quizId: uuid('quiz_id')
			.notNull()
			.references(() => quizzes.id, { onDelete: 'cascade' }),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		displayName: text('display_name'),
		answers: jsonb('answers').$type<AnswersPayload>().notNull(),
		score: integer('score').notNull(), // Stored as percentage (0-100)
		totalCorrect: integer('total_correct').notNull(),
		totalQuestions: integer('total_questions').notNull(),
		completedAt: timestamp('completed_at'), // For future timer variants
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('quiz_answers_quiz_idx').on(table.quizId),
		index('quiz_answers_user_idx').on(table.userId)
	]
);

// Speed Run tables for timed quiz game mode
export const speedRuns = pgTable(
	'speed_runs',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		quizId: uuid('quiz_id')
			.notNull()
			.references(() => quizzes.id, { onDelete: 'cascade' }),
		defaultQuestionTimeLimit: integer('default_question_time_limit'), // Default seconds per question (NULL = untimed)
		revealDelayMs: integer('reveal_delay_ms').default(3000).notNull(), // Time to show answer before advancing
		audioLoopGapMs: integer('audio_loop_gap_ms').default(2000).notNull(), // Gap between loops for short audio
		enableStreakBonus: boolean('enable_streak_bonus').default(true).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [uniqueIndex('speed_runs_quiz_unique').on(table.quizId)]
);

export const speedRunResults = pgTable(
	'speed_run_results',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		speedRunId: uuid('speed_run_id')
			.notNull()
			.references(() => speedRuns.id, { onDelete: 'cascade' }),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }), // NULL for anonymous
		displayName: text('display_name').notNull(), // For anonymous users or name override
		answers: jsonb('answers').$type<SpeedRunAnswer[]>().notNull(), // Array of speed run answers
		totalQuestions: integer('total_questions').notNull(),
		correctCount: integer('correct_count').notNull(),
		totalTimeMs: integer('total_time_ms').notNull(), // From start to last answer
		streakMax: integer('streak_max').default(0).notNull(), // Highest streak achieved
		score: integer('score').notNull(), // Leaderboard score
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('speed_run_results_leaderboard_idx').on(
			table.speedRunId,
			table.correctCount.desc(),
			table.totalTimeMs.asc(),
			table.createdAt.asc()
		),
		index('speed_run_results_user_idx').on(table.userId)
	]
);

// Relations
export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
	creator: one(user, {
		fields: [quizzes.creatorId],
		references: [user.id]
	}),
	soundbites: many(soundbites),
	quizAnswers: many(quizAnswers),
	speedRun: one(speedRuns, {
		fields: [quizzes.id],
		references: [speedRuns.quizId]
	}),
	tags: many(quizTags)
}));

export const soundbitesRelations = relations(soundbites, ({ one }) => ({
	quiz: one(quizzes, {
		fields: [soundbites.quizId],
		references: [quizzes.id]
	}),
	track: one(tracks, {
		fields: [soundbites.trackId],
		references: [tracks.id]
	})
}));

export const tracksRelations = relations(tracks, ({ many }) => ({
	soundbites: many(soundbites)
}));

export const quizAnswersRelations = relations(quizAnswers, ({ one }) => ({
	quiz: one(quizzes, {
		fields: [quizAnswers.quizId],
		references: [quizzes.id]
	}),
	user: one(user, {
		fields: [quizAnswers.userId],
		references: [user.id]
	})
}));

// Speed Run relations
export const speedRunsRelations = relations(speedRuns, ({ one, many }) => ({
	quiz: one(quizzes, {
		fields: [speedRuns.quizId],
		references: [quizzes.id]
	}),
	results: many(speedRunResults)
}));

export const speedRunResultsRelations = relations(speedRunResults, ({ one }) => ({
	speedRun: one(speedRuns, {
		fields: [speedRunResults.speedRunId],
		references: [speedRuns.id]
	}),
	user: one(user, {
		fields: [speedRunResults.userId],
		references: [user.id]
	})
}));

// Tags table for quiz tagging system
export const tags = pgTable(
	'tags',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		label: text('label').notNull().unique(),
		slug: text('slug').notNull().unique(),
		useCount: integer('use_count').default(0).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' })
	},
	(table) => [
		index('tags_use_count_idx').on(table.useCount.desc()),
		index('tags_label_idx').on(table.label)
	]
);

// Quiz-Tag junction table (many-to-many)
export const quizTags = pgTable(
	'quiz_tags',
	{
		quizId: uuid('quiz_id')
			.notNull()
			.references(() => quizzes.id, { onDelete: 'cascade' }),
		tagId: uuid('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' }),
		addedAt: timestamp('added_at').defaultNow().notNull()
	},
	(table) => [uniqueIndex('quiz_tags_unique').on(table.quizId, table.tagId)]
);

// Tag co-occurrence table for "Related Tags" feature
export const tagCooccurrence = pgTable(
	'tag_cooccurrence',
	{
		tagId: uuid('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' }),
		relatedTagId: uuid('related_tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' }),
		cooccurrenceCount: integer('cooccurrence_count').default(1).notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('tag_cooccurrence_unique').on(table.tagId, table.relatedTagId),
		index('tag_cooccurrence_count_idx').on(table.cooccurrenceCount.desc())
	]
);

// Tag Relations
export const tagsRelations = relations(tags, ({ one, many }) => ({
	createdByUser: one(user, {
		fields: [tags.createdBy],
		references: [user.id]
	}),
	quizzes: many(quizTags),
	relatedTags: many(tagCooccurrence, { relationName: 'tag' })
}));

export const quizTagsRelations = relations(quizTags, ({ one }) => ({
	quiz: one(quizzes, {
		fields: [quizTags.quizId],
		references: [quizzes.id]
	}),
	tag: one(tags, {
		fields: [quizTags.tagId],
		references: [tags.id]
	})
}));

export const tagCooccurrenceRelations = relations(tagCooccurrence, ({ one }) => ({
	tag: one(tags, {
		fields: [tagCooccurrence.tagId],
		references: [tags.id],
		relationName: 'tag'
	}),
	relatedTag: one(tags, {
		fields: [tagCooccurrence.relatedTagId],
		references: [tags.id]
	})
}));

// Admin audit log table
export const adminActions = pgTable(
	'admin_actions',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		adminId: text('admin_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		action: text('action').notNull(),
		targetType: text('target_type').notNull(),
		targetId: text('target_id'),
		targetCreatorId: text('target_creator_id').references(() => user.id, { onDelete: 'set null' }),
		details: jsonb('details'),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('admin_actions_admin_idx').on(table.adminId),
		index('admin_actions_target_type_idx').on(table.targetType),
		index('admin_actions_target_id_idx').on(table.targetId),
		index('admin_actions_created_at_idx').on(table.createdAt.desc())
	]
);

// Content reports table for moderation
export const contentReports = pgTable(
	'content_reports',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		reporterId: text('reporter_id').references(() => user.id, { onDelete: 'set null' }),
		targetType: text('target_type').notNull(),
		targetId: text('target_id').notNull(),
		reason: text('reason').notNull(),
		status: text('status').notNull().default('pending'),
		resolvedBy: text('resolved_by').references(() => user.id, { onDelete: 'set null' }),
		resolution: text('resolution'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		resolvedAt: timestamp('resolved_at')
	},
	(table) => [
		index('content_reports_status_idx').on(table.status),
		index('content_reports_target_type_idx').on(table.targetType),
		index('content_reports_target_id_idx').on(table.targetId),
		index('content_reports_created_at_idx').on(table.createdAt.desc())
	]
);

// Admin actions relations
export const adminActionsRelations = relations(adminActions, ({ one }) => ({
	admin: one(user, {
		fields: [adminActions.adminId],
		references: [user.id]
	}),
	targetCreator: one(user, {
		fields: [adminActions.targetCreatorId],
		references: [user.id]
	})
}));

// Content reports relations
export const contentReportsRelations = relations(contentReports, ({ one }) => ({
	reporter: one(user, {
		fields: [contentReports.reporterId],
		references: [user.id]
	}),
	resolver: one(user, {
		fields: [contentReports.resolvedBy],
		references: [user.id]
	})
}));

// Update user relations to include new relationships
export const userRelations = relations(user, ({ one, many }) => ({
	adminActions: many(adminActions),
	targetedActions: many(adminActions, { relationName: 'targetCreator' }),
	reportsMade: many(contentReports, { relationName: 'reporter' }),
	reportsResolved: many(contentReports, { relationName: 'resolver' }),
	suspendedByUser: one(user, {
		fields: [user.suspendedBy],
		references: [user.id],
		relationName: 'suspendedByUser'
	})
}));

// Export types for type safety
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
export type Soundbite = typeof soundbites.$inferSelect;
export type NewSoundbite = typeof soundbites.$inferInsert;
export type QuizAnswer = typeof quizAnswers.$inferSelect;
export type NewQuizAnswer = typeof quizAnswers.$inferInsert;
export type SpeedRun = typeof speedRuns.$inferSelect;
export type NewSpeedRun = typeof speedRuns.$inferInsert;
export type SpeedRunResult = typeof speedRunResults.$inferSelect;
export type NewSpeedRunResult = typeof speedRunResults.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type QuizTag = typeof quizTags.$inferSelect;
export type NewQuizTag = typeof quizTags.$inferInsert;
export type TagCooccurrence = typeof tagCooccurrence.$inferSelect;
export type NewTagCooccurrence = typeof tagCooccurrence.$inferInsert;
export type AdminAction = typeof adminActions.$inferSelect;
export type NewAdminAction = typeof adminActions.$inferInsert;
export type ContentReport = typeof contentReports.$inferSelect;
export type NewContentReport = typeof contentReports.$inferInsert;

// User role type
export type UserRole = 'user' | 'moderator' | 'admin';
