import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e/tests',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	globalTeardown: './e2e/global-teardown.ts',
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on', // Always trace for UI mode
		screenshot: 'on',
		video: 'on'
	},
	projects: [
		{
			name: 'setup',
			testMatch: '**/*.setup.ts'
		},
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'playwright/.auth/user.json',
				viewport: { width: 1280, height: 720 }
			},
			dependencies: ['setup']
		}
	],
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: !process.env.CI
	}
});
