import { test as setup } from '@playwright/test';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const authFile = 'playwright/.auth/user.json';
const trackingFile = join(process.cwd(), 'playwright', '.test-users.json');

// Helper to track test users
function trackUser(email: string) {
	const users: string[] = [];
	if (existsSync(trackingFile)) {
		try {
			const data = readFileSync(trackingFile, 'utf-8');
			users.push(...JSON.parse(data));
		} catch {
			// File might be empty or corrupted, start fresh
		}
	}
	users.push(email);
	writeFileSync(trackingFile, JSON.stringify(users, null, 2));
}

setup('authenticate', async ({ page }) => {
	const testEmail = `e2e-test-${Date.now()}@example.com`;
	const testPassword = 'TestPassword123!';
	const testName = `E2E User ${Date.now()}`;

	console.log('Starting auth setup...');

	// Navigate to signup page
	await page.goto('/signup');

	// Fill in signup form
	await page.fill('input[placeholder="Name"]', testName);
	await page.fill('input[type="email"]', testEmail);
	await page.fill('input[type="password"]', testPassword);

	// Submit form
	await page.click('form button[type="submit"]');

	// Wait for redirect to home page (user menu should appear)
	await page.waitForSelector('text=E2E User', { timeout: 15000 });
	console.log('✓ Signed up successfully');

	// Save storage state for reuse
	await page.context().storageState({ path: authFile });

	// Store credentials
	const slug = testName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
	process.env.E2E_TEST_USERNAME = slug;
	process.env.E2E_TEST_EMAIL = testEmail;

	// Track user for cleanup
	trackUser(testEmail);

	console.log(`✓ Auth setup complete: ${testEmail} (slug: ${slug})`);
});
