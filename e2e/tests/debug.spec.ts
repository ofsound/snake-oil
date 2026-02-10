import { test, expect } from '@playwright/test';

test('debug question numbers', async ({ page }) => {
	await page.goto('http://localhost:5173');

	// Check if there are any quizzes
	const quizLinks = await page.locator('a[href*="/"]').all();
	console.log('Found links:', quizLinks.length);

	// Navigate to a quiz if exists
	// This is just for debugging the question number format
});
