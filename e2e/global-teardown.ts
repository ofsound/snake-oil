import { Pool, neonConfig } from '@neondatabase/serverless';
import { del, list } from '@vercel/blob';
import { readdirSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import ws from 'ws';

// Load environment variables
config({ path: '.env' });

// Configure WebSocket for Node.js environment
neonConfig.webSocketConstructor = ws;

/**
 * Global teardown for Playwright E2E tests
 * Cleans up test users, quizzes, files, and Vercel Blob uploads after all tests complete
 */

// File to track test users created during this run
const TRACKING_FILE = join(process.cwd(), 'playwright', '.test-users.json');

async function globalTeardown() {
	console.log('\n🧹 Starting global teardown...');

	// Check if DATABASE_URL is available
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		console.error('  ❌ DATABASE_URL not found in environment');
		console.log('  ⚠️  Skipping database cleanup\n');
		cleanupAuthFile();
		return;
	}

	try {
		// Get list of test users from tracking file
		const testUsers = getTrackedUsers();

		if (testUsers.length === 0) {
			console.log('  ℹ️  No test users to clean up');
		} else {
			console.log(`  Found ${testUsers.length} test user(s) to clean up`);

			// Create database connection
			const pool = new Pool({ connectionString: databaseUrl });

			// First, clean up blobs (must do this before deleting DB records)
			for (const userEmail of testUsers) {
				await cleanupBlobs(pool, userEmail);
			}

			// Then clean up database users (cascades to related records)
			for (const userEmail of testUsers) {
				await cleanupUser(pool, userEmail);
			}

			// Close pool
			await pool.end();
		}

		// Clean up auth file and tracking file
		cleanupAuthFile();
		cleanupTrackingFile();

		// Wipe entire test blob store (only affects test environment)
		await wipeTestBlobStore();

		console.log('✅ Global teardown complete\n');
	} catch (error) {
		console.error('❌ Global teardown failed:', error);
		// Don't fail the test run if cleanup fails
	}
}

async function cleanupBlobs(pool: Pool, email: string) {
	try {
		console.log(`  🗑️  Cleaning up blobs for user: ${email}`);

		// Get user ID
		const userResult = await pool.query('SELECT id FROM "user" WHERE email = $1', [email]);
		if (userResult.rows.length === 0) {
			console.log(`  ⚠️  User not found, skipping blob cleanup: ${email}`);
			return;
		}
		const userId = userResult.rows[0].id;

		// Find all tracks (MP3 files) associated with this user's quizzes
		const tracksResult = await pool.query(
			`SELECT t.pathname 
			FROM tracks t
			JOIN soundbites sb ON sb.track_id = t.id
			JOIN quizzes q ON q.id = sb.quiz_id
			WHERE q.creator_id = $1`,
			[userId]
		);

		// Delete each track blob
		let deletedCount = 0;
		for (const row of tracksResult.rows) {
			if (row.pathname) {
				await deleteBlob(row.pathname);
				deletedCount++;
			}
		}

		// Find all image blobs from image_choice variants
		const imageResult = await pool.query(
			`SELECT sb.variant_config 
			FROM soundbites sb
			JOIN quizzes q ON q.id = sb.quiz_id
			WHERE q.creator_id = $1 AND sb.variant_type = 'image_choice'`,
			[userId]
		);

		// Extract and delete image blobs
		for (const row of imageResult.rows) {
			const config = row.variant_config;
			if (config && config.options) {
				for (const option of config.options) {
					if (option.pathname) {
						await deleteBlob(option.pathname);
						deletedCount++;
					}
				}
			}
		}

		if (deletedCount > 0) {
			console.log(`  ✅ Deleted ${deletedCount} blob(s) for user: ${email}`);
		}
	} catch (error) {
		console.error(`  ❌ Failed to cleanup blobs for ${email}:`, error);
	}
}

async function deleteBlob(pathname: string) {
	try {
		// Use Vercel Blob REST API to delete
		const token = process.env.BLOB_READ_WRITE_TOKEN;
		if (!token) {
			console.log('  ⚠️  BLOB_READ_WRITE_TOKEN not set, skipping blob deletion');
			return;
		}

		const response = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${token}`
			}
		});

		if (!response.ok && response.status !== 404) {
			console.log(`  ⚠️  Failed to delete blob ${pathname}: ${response.status}`);
		}
	} catch (error) {
		console.error(`  ⚠️  Error deleting blob ${pathname}:`, error);
	}
}

function getTrackedUsers(): string[] {
	try {
		if (existsSync(TRACKING_FILE)) {
			const data = readFileSync(TRACKING_FILE, 'utf-8');
			return JSON.parse(data);
		}
	} catch (_error) {
		console.error('  ⚠️  Error reading tracking file:', _error);
	}
	return [];
}

function cleanupTrackingFile() {
	try {
		if (existsSync(TRACKING_FILE)) {
			unlinkSync(TRACKING_FILE);
			console.log('  ✅ Deleted tracking file');
		}
	} catch {
		console.log('  ℹ️  No tracking file to clean up');
	}
}

async function cleanupUser(pool: Pool, email: string) {
	try {
		console.log(`  🗑️  Deleting user: ${email}`);

		// Delete user from database using raw SQL (cascades to related records)
		await pool.query('DELETE FROM "user" WHERE email = $1', [email]);

		console.log(`  ✅ Deleted user: ${email} (and all related data)`);
	} catch (error) {
		console.error(`  ❌ Failed to delete user ${email}:`, error);
	}
}

function cleanupAuthFile() {
	try {
		const authDir = join(process.cwd(), 'playwright', '.auth');
		const files = readdirSync(authDir);
		let cleaned = 0;

		for (const file of files) {
			if (file.endsWith('.json')) {
				unlinkSync(join(authDir, file));
				cleaned++;
			}
		}

		if (cleaned > 0) {
			console.log(`  ✅ Deleted ${cleaned} auth file(s)`);
		}
	} catch {
		console.log('  ℹ️  No auth files to clean up');
	}
}

async function wipeTestBlobStore() {
	try {
		const token = process.env.BLOB_READ_WRITE_TOKEN;
		if (!token) {
			console.log('  ⚠️  BLOB_READ_WRITE_TOKEN not set, skipping blob store wipe');
			return;
		}

		console.log('  🗑️  Wiping entire test blob store...');

		// List all blobs in test store
		const { blobs } = await list({ token });

		if (blobs.length === 0) {
			console.log('  ℹ️  Test blob store is already empty');
			return;
		}

		// Delete all blobs in batch
		await del(
			blobs.map((b) => b.url),
			{ token }
		);
		console.log(`  ✅ Wiped ${blobs.length} blob(s) from test store`);
	} catch (error) {
		console.error('  ❌ Failed to wipe test blob store:', error);
	}
}

export default globalTeardown;
