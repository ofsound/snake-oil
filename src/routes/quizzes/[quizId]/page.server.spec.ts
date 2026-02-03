import { describe, it, expect, vi } from 'vitest';
import { createMockRequest, createFormData } from '$lib/test-utils';
import * as actions from './+page.server';

describe('quizzes/[quizId] page - action validation', () => {
	it('handles database errors gracefully', async () => {
		// Mock the database query
		vi.mocked(db.query.quizzes.findFirst).mockRejectedValue(new Error('Database error'));

		// Create form data and event
		const formData = createFormData({
			title: 'Test Quiz',
			description: 'Test description',
			existingSoundbiteId: ['sb-1'],
			existingSoundbiteDescription: ['Soundbite 1'],
			existingSoundbiteFile: ['']
		});
		const event = createMockRequest(formData, { user: { id: 'user-123' } }, { quizId: 'quiz-123' });

		// Call the action
		const result = await actions.update(event);

		// Expect graceful handling of the error
		expect(result).toEqual({ success: false, error: 'Database error' });
	});
});
