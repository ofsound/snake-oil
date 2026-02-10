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

		// Collect all blob pathnames to delete
		const pathnames: string[] = [];

		// Find all tracks (MP3 files) associated with this user's quizzes
		const tracksResult = await pool.query(
			`SELECT t.pathname 
			FROM tracks t
			JOIN soundbites sb ON sb.track_id = t.id
			JOIN quizzes q ON q.id = sb.quiz_id
			WHERE q.creator_id = $1`,
			[userId]
		);

		for (const row of tracksResult.rows) {
			if (row.pathname) {
				pathnames.push(row.pathname);
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

		// Extract image blob pathnames
		for (const row of imageResult.rows) {
			const config = row.variant_config;
			if (config && config.options) {
				for (const option of config.options) {
					if (option.pathname) {
						pathnames.push(option.pathname);
					}
				}
			}
		}

		if (pathnames.length === 0) {
			return;
		}

		// Delete blobs in batches with delays to avoid rate limiting
		const BATCH_SIZE = 5;
		const DELAY_MS = 500;
		let deletedCount = 0;

		for (let i = 0; i < pathnames.length; i += BATCH_SIZE) {
			const batch = pathnames.slice(i, i + BATCH_SIZE);

			// Delete batch concurrently
			await Promise.all(batch.map((pathname) => deleteBlob(pathname)));
			deletedCount += batch.length;

			// Add delay between batches (except for the last batch)
			if (i + BATCH_SIZE < pathnames.length) {
				await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
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

		// Delete blobs in batches with delays to avoid rate limiting
		const BATCH_SIZE = 5;
		const DELAY_MS = 1000;
		const MAX_RETRIES = 3;
		let deletedCount = 0;
		let failedCount = 0;

		for (let i = 0; i < blobs.length; i += BATCH_SIZE) {
			const batch = blobs.slice(i, i + BATCH_SIZE);
			const batchUrls = batch.map((b) => b.url);

			// Retry logic for rate limiting
			let retries = 0;
			let success = false;

			while (retries < MAX_RETRIES && !success) {
				try {
					if (retries > 0) {
						// Exponential backoff: 1s, 2s, 4s
						const backoffMs = DELAY_MS * Math.pow(2, retries - 1);
						console.log(
							`  ⏳ Rate limited, retrying in ${backoffMs}ms (attempt ${retries + 1}/${MAX_RETRIES})...`
						);
						await new Promise((resolve) => setTimeout(resolve, backoffMs));
					}

					await del(batchUrls, { token });
					deletedCount += batch.length;
					success = true;
				} catch (error) {
					retries++;
					if (retries >= MAX_RETRIES) {
						console.error(`  ⚠️  Failed to delete batch after ${MAX_RETRIES} retries:`, error);
						failedCount += batch.length;
					}
				}
			}

			// Add delay between batches (except for the last batch)
			if (i + BATCH_SIZE < blobs.length) {
				await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
			}
		}

		if (failedCount > 0) {
			console.log(`  ⚠️  Wiped ${deletedCount} blob(s), ${failedCount} failed from test store`);
		} else {
			console.log(`  ✅ Wiped ${deletedCount} blob(s) from test store`);
		}
	} catch (error) {
		console.error('  ❌ Failed to wipe test blob store:', error);
	}
}

export default globalTeardown;
