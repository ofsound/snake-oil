import { pgTable, text, boolean, timestamp, serial } from 'drizzle-orm/pg-core';

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

// Export types for type safety
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
