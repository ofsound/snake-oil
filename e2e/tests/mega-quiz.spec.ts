import { test, expect } from '@playwright/test';
import path from 'node:path';

const TEST_AUDIO_PATH = path.join(process.cwd(), 'e2e/fixtures/test-audio.mp3');
const TEST_IMAGE_PATHS = [
	path.join(process.cwd(), 'e2e/fixtures/test-image-1.png'),
	path.join(process.cwd(), 'e2e/fixtures/test-image-2.png'),
	path.join(process.cwd(), 'e2e/fixtures/test-image-3.png'),
	path.join(process.cwd(), 'e2e/fixtures/test-image-4.png')
];

test('complete quiz lifecycle - create 7 variants and submit with perfect score', async ({
	page
}) => {
	test.setTimeout(120000); // 120 seconds for this comprehensive test
	const timestamp = Date.now();
	const quizTitle = `E2E 7 Variants ${timestamp}`;

	console.log('=== PART 1: Creating 7-variant quiz ===');

	await page.goto('/create');
	await expect(page.locator('h1')).toContainText('Create Quiz');

	// Fill basic info
	await page.fill('input[name="title"]', quizTitle);
	await page.fill('textarea[name="description"]', 'Test quiz with all 7 variants');
	await page.waitForTimeout(300);

	// Get all soundbite cards
	const getSoundbiteSection = async (n: number) => {
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

	// Submit form to create quiz
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

	console.log('=== PART 2: Taking the quiz ===');

	// Answer all 7 questions
	for (let i = 0; i < configs.length; i++) {
		console.log(`Answering question ${i + 1}: ${configs[i].type}`);

		switch (configs[i].type) {
			case 'simple_guess':
				await answerSimpleGuess(page, i);
				break;
			case 'multiple_choice':
				await answerMultipleChoice(page, i);
				break;
			case 'multiple_response':
				await answerMultipleResponse(page, i);
				break;
			case 'sequence':
				await answerSequence(page, i);
				break;
			case 'rank':
				await answerRank(page, i);
				break;
			case 'multiple_match':
				await answerMultipleMatch(page, i);
				break;
			case 'image_choice':
				await answerImageChoice(page, i);
				break;
		}
	}

	// Submit answers
	await page.click('button[type="submit"]');

	console.log('=== PART 3: Verifying results ===');

	// Wait for results
	await expect(page.locator('text=Your Score:')).toBeVisible({ timeout: 10000 });

	// Verify 100% score
	const scoreText = await page.locator('h2:has-text("Your Score:")').textContent();
	expect(scoreText).toContain('7/7');

	const percentText = await page.locator('p:has-text("% correct")').textContent();
	expect(percentText).toContain('100%');

	console.log(`✓ Perfect score achieved: ${scoreText} - ${percentText}`);
});

// === CREATION HELPERS ===

async function configureSimpleGuess(section, page) {
	const fileInput = section.locator('input[type="file"][accept*="audio"]').first();
	await fileInput.setInputFiles(TEST_AUDIO_PATH);
	await page.waitForTimeout(300);

	const answerInput = section.locator('input[type="text"]').first();
	await answerInput.fill('testanswer, test answer');

	const promptInput = section.locator('textarea').first();
	await promptInput.fill('What is the answer to this question?');
}

async function configureMultipleChoice(section, page) {
	const select = section.locator('select').first();
	await select.selectOption('multiple_choice');
	await page.waitForTimeout(600);

	const fileInput = section.locator('input[type="file"][accept*="audio"]').first();
	await fileInput.setInputFiles(TEST_AUDIO_PATH);
	await page.waitForTimeout(300);

	const addButtons = await section.locator('button:has-text("Add Option")').all();
	for (let i = 0; i < 2 && i < addButtons.length; i++) {
		await addButtons[i].click();
		await page.waitForTimeout(200);
	}

	const textInputs = await section.locator('input[type="text"]').all();
	const optionInputs = textInputs.slice(0, 4);
	for (let i = 0; i < optionInputs.length; i++) {
		await optionInputs[i].fill(`Option ${String.fromCharCode(65 + i)}`);
	}

	const radios = await section.locator('input[type="radio"]').all();
	if (radios.length >= 2) {
		await radios[1].check();
	}

	await section.locator('textarea').first().fill('Select the correct answer.');
}

async function configureMultipleResponse(section, page) {
	const select = section.locator('select').first();
	await select.selectOption('multiple_response');
	await page.waitForTimeout(600);

	const fileInput = section.locator('input[type="file"][accept*="audio"]').first();
	await fileInput.setInputFiles(TEST_AUDIO_PATH);
	await page.waitForTimeout(300);

	// Click "Add Option" button twice to get 4 total options (2 default + 2 added)
	const addButton = section.locator('button:has-text("Add Option")').first();
	await addButton.click();
	await page.waitForTimeout(300);
	await addButton.click();
	await page.waitForTimeout(300);

	// Fill option text fields - get them fresh after adding
	const textInputs = await section.locator('input[type="text"]').all();
	for (let i = 0; i < 4 && i < textInputs.length; i++) {
		await textInputs[i].fill(`Response ${String.fromCharCode(65 + i)}`);
	}

	// Mark options B and D as correct (indices 1 and 3).
	// Use a scoped selector to avoid selecting non-option checkboxes (like "shuffle").
	const _optionRows = await section
		.locator(
			'[class*="option"], .option-row, [role="group"] > div, [class*="flex"]:has(> input[type="checkbox"])'
		)
		.all();
	// Fallback: get checkboxes that have a text input sibling (option checkboxes)
	let optionCheckboxes = await section
		.locator('input[type="checkbox"]')
		.filter({
			has: page.locator('xpath=./following-sibling::input[@type="text"]')
		})
		.all();
	// If that doesn't work, just get all checkboxes and slice
	if (optionCheckboxes.length < 4) {
		const allCheckboxes = await section.locator('input[type="checkbox"]').all();
		optionCheckboxes = allCheckboxes.slice(0, 4);
	}
	if (optionCheckboxes.length >= 2) await optionCheckboxes[1].check();
	if (optionCheckboxes.length >= 4) await optionCheckboxes[3].check();

	await section.locator('textarea').first().fill('Select all correct responses.');
}

async function configureSequence(section, page) {
	const select = section.locator('select').first();
	await select.selectOption('sequence');
	await page.waitForTimeout(600);

	const fileInput = section.locator('input[type="file"][accept*="audio"]').first();
	await fileInput.setInputFiles([TEST_AUDIO_PATH, TEST_AUDIO_PATH, TEST_AUDIO_PATH]);
	await page.waitForTimeout(1000);

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

	const audioInput = section.locator('input[type="file"][accept*="audio"]').first();
	await audioInput.setInputFiles(TEST_AUDIO_PATH);
	await page.waitForTimeout(300);

	const imageInput = section.locator('input[type="file"][accept*="image"]').first();
	await imageInput.setInputFiles(TEST_IMAGE_PATHS);
	await page.waitForTimeout(2000);

	const imageButtons = await section.locator('button[aria-label*="Select"]').all();
	if (imageButtons.length >= 2) {
		await imageButtons[1].click();
	}

	await section.locator('textarea').first().fill('Select the correct image.');
}

// === ANSWERING HELPERS ===

async function getQuestionCard(page: import('@playwright/test').Page, n: number) {
	// Quiz taking page: scope to form so we target the quiz section only
	// Question number is shown as "{index + 1}." in the left margin
	const cards = await page
		.locator('form')
		.locator('section > div.flex')
		.filter({ has: page.locator('text=' + (n + 1) + '.') })
		.all();
	return cards[0] ?? null;
}

async function answerSimpleGuess(page: import('@playwright/test').Page, questionIndex: number) {
	console.log(`  Answering Q${questionIndex + 1}: Simple Guess`);
	const card = await getQuestionCard(page, questionIndex);
	if (card) {
		const textInput = card.locator('input[type="text"]').first();
		await textInput.fill('testanswer');
	}
}

async function answerMultipleChoice(page: import('@playwright/test').Page, questionIndex: number) {
	console.log(`  Answering Q${questionIndex + 1}: Multiple Choice`);
	const card = await getQuestionCard(page, questionIndex);
	if (card) {
		const optionB = card.locator('label:has-text("Option B")');
		if ((await optionB.count()) > 0) {
			await optionB.click();
		} else {
			// Fallback: second radio
			const radios = await card.locator('input[type="radio"]').all();
			if (radios.length >= 2) await radios[1].click();
		}
	}
}

async function answerMultipleResponse(
	page: import('@playwright/test').Page,
	questionIndex: number
) {
	console.log(`  Answering Q${questionIndex + 1}: Multiple Response`);
	const card = await getQuestionCard(page, questionIndex);
	if (!card) throw new Error('Could not find multiple response question card');
	// Options are shuffled, so select by text label.
	// During creation we marked options B and D as correct ("Response B" and "Response D").
	await card.locator('label:has-text("Response B")').click();
	await card.locator('label:has-text("Response D")').click();
	console.log(`    Checked Response B and Response D`);
}

async function answerSequence(page: import('@playwright/test').Page, questionIndex: number) {
	console.log(`  Answering Q${questionIndex + 1}: Sequence (inject answer into form)`);
	// Sequence does not render a hidden input until user has buzzed. Inject answer.
	// During creation, labels[1] clicks the first track radio (index 0) because labels[0]
	// is the SequenceEditor's file upload label. So correctTrackIndex = 0.
	const form = page.locator('form').first();
	const soundbiteIdInputs = await form.locator('input[name="soundbiteId"]').all();
	const soundbiteIdInput = soundbiteIdInputs[questionIndex];
	if (!soundbiteIdInput)
		throw new Error(`Could not find soundbiteId input at index ${questionIndex}`);
	const soundbiteId = await soundbiteIdInput.getAttribute('value');
	if (!soundbiteId) throw new Error(`soundbiteId input at index ${questionIndex} has no value`);
	await page.evaluate(
		({ soundbiteId }: { soundbiteId: string }) => {
			const formEl =
				document.querySelector('form[action*="submitQuiz"]') ?? document.querySelector('form');
			if (!formEl || !soundbiteId) return;
			let el = formEl.querySelector(
				`input[name="answer-${soundbiteId}"]`
			) as HTMLInputElement | null;
			if (el) {
				el.value = '0';
				return;
			}
			el = document.createElement('input');
			el.type = 'hidden';
			el.name = `answer-${soundbiteId}`;
			el.value = '0';
			formEl.appendChild(el);
		},
		{ soundbiteId }
	);
	console.log(`    Injected sequence answer (track 0) for soundbite ${soundbiteId}`);
}

async function answerRank(page: import('@playwright/test').Page, questionIndex: number) {
	console.log(`  Answering Q${questionIndex + 1}: Rank`);
	const card = await getQuestionCard(page, questionIndex);
	if (!card) throw new Error('Could not find rank question card');

	// Get the soundbiteId from the hidden input name
	const hiddenInput = card.locator('input[type="hidden"][name^="answer-"]').first();
	const inputName = await hiddenInput.getAttribute('name');
	if (!inputName) throw new Error('Rank question has no answer hidden input');
	const soundbiteId = inputName.replace('answer-', '');

	// Read the current shuffled order from the hidden input
	const currentOrderStr = (await hiddenInput.getAttribute('value')) || '[]';
	const currentOrder: number[] = JSON.parse(currentOrderStr);
	console.log(`    Initial order: ${JSON.stringify(currentOrder)}`);

	// Bubble sort using keyboard navigation to achieve identity order [0,1,2,3]
	// currentOrder[i] is the item index at position i
	// We want currentOrder[i] === i for all i
	const n = currentOrder.length;
	for (let i = 0; i < n; i++) {
		// Find the item that should be at position i (itemIdx === i)
		let itemPos = currentOrder.indexOf(i);

		// Bubble it up to position i using ArrowUp
		while (itemPos > i) {
			const row = card.locator(`[data-rank-player-row="${soundbiteId}-${itemPos}"]`);
			const handle = row.locator('[data-drag-handle]').first();
			await handle.focus();
			await handle.press('ArrowUp');
			await page.waitForTimeout(100);

			// Swap in our tracking array
			[currentOrder[itemPos], currentOrder[itemPos - 1]] = [
				currentOrder[itemPos - 1],
				currentOrder[itemPos]
			];
			itemPos--;
		}
	}

	// Verify final order
	const finalOrderStr = (await hiddenInput.getAttribute('value')) || '[]';
	console.log(`    Final order: ${finalOrderStr}`);
}

async function answerMultipleMatch(page: import('@playwright/test').Page, questionIndex: number) {
	console.log(`  Answering Q${questionIndex + 1}: Multiple Match`);
	const card = await getQuestionCard(page, questionIndex);
	if (!card) throw new Error('Could not find multiple match question card');

	// Get the soundbiteId from the hidden input name
	const hiddenInput = card.locator('input[type="hidden"][name^="answer-"]').first();
	const inputName = await hiddenInput.getAttribute('name');
	if (!inputName) throw new Error('Multiple match question has no answer hidden input');
	const soundbiteId = inputName.replace('answer-', '');

	// Read the current shuffled order from the hidden input
	const currentOrderStr = (await hiddenInput.getAttribute('value')) || '[]';
	const currentOrder: number[] = JSON.parse(currentOrderStr);
	console.log(`    Initial order: ${JSON.stringify(currentOrder)}`);

	// Bubble sort using keyboard navigation to achieve identity order [0,1,2,3]
	// currentOrder[i] is the item index at position i
	// We want currentOrder[i] === i for all i
	const n = currentOrder.length;
	for (let i = 0; i < n; i++) {
		// Find the item that should be at position i (itemIdx === i)
		let itemPos = currentOrder.indexOf(i);

		// Bubble it up to position i using ArrowUp
		while (itemPos > i) {
			const row = card.locator(`[data-multiple-match-label-row="${soundbiteId}-${itemPos}"]`);
			const handle = row.locator('[data-drag-handle]').first();
			await handle.focus();
			await handle.press('ArrowUp');
			await page.waitForTimeout(100);

			// Swap in our tracking array
			[currentOrder[itemPos], currentOrder[itemPos - 1]] = [
				currentOrder[itemPos - 1],
				currentOrder[itemPos]
			];
			itemPos--;
		}
	}

	// Verify final order
	const finalOrderStr = (await hiddenInput.getAttribute('value')) || '[]';
	console.log(`    Final order: ${finalOrderStr}`);
}
async function answerImageChoice(page: import('@playwright/test').Page, questionIndex: number) {
	console.log(`  Answering Q${questionIndex + 1}: Image Choice`);
	const card = await getQuestionCard(page, questionIndex);
	if (!card) throw new Error('Could not find image choice question card');
	// Options are shuffled; correct answer from creation is test-image-2.png -> "Test Image 2"
	await card.locator('button[aria-label="Test Image 2"]').click();
	console.log(`    Selected Test Image 2`);
}
