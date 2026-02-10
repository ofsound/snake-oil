import { test, expect } from '@playwright/test';
import path from 'node:path';

const TEST_AUDIO_PATH = path.join(process.cwd(), 'e2e/fixtures/test-audio.mp3');
const TEST_IMAGE_PATHS = [
	path.join(process.cwd(), 'e2e/fixtures/test-image-1.png'),
	path.join(process.cwd(), 'e2e/fixtures/test-image-2.png'),
	path.join(process.cwd(), 'e2e/fixtures/test-image-3.png'),
	path.join(process.cwd(), 'e2e/fixtures/test-image-4.png')
];

test.describe('Create Mega Quiz - All 7 Variants', () => {
	test('should create a quiz with all 7 variant types', async ({ page }) => {
		test.setTimeout(60000); // 60 seconds for this test
		const timestamp = Date.now();
		const quizTitle = `E2E 7 Variants ${timestamp}`;

		await page.goto('/create');
		await expect(page.locator('h1')).toContainText('Create Quiz');

		// Fill basic info
		await page.fill('input[name="title"]', quizTitle);
		await page.fill('textarea[name="description"]', 'Test quiz with all 7 variants');
		await page.waitForTimeout(300);

		// Get all soundbite cards - they're direct children of the flex-col container
		// Each soundbite is: <div class="flex"> <div>number.</div> <Card>content</Card> </div>
		const getSoundbiteSection = async (n: number) => {
			// Get the nth soundbite container (0-indexed)
			const sections = await page.locator('section > div.flex-col > div.flex').all();
			return sections[n];
		};

		// Configure 7 soundbites
		const configs = [
			{ type: 'simple_guess', fn: configureSimpleGuess },
			{ type: 'multiple_choice', fn: configureMultipleChoice },
			{ type: 'multiple_response', fn: configureMultipleResponse },
			{ type: 'sequence', fn: configureSequence },
			{ type: 'rank', fn: configureRank },
			{ type: 'multiple_match', fn: configureMultipleMatch },
			{ type: 'image_choice', fn: configureImageChoice }
		];

		for (let i = 0; i < configs.length; i++) {
			if (i > 0) {
				// Add new question
				await page.click('button:has-text("Add Question")');
				await page.waitForTimeout(800);
			}

			const section = await getSoundbiteSection(i);
			if (!section) {
				throw new Error(`Could not find soundbite section ${i}`);
			}

			console.log(`Configuring soundbite ${i + 1}: ${configs[i].type}`);
			await configs[i].fn(section, page);
		}

		// Submit form
		await page.click('button[type="submit"]');

		// Wait for success message and click "View quiz" link
		await page.waitForSelector('text=Quiz created successfully.', { timeout: 20000 });
		await page.click('a:has-text("View quiz")');

		// Wait for navigation to quiz page
		await page.waitForURL(/\/.+\/e2e-7-variants/, { timeout: 10000 });

		// Verify quiz was created
		await expect(page.locator('h1')).toContainText(quizTitle);
		const quizUrl = page.url();
		console.log(`✓ Successfully created quiz: ${quizUrl}`);
		process.env.E2E_MEGA_QUIZ_URL = quizUrl;
	});
});

async function configureSimpleGuess(section, page) {
	// Upload audio file
	const fileInput = section.locator('input[type="file"][accept*="audio"]').first();
	await fileInput.setInputFiles(TEST_AUDIO_PATH);
	await page.waitForTimeout(300);

	// Set correct answer
	const answerInput = section.locator('input[type="text"]').first();
	await answerInput.fill('testanswer, test answer');

	// Add prompt
	const promptInput = section.locator('textarea').first();
	await promptInput.fill('What is the answer to this question?');
}

async function configureMultipleChoice(section, page) {
	// Change variant type
	const select = section.locator('select').first();
	await select.selectOption('multiple_choice');
	await page.waitForTimeout(600);

	// Upload audio
	const fileInput = section.locator('input[type="file"][accept*="audio"]').first();
	await fileInput.setInputFiles(TEST_AUDIO_PATH);
	await page.waitForTimeout(300);

	// Add 2 more options (default has 2)
	const addButtons = await section.locator('button:has-text("Add Option")').all();
	for (let i = 0; i < 2 && i < addButtons.length; i++) {
		await addButtons[i].click();
		await page.waitForTimeout(200);
	}

	// Get all text inputs and fill them as options
	const textInputs = await section.locator('input[type="text"]').all();
	const optionInputs = textInputs.slice(0, 4); // First 4 are options
	for (let i = 0; i < optionInputs.length; i++) {
		await optionInputs[i].fill(`Option ${String.fromCharCode(65 + i)}`);
	}

	// Mark option B (index 1) as correct
	const radios = await section.locator('input[type="radio"]').all();
	if (radios.length >= 2) {
		await radios[1].check();
	}

	// Add prompt
	await section.locator('textarea').first().fill('Select the correct answer.');
}

async function configureMultipleResponse(section, page) {
	const select = section.locator('select').first();
	await select.selectOption('multiple_response');
	await page.waitForTimeout(600);

	const fileInput = section.locator('input[type="file"][accept*="audio"]').first();
	await fileInput.setInputFiles(TEST_AUDIO_PATH);
	await page.waitForTimeout(300);

	// Add 2 more options
	const addButtons = await section.locator('button:has-text("Add Option")').all();
	for (let i = 0; i < 2 && i < addButtons.length; i++) {
		await addButtons[i].click();
		await page.waitForTimeout(200);
	}

	const textInputs = await section.locator('input[type="text"]').all();
	for (let i = 0; i < 4 && i < textInputs.length; i++) {
		await textInputs[i].fill(`Response ${String.fromCharCode(65 + i)}`);
	}

	// Check options B and D (indices 1 and 3)
	const checkboxes = await section.locator('input[type="checkbox"]').all();
	if (checkboxes.length >= 2) await checkboxes[1].check();
	if (checkboxes.length >= 4) await checkboxes[3].check();

	await section.locator('textarea').first().fill('Select all correct responses.');
}

async function configureSequence(section, page) {
	const select = section.locator('select').first();
	await select.selectOption('sequence');
	await page.waitForTimeout(600);

	// Upload 3 audio files
	const fileInput = section.locator('input[type="file"][accept*="audio"]').first();
	await fileInput.setInputFiles([TEST_AUDIO_PATH, TEST_AUDIO_PATH, TEST_AUDIO_PATH]);
	await page.waitForTimeout(1000);

	// Click on the second track label to select it as correct
	const labels = await section.locator('label').all();
	if (labels.length >= 2) {
		await labels[1].click();
	}

	await section.locator('textarea').first().fill('Which track is the target?');
}

async function configureRank(section, page) {
	const select = section.locator('select').first();
	await select.selectOption('rank');
	await page.waitForTimeout(600);

	const fileInput = section.locator('input[type="file"][accept*="audio"]').first();
	await fileInput.setInputFiles([
		TEST_AUDIO_PATH,
		TEST_AUDIO_PATH,
		TEST_AUDIO_PATH,
		TEST_AUDIO_PATH
	]);
	await page.waitForTimeout(1000);

	await section.locator('textarea').first().fill('Rank these items from best to worst.');
}

async function configureMultipleMatch(section, page) {
	const select = section.locator('select').first();
	await select.selectOption('multiple_match');
	await page.waitForTimeout(600);

	const fileInput = section.locator('input[type="file"][accept*="audio"]').first();
	await fileInput.setInputFiles([
		TEST_AUDIO_PATH,
		TEST_AUDIO_PATH,
		TEST_AUDIO_PATH,
		TEST_AUDIO_PATH
	]);
	await page.waitForTimeout(1000);

	// Fill in answer labels for each uploaded item
	const answerInputs = await section.locator('input[type="text"][placeholder*="Guitar"]').all();
	for (let i = 0; i < answerInputs.length; i++) {
		await answerInputs[i].fill(`Answer ${i + 1}`);
	}

	await section.locator('textarea').first().fill('Match each item with its pair.');
}

async function configureImageChoice(section, page) {
	const select = section.locator('select').first();
	await select.selectOption('image_choice');
	await page.waitForTimeout(600);

	// Upload main audio
	const audioInput = section.locator('input[type="file"][accept*="audio"]').first();
	await audioInput.setInputFiles(TEST_AUDIO_PATH);
	await page.waitForTimeout(300);

	// Upload all 4 different images at once to the single image input
	const imageInput = section.locator('input[type="file"][accept*="image"]').first();
	await imageInput.setInputFiles(TEST_IMAGE_PATHS);
	await page.waitForTimeout(2000); // Wait for image processing and upload

	// Click on the second image button to mark it as correct
	const imageButtons = await section.locator('button[aria-label*="Select"]').all();
	if (imageButtons.length >= 2) {
		await imageButtons[1].click();
	}

	await section.locator('textarea').first().fill('Select the correct image.');
}
