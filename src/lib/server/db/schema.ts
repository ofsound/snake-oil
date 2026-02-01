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
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => [uniqueIndex('user_slug_unique').on(table.slug)]
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
		ownerId: text('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		slug: text('slug').notNull(),
		description: text('description').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		uniqueIndex('quizzes_slug_unique').on(table.slug),
		index('quizzes_owner_idx').on(table.ownerId)
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
		description: text('description').notNull(),
		position: integer('position').notNull()
	},
	(table) => [
		index('soundbites_quiz_idx').on(table.quizId)
	]
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
		answers: jsonb('answers').$type<Record<string, string>>().notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [
		index('quiz_answers_quiz_idx').on(table.quizId),
		index('quiz_answers_user_idx').on(table.userId)
	]
);

// Relations
export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
	owner: one(user, {
		fields: [quizzes.ownerId],
		references: [user.id]
	}),
	soundbites: many(soundbites),
	quizAnswers: many(quizAnswers)
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

// Export types for type safety
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
