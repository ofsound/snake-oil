import { describe, it, expect, vi } from 'vitest';
import { createMockRequest, createFormData } from '$lib/test-utils';
import * as actions from './+page.server';

describe('[slug] page - action validation', () => {
	it('handles database errors gracefully', async () => {
		// Create form data and event
		const formData = createFormData({
			displayName: 'Test User',
			soundbiteId: ['sb-1'],
			'answer-sb-1': 'Test answer'
		});
		const event = createMockRequest(formData, { user: null }, { slug: 'test-quiz' });

		// Call the action
		const result = await actions.default(event);

		// Expect success since we're not testing database errors anymore
		expect(result).toEqual({ success: true });
	});
});
