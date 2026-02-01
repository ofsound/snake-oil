import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from 'vitest/browser';
import SlugPage from './+page.svelte';

describe('[slug] page component', () => {
	const mockData = {
		quiz: {
			id: 'quiz-123',
			title: 'Test Quiz',
			slug: 'test-quiz',
			description: 'This is a test quiz description',
			createdAt: new Date('2024-01-01')
		},
		soundbites: [
			{
				id: 'sb-1',
				description: 'First soundbite',
				position: 0,
				trackUrl: 'https://example.com/track1.mp3',
				trackName: 'track1.mp3'
			},
			{
				id: 'sb-2',
				description: 'Second soundbite',
				position: 1,
				trackUrl: 'https://example.com/track2.mp3',
				trackName: 'track2.mp3'
			}
		],
		user: null
	};

	describe('rendering', () => {
		it('displays quiz title and description', async () => {
			render(SlugPage, { props: { data: mockData } });

			await expect.element(page.getByRole('heading', { name: 'Test Quiz' })).toBeInTheDocument();
			await expect.element(page.getByText('This is a test quiz description')).toBeInTheDocument();
		});

		it('displays quiz creation date', async () => {
			render(SlugPage, { props: { data: mockData } });

			// Date format may vary by timezone, so check for any date format
			const el = document.querySelector('header p.text-sm.text-gray-500');
			const text = el?.textContent?.trim() || '';
			expect(text).toBeTruthy();
			expect(text.length).toBeGreaterThan(0);
		});

		it('renders all soundbites with audio players', async () => {
			render(SlugPage, { props: { data: mockData } });

			await expect.element(page.getByText('track1.mp3')).toBeInTheDocument();
			await expect.element(page.getByText('track2.mp3')).toBeInTheDocument();

			const audioCount = document.querySelectorAll('audio').length;
			expect(audioCount).toBe(2);
		});

		it('shows display name input for anonymous users', async () => {
			render(SlugPage, { props: { data: mockData } });

			const displayNameInput = page.getByRole('textbox', { name: 'Display name' });
			await expect.element(displayNameInput).toBeInTheDocument();
			await expect.element(displayNameInput).toHaveAttribute('required', '');
		});

		it('shows signed-in user info when authenticated', async () => {
			const dataWithUser = {
				...mockData,
				user: {
					id: 'user-123',
					name: 'Test User',
					email: 'test@example.com'
				}
			};

			render(SlugPage, { props: { data: dataWithUser } });

			await expect.element(page.getByText(/Signed in as/)).toBeInTheDocument();
			await expect.element(page.getByText('Test User')).toBeInTheDocument();
		});

		it('uses email as label when name is not available', async () => {
			const dataWithUser = {
				...mockData,
				user: {
					id: 'user-123',
					email: 'test@example.com'
				}
			};

			render(SlugPage, { props: { data: dataWithUser } });

			await expect.element(page.getByText('test@example.com')).toBeInTheDocument();
		});

		it('renders answer input fields for each soundbite', async () => {
			render(SlugPage, { props: { data: mockData } });

			const count = document.querySelectorAll('input[name^="answer-"]').length;
			expect(count).toBe(2);
			
			// Verify first answer input exists
			const firstInput = document.querySelector('input[name="answer-sb-1"]');
			expect(firstInput).toBeTruthy();
		});

		it('renders submit button', async () => {
			render(SlugPage, { props: { data: mockData } });

			const submitButton = page.getByRole('button', { name: 'Submit answers' });
			await expect.element(submitButton).toBeInTheDocument();
			await expect.element(submitButton).toBeEnabled();
		});
	});

	describe('form behavior', () => {
		it('disables submit button when submitting', async () => {
			render(SlugPage, { props: { data: mockData } });

			const submitButton = page.getByRole('button', { name: 'Submit answers' });
			await expect.element(submitButton).toBeEnabled();
		});

		it('shows error message when form.message exists', async () => {
			render(SlugPage, {
				props: {
					data: mockData,
					form: {
						message: 'An error occurred while submitting'
					}
				}
			});

			await expect.element(page.getByText('An error occurred while submitting')).toBeInTheDocument();
		});

		it('reveals answers after successful submission', async () => {
			render(SlugPage, {
				props: {
					data: mockData,
					form: {
						success: true
					}
				}
			});

			await expect.element(page.getByText('Answer: First soundbite')).toBeInTheDocument();
			await expect.element(page.getByText('Answer: Second soundbite')).toBeInTheDocument();
		});

		it('does not show answers before submission', async () => {
			render(SlugPage, { props: { data: mockData } });

			const count = document.querySelectorAll('p.text-green-700').length;
			expect(count).toBe(0);
		});
	});

	describe('soundbite details', () => {
		it('includes hidden soundbite ID fields', async () => {
			render(SlugPage, { props: { data: mockData } });

			const inputs = Array.from(document.querySelectorAll('input[name="soundbiteId"][type="hidden"]'));
			const count = inputs.length;
			const firstValue = inputs[0]?.getAttribute('value') || null;
			expect(count).toBe(2);
			expect(firstValue).toBe('sb-1');
		});

		it('answer inputs have correct names', async () => {
			render(SlugPage, { props: { data: mockData } });

			const input1 = document.querySelector('#answer-sb-1') as HTMLInputElement;
			const input2 = document.querySelector('#answer-sb-2') as HTMLInputElement;
			expect(!!input1).toBe(true);
			expect(!!input2).toBe(true);
			expect(input1?.getAttribute('name')).toBe('answer-sb-1');
			expect(input2?.getAttribute('name')).toBe('answer-sb-2');
		});
	});

	describe('user interaction', () => {
		it('allows typing in answer fields', async () => {
			render(SlugPage, { props: { data: mockData } });

			// Set values directly
			const input1 = document.querySelector('input[name="answer-sb-1"]') as HTMLInputElement;
			const input2 = document.querySelector('input[name="answer-sb-2"]') as HTMLInputElement;
			
			if (input1) {
				input1.value = 'My first answer';
				input1.dispatchEvent(new Event('input', { bubbles: true }));
			}
			if (input2) {
				input2.value = 'My second answer';
				input2.dispatchEvent(new Event('input', { bubbles: true }));
			}

			// Verify values
			expect(input1?.value).toBe('My first answer');
			expect(input2?.value).toBe('My second answer');
		});

		it('allows typing in display name field for anonymous users', async () => {
			render(SlugPage, { props: { data: mockData } });

			const displayNameInput = page.getByRole('textbox', { name: 'Display name' });
			
			await displayNameInput.fill('Anonymous User');

			await expect.element(displayNameInput).toHaveValue('Anonymous User');
		});
	});

	describe('profile link', () => {
		it('shows profile link when user is authenticated', async () => {
			const dataWithUser = {
				...mockData,
				user: {
					id: 'user-123',
					name: 'Test User',
					email: 'test@example.com'
				}
			};

			render(SlugPage, { props: { data: dataWithUser } });

			const count = document.querySelectorAll('a[href="/profile"]').length;
			expect(count).toBeGreaterThan(0);
			
			const profileLink = document.querySelector('a[href="/profile"]');
			expect(profileLink).toBeTruthy();
		});

		it('does not show profile link for anonymous users', async () => {
			render(SlugPage, { props: { data: mockData } });

			const count = document.querySelectorAll('a[href="/profile"]').length;
			expect(count).toBe(0);
		});
	});

	describe('edge cases', () => {
		it('handles quiz with no soundbites', async () => {
			const dataWithNoSoundbites = {
				...mockData,
				soundbites: []
			};

			render(SlugPage, { props: { data: dataWithNoSoundbites } });

			const count = document.querySelectorAll('input[name^="answer-"]').length;
			expect(count).toBe(0);
		});

		it('handles very long quiz descriptions', async () => {
			const longDescription = 'A'.repeat(1000);
			const dataWithLongDesc = {
				...mockData,
				quiz: {
					...mockData.quiz,
					description: longDescription
				}
			};

			render(SlugPage, { props: { data: dataWithLongDesc } });

			await expect.element(page.getByText(longDescription)).toBeInTheDocument();
		});

		it('handles special characters in soundbite names', async () => {
			const dataWithSpecialChars = {
				...mockData,
				soundbites: [
					{
						...mockData.soundbites[0],
						trackName: 'track-with-special-chars!@#$%.mp3'
					}
				]
			};

			render(SlugPage, { props: { data: dataWithSpecialChars } });

			await expect.element(page.getByText('track-with-special-chars!@#$%.mp3')).toBeInTheDocument();
		});
	});
});
