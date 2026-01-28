import { pgTable, text, boolean, timestamp, serial } from 'drizzle-orm/pg-core';

// Neon Auth user table structure (created by Neon Auth/Better Auth)
export const user = pgTable('user', {
	id: text('id').primaryKey(),
	email: text('email').notNull(),
	name: text('name'),
	emailVerified: boolean('emailVerified'),
	image: text('image'),
	createdAt: timestamp('createdAt').defaultNow().notNull(),
	updatedAt: timestamp('updatedAt').defaultNow().notNull()
});

export const tracks = pgTable('tracks', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	url: text('url').notNull(),       // The Vercel Blob URL
	pathname: text('pathname'),       // Useful for deleting the file later
	createdAt: timestamp('created_at').defaultNow()
});

// Export types for type safety
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;


