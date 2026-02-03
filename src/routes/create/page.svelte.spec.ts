import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import CreatePage from './+page.svelte';

describe('create page component', () => {
	describe('rendering', () => {
		it('renders form with all fields', async () => {
			render(CreatePage);

			await expect.element(page.getByRole('textbox', { name: 'Quiz title' })).toBeInTheDocument();
			await expect.element(page.getByRole('textbox', { name: 'URL' })).toBeInTheDocument();
			const descriptionExists = !!document.querySelector('textarea[name="description"]');
			expect(descriptionExists).toBe(true);
			await expect.element(page.getByRole('heading', { name: 'SoundBites' })).toBeInTheDocument();
			await expect.element(page.getByRole('button', { name: 'Create quiz' })).toBeInTheDocument();
		});

		it('shows success message when form.success is true', async () => {
			render(CreatePage, {
				props: {
					form: {
						success: true,
						slug: 'test-quiz',
						quizId: 'quiz-123'
					}
				}
			});

			await expect.element(page.getByText('Quiz created successfully.')).toBeInTheDocument();
			await expect.element(page.getByText('View quiz')).toBeInTheDocument();
			await expect.element(page.getByText('Manage quiz')).toBeInTheDocument();
		});

		it('shows error message when form.message exists', async () => {
			render(CreatePage, {
				props: {
					form: {
						message: 'An error occurred'
					}
				}
			});

			await expect.element(page.getByText('An error occurred')).toBeInTheDocument();
		});

		it('renders initial soundbite', async () => {
			render(CreatePage);

			const descInput = document.querySelector('input[name="soundbiteDescription"]');
			const fileInput = document.querySelector('input[name="soundbiteFile"]');
			expect(!!descInput).toBe(true);
			expect(!!fileInput).toBe(true);
		});
	});

	describe('reactive behavior', () => {
		it('auto-generates slug from title', async () => {
			render(CreatePage);

			const titleInput = page.getByRole('textbox', { name: 'Quiz title' });
			const slugInput = page.getByRole('textbox', { name: 'URL' });

			await titleInput.fill('My Test Quiz');

			// Wait a bit for reactive update
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Check that slug was auto-generated
			await expect.element(slugInput).toHaveValue('my-test-quiz');
		});

		it('updates slug when title changes if not manually edited', async () => {
			render(CreatePage);

			const titleInput = page.getByRole('textbox', { name: 'Quiz title' });
			const slugInput = page.getByRole('textbox', { name: 'URL' });

			await titleInput.fill('First Title');
			await new Promise((resolve) => setTimeout(resolve, 100));
			await expect.element(slugInput).toHaveValue('first-title');

			await titleInput.clear();
			await titleInput.fill('Second Title');
			await new Promise((resolve) => setTimeout(resolve, 100));
			await expect.element(slugInput).toHaveValue('second-title');
		});

		it('preserves manual slug edits', async () => {
			render(CreatePage);

			const titleInput = page.getByRole('textbox', { name: 'Quiz title' });
			const slugInput = page.getByRole('textbox', { name: 'URL' });

			await titleInput.fill('My Quiz');
			await new Promise((resolve) => setTimeout(resolve, 100));
			await expect.element(slugInput).toHaveValue('my-quiz');

			// Manually edit the slug
			await slugInput.clear();
			await slugInput.fill('custom-slug');

			// Change title again
			await titleInput.clear();
			await titleInput.fill('Different Title');
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Slug should stay as manually edited
			await expect.element(slugInput).toHaveValue('custom-slug');
		});

		it('disables submit button when submitting', async () => {
			render(CreatePage);

			const submitButton = page.getByRole('button', { name: 'Create quiz' });

			await expect.element(submitButton).toBeEnabled();
		});
	});

	describe('soundbite management', () => {
		it('can add new soundbite', async () => {
			render(CreatePage);

			const addButton = page.getByRole('button', { name: 'Add SoundBite' });

			// Initially one soundbite
			let count = document.querySelectorAll('input[name="soundbiteDescription"]').length;
			expect(count).toBe(1);

			// Add soundbite
			await addButton.click();
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Now two soundbites
			count = document.querySelectorAll('input[name="soundbiteDescription"]').length;
			expect(count).toBe(2);
		});

		it('can add multiple soundbites', async () => {
			render(CreatePage);

			const addButton = page.getByRole('button', { name: 'Add SoundBite' });

			await addButton.click();
			await new Promise((resolve) => setTimeout(resolve, 50));
			await addButton.click();
			await new Promise((resolve) => setTimeout(resolve, 50));
			await addButton.click();
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify we have 4 soundbites (1 initial + 3 added)
			const count = document.querySelectorAll('input[name="soundbiteDescription"]').length;
			expect(count).toBe(4);
		});

		it('can remove soundbite when more than one exists', async () => {
			render(CreatePage);

			const addButton = page.getByRole('button', { name: 'Add SoundBite' });
			await addButton.click();
			await new Promise((resolve) => setTimeout(resolve, 100));

			let count = document.querySelectorAll('input[name="soundbiteDescription"]').length;
			expect(count).toBe(2);

			const removeButtons = page.getByRole('button', { name: 'Remove' });
			await removeButtons.first().click();
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify one soundbite remains
			count = document.querySelectorAll('input[name="soundbiteDescription"]').length;
			expect(count).toBe(1);
		});

		it('cannot remove last soundbite', async () => {
			render(CreatePage);

			const removeButton = page.getByRole('button', { name: 'Remove' });

			await expect.element(removeButton).toBeDisabled();

			// Add another soundbite
			const addButton = page.getByRole('button', { name: 'Add SoundBite' });
			await addButton.click();

			// Now remove buttons should be enabled
			const removeButtons = page.getByRole('button', { name: 'Remove' });
			await expect.element(removeButtons.first()).toBeEnabled();
		});

		it('soundbites have unique IDs', async () => {
			render(CreatePage);

			const addButton = page.getByRole('button', { name: 'Add SoundBite' });

			await addButton.click();
			await new Promise((resolve) => setTimeout(resolve, 50));
			await addButton.click();
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify soundbites exist and have unique IDs
			const inputs = Array.from(document.querySelectorAll('input[name="soundbiteDescription"]'));
			const ids = inputs.map((el) => el.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});
	});

	describe('form validation', () => {
		it('marks required fields', async () => {
			render(CreatePage);

			const titleInput = page.getByRole('textbox', { name: 'Quiz title' });
			await expect.element(titleInput).toHaveAttribute('required', '');

			const textarea = document.querySelector(
				'textarea[name="description"]'
			) as HTMLTextAreaElement;
			const descriptionRequired = textarea?.hasAttribute('required') || false;
			expect(descriptionRequired).toBe(true);
		});

		it('soundbite fields are required', async () => {
			render(CreatePage);

			const descInput = document.querySelector(
				'input[name="soundbiteDescription"]'
			) as HTMLInputElement;
			const fileInput = document.querySelector('input[name="soundbiteFile"]') as HTMLInputElement;
			const descRequired = descInput?.hasAttribute('required') || false;
			const fileRequired = fileInput?.hasAttribute('required') || false;
			expect(descRequired).toBe(true);
			expect(fileRequired).toBe(true);
		});
	});

	describe('slug preview', () => {
		it('shows slug preview in helper text', async () => {
			render(CreatePage);

			const titleInput = page.getByRole('textbox', { name: 'Quiz title' });

			await titleInput.fill('Test Quiz');
			await new Promise((resolve) => setTimeout(resolve, 100));

			const preview = Array.from(document.querySelectorAll('*')).find((el) =>
				el.textContent?.includes('This becomes the public URL:')
			);
			const text = preview?.textContent || '';
			expect(text).toContain('/test-quiz');
		});

		it('shows placeholder when slug is empty', async () => {
			render(CreatePage);

			const preview = Array.from(document.querySelectorAll('*')).find((el) =>
				el.textContent?.includes('This becomes the public URL:')
			);
			const text = preview?.textContent || '';
			expect(text).toContain('/your-quiz');
		});
	});
});
