import {
	pgTable,
	text,
	boolean,
	timestamp,
	serial,
	uuid,
	integer,
	jsonb,
	index,
	uniqueIndex
} from 'drizzle-orm/pg-core';

// Better Auth core tables (see https://better-auth.com/docs/concepts/database)
export const user = pgTable('user', {
	id: text('id').primaryKey(),
	email: text('email').notNull(),
	name: text('name'),
	emailVerified: boolean('emailVerified'),
	image: text('image'),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull()
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	token: text('token').notNull(),
	expiresAt: timestamp('expiresAt').notNull(),
	ipAddress: text('ipAddress'),
	userAgent: text('userAgent'),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull()
});

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	userId: text('userId')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accountId: text('accountId').notNull(),
	providerId: text('providerId').notNull(),
	accessToken: text('accessToken'),
	refreshToken: text('refreshToken'),
	accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
	refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
	scope: text('scope'),
	idToken: text('idToken'),
	password: text('password'),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull()
});

export const tracks = pgTable('tracks', {
	id: serial('id').primaryKey(),
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
	(table) => ({
		slugUnique: uniqueIndex('quizzes_slug_unique').on(table.slug),
		ownerIdx: index('quizzes_owner_idx').on(table.ownerId)
	})
);

export const soundbites = pgTable(
	'soundbites',
	{
		id: serial('id').primaryKey(),
		quizId: uuid('quiz_id')
			.notNull()
			.references(() => quizzes.id, { onDelete: 'cascade' }),
		trackId: integer('track_id')
			.notNull()
			.references(() => tracks.id, { onDelete: 'cascade' }),
		description: text('description').notNull(),
		position: integer('position').notNull()
	},
	(table) => ({
		quizIdx: index('soundbites_quiz_idx').on(table.quizId)
	})
);

export const quizAnswers = pgTable(
	'quiz_answers',
	{
		id: serial('id').primaryKey(),
		quizId: uuid('quiz_id')
			.notNull()
			.references(() => quizzes.id, { onDelete: 'cascade' }),
		userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
		displayName: text('display_name'),
		answers: jsonb('answers').$type<Record<string, string>>().notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => ({
		quizIdx: index('quiz_answers_quiz_idx').on(table.quizId),
		userIdx: index('quiz_answers_user_idx').on(table.userId)
	})
);

// Export types for type safety
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
