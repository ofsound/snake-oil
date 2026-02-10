import type { Page } from '@playwright/test';

export interface QuizFormData {
	title: string;
	description: string;
	visibility?: 'public' | 'unlisted';
}

export async function fillQuizMetadata(page: Page, data: QuizFormData): Promise<void> {
	await page.fill('input[name="title"]', data.title);
	await page.fill('textarea[name="description"]', data.description);

	// Handle visibility toggle if needed
	if (data.visibility === 'unlisted') {
		// Click the toggle to switch to unlisted
		const toggle = page.locator('input[type="checkbox"]').first();
		await toggle.click();
	}
}

export async function addSoundbite(
	page: Page,
	index: number,
	variantType: string,
	audioFilePath: string,
	config: Record<string, unknown>
): Promise<void> {
	const prefix = `soundbite[${index}]`;

	// If not the first soundbite, click "Add Soundbite" button
	if (index > 0) {
		await page.click('button:has-text("Add Soundbite")');
		// Wait for the new soundbite section to appear
		await page.waitForTimeout(500);
	}

	// Select variant type
	const variantSelect = page.locator(`select[name="${prefix}.variantType"]`).last();
	await variantSelect.selectOption(variantType);
	await page.waitForTimeout(300); // Wait for variant editor to render

	// Upload audio file (if not sequence/rank/multiple_match)
	if (!['sequence', 'rank', 'multiple_match'].includes(variantType)) {
		const fileInput = page.locator(`input[name="${prefix}.file"]`).last();
		await fileInput.setInputFiles(audioFilePath);
	}

	// Configure variant-specific settings
	switch (variantType) {
		case 'simple_guess':
			await configureSimpleGuess(page, index, config.answers as string[]);
			break;
		case 'multiple_choice':
			await configureMultipleChoice(
				page,
				index,
				config.options as Array<{ text: string; isCorrect: boolean }>
			);
			break;
		case 'multiple_response':
			await configureMultipleResponse(
				page,
				index,
				config.options as Array<{ text: string; isCorrect: boolean }>
			);
			break;
		case 'image_choice':
			await configureImageChoice(
				page,
				index,
				config.options as Array<{ text: string; isCorrect: boolean }>,
				config.imageFiles as string[]
			);
			break;
		case 'sequence':
			await configureSequence(page, index, config.files as string[], config.correctIndex as number);
			break;
		case 'rank':
			await configureRank(
				page,
				index,
				config.files as string[],
				config.items as Array<{ text: string; rank: number }>
			);
			break;
		case 'multiple_match':
			await configureMultipleMatch(
				page,
				index,
				config.files as string[],
				config.items as Array<{ left: string; right: string }>
			);
			break;
	}
}

async function configureSimpleGuess(page: Page, index: number, answers: string[]): Promise<void> {
	const prefix = `soundbite[${index}]`;
	// Fill in the correct answers input
	const answersInput = page.locator(`input[id*="${prefix}"][placeholder*="answers"]`).last();
	await answersInput.fill(answers.join(', '));
}

async function configureMultipleChoice(
	page: Page,
	index: number,
	options: Array<{ text: string; isCorrect: boolean }>
): Promise<void> {
	const prefix = `soundbite[${index}]`;

	for (let i = 0; i < options.length; i++) {
		const option = options[i];

		// If we need more than 2 options (the default), click "Add Option"
		if (i >= 2) {
			const addButton = page.locator(`button:has-text("Add Option")`).nth(index);
			await addButton.click();
			await page.waitForTimeout(200);
		}

		// Fill option text
		const optionInputs = page.locator(`input[id*="${prefix}"][placeholder*="Option"]`).all();
		const optionInput = optionInputs[i];
		await optionInput.fill(option.text);

		// Mark as correct if needed
		if (option.isCorrect) {
			const radioButtons = page.locator(`input[type="radio"][name*="${prefix}"]`).all();
			await radioButtons[i].check();
		}
	}
}

async function configureMultipleResponse(
	page: Page,
	index: number,
	options: Array<{ text: string; isCorrect: boolean }>
): Promise<void> {
	const prefix = `soundbite[${index}]`;

	for (let i = 0; i < options.length; i++) {
		const option = options[i];

		// If we need more than 2 options (the default), click "Add Option"
		if (i >= 2) {
			const addButton = page.locator(`button:has-text("Add Option")`).nth(index);
			await addButton.click();
			await page.waitForTimeout(200);
		}

		// Fill option text
		const optionInputs = page.locator(`input[id*="${prefix}"][placeholder*="Option"]`).all();
		await optionInputs[i].fill(option.text);

		// Mark as correct if needed (checkbox for multiple response)
		if (option.isCorrect) {
			const checkboxes = page.locator(`input[type="checkbox"][name*="${prefix}"]`).all();
			await checkboxes[i].check();
		}
	}
}

async function configureImageChoice(
	page: Page,
	index: number,
	options: Array<{ text: string; isCorrect: boolean }>,
	imageFiles: string[]
): Promise<void> {
	const prefix = `soundbite[${index}]`;

	for (let i = 0; i < options.length; i++) {
		const option = options[i];

		// Add option if needed
		if (i >= 2) {
			const addButton = page.locator(`button:has-text("Add Option")`).nth(index);
			await addButton.click();
			await page.waitForTimeout(200);
		}

		// Fill option label
		const optionInputs = page.locator(`input[id*="${prefix}"][placeholder*="Label"]`).all();
		await optionInputs[i].fill(option.text);

		// Upload image for this option
		const imageInput = page
			.locator(`input[type="file"][accept*="image"]`)
			.nth(index * options.length + i);
		await imageInput.setInputFiles(imageFiles[i]);

		// Mark as correct if needed
		if (option.isCorrect) {
			const radioButtons = page.locator(`input[type="radio"][name*="${prefix}"]`).all();
			await radioButtons[i].check();
		}
	}
}

async function configureSequence(
	page: Page,
	index: number,
	files: string[],
	correctIndex: number
): Promise<void> {
	const prefix = `soundbite[${index}]`;

	for (let i = 0; i < files.length; i++) {
		// Click "Add Track" for each file after the first
		if (i > 0) {
			const addButton = page.locator(`button:has-text("Add Track")`).nth(index);
			await addButton.click();
			await page.waitForTimeout(200);
		}

		// Upload file
		const fileInputs = page.locator(`input[name*="${prefix}"][accept*="audio"]`).all();
		await fileInputs[i].setInputFiles(files[i]);

		// Optionally add track name
		const trackNameInputs = page.locator(`input[placeholder*="Track"]`).all();
		if (trackNameInputs[i]) {
			await trackNameInputs[i].fill(`Track ${i + 1}`);
		}
	}

	// Select correct track
	const correctSelect = page.locator(`select[name*="${prefix}"]`).last();
	await correctSelect.selectOption(correctIndex.toString());
}

async function configureRank(
	page: Page,
	index: number,
	files: string[],
	items: Array<{ text: string; rank: number }>
): Promise<void> {
	const prefix = `soundbite[${index}]`;

	for (let i = 0; i < files.length; i++) {
		// Click "Add Item" for each file after the first
		if (i > 0) {
			const addButton = page.locator(`button:has-text("Add Item")`).nth(index);
			await addButton.click();
			await page.waitForTimeout(200);
		}

		// Upload file
		const fileInputs = page.locator(`input[name*="${prefix}"][accept*="audio"]`).all();
		await fileInputs[i].setInputFiles(files[i]);

		// Add item text
		const itemInputs = page.locator(`input[placeholder*="Item"]`).all();
		await itemInputs[i].fill(items[i].text);
	}

	// Set correct order - this depends on how the UI works
	// Typically involves dragging or selecting order
}

async function configureMultipleMatch(
	page: Page,
	index: number,
	files: string[],
	items: Array<{ left: string; right: string }>
): Promise<void> {
	const prefix = `soundbite[${index}]`;

	for (let i = 0; i < files.length; i++) {
		// Click "Add Pair" for each pair
		if (i > 0) {
			const addButton = page.locator(`button:has-text("Add Pair")`).nth(index);
			await addButton.click();
			await page.waitForTimeout(200);
		}

		// Upload file
		const fileInputs = page.locator(`input[name*="${prefix}"][accept*="audio"]`).all();
		await fileInputs[i].setInputFiles(files[i]);

		// Add left and right side texts
		const leftInputs = page
			.locator(`input[placeholder*="left" i], input[placeholder*="first" i]`)
			.all();
		const rightInputs = page
			.locator(`input[placeholder*="right" i], input[placeholder*="second" i]`)
			.all();

		await leftInputs[i].fill(items[i].left);
		await rightInputs[i].fill(items[i].right);
	}
}

export async function submitQuizForm(page: Page): Promise<void> {
	await page.click('button[type="submit"]');
}
