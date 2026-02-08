#!/usr/bin/env node
/**
 * Script to promote the first admin user
 * Usage: node scripts/make-admin.cjs [email]
 * Default: ben@modernthings.net
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { neon } = require('@neondatabase/serverless');

const ADMIN_EMAIL = process.argv[2] || 'ben@modernthings.net';

async function makeAdmin() {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		console.error('❌ DATABASE_URL environment variable is not set');
		process.exit(1);
	}

	console.log(`🔍 Looking for user with email: ${ADMIN_EMAIL}`);

	const client = neon(databaseUrl);

	try {
		// Find user by email
		const users =
			await client`SELECT id, email, name, slug, role FROM "user" WHERE email = ${ADMIN_EMAIL}`;

		if (users.length === 0) {
			console.error(`❌ User with email ${ADMIN_EMAIL} not found`);
			console.log('💡 Make sure you have signed up with this email first');
			process.exit(1);
		}

		const targetUser = users[0];
		console.log(`✅ Found user: ${targetUser.name || targetUser.slug} (${targetUser.email})`);
		console.log(`📋 Current role: ${targetUser.role}`);

		// Update user role to admin
		await client`UPDATE "user" SET role = 'admin' WHERE id = ${targetUser.id}`;

		console.log(`✅ Successfully promoted ${ADMIN_EMAIL} to admin!`);
		console.log('🔐 You can now access the admin panel at /admin');
	} catch (error) {
		console.error('❌ Error:', error);
		process.exit(1);
	}
}

makeAdmin();
