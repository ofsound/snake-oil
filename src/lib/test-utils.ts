import { vi } from 'vitest';

export function createMockRequest(formData: FormData, user: any, params: any) {
	return {
		send: vi.fn(),
		request: {
			body: formData,
			searchParams: new URLSearchParams(),
			headers: {
				get: vi.fn()
			}
		},
		locals: {
			session: user ? { id: 'session-123', userId: user.id } : null,
			user
		},
		params,
		data: {
			session: user ? { id: 'session-123', userId: user.id } : null,
			user
		}
	};
}

export function createFormData(data: Record<string, string | string[]>) {
	const formData = new FormData();
	Object.entries(data).forEach(([key, value]) => {
		if (Array.isArray(value)) {
			value.forEach((v) => formData.append(key, v));
		} else {
			formData.append(key, value);
		}
	});
	return formData;
}
