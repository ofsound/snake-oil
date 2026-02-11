import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { BLOB_READ_WRITE_TOKEN } from '$env/static/private';

import { auth } from '$lib/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { uploadToBlob, deleteFromBlob } from '$lib/server/quiz-utils';

import type { Actions, PageServerLoad, RequestEvent } from './$types';

const MAX_BIO_LENGTH = 2000;

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login?returnTo=/profile/edit');
	}

	// Fetch current user data with bio
	const userData = await db.query.user.findFirst({
		where: eq(user.id, locals.user.id),
		columns: {
			id: true,
			name: true,
			email: true,
			bio: true,
			image: true,
			slug: true
		}
	});

	if (!userData) {
		error(404, 'User not found');
	}

	return {
		user: userData
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const bioJson = formData.get('bio') as string;

		let bio: Record<string, unknown> | null = null;

		// Parse and validate bio JSON
		if (bioJson) {
			try {
				bio = JSON.parse(bioJson) as Record<string, unknown>;

				// Validate it's a valid TipTap document structure
				if (bio.type !== 'doc') {
					return fail(400, {
						error: 'Invalid bio format'
					});
				}

				// Check text length
				const textContent = JSON.stringify(bio);
				if (textContent.length > MAX_BIO_LENGTH) {
					return fail(400, {
						error: `Bio must be ${MAX_BIO_LENGTH} characters or less`
					});
				}
			} catch {
				return fail(400, {
					error: 'Invalid bio format'
				});
			}
		}

		try {
			await db
				.update(user)
				.set({
					bio,
					updatedAt: new Date()
				})
				.where(eq(user.id, locals.user.id));

			return { success: true };
		} catch (err) {
			console.error('Failed to update profile:', err);
			return fail(500, {
				error: 'Failed to update profile. Please try again.'
			});
		}
	},

	uploadImage: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const imageFile = formData.get('image') as File;

		if (!imageFile || imageFile.size === 0) {
			return fail(400, { error: 'No image file provided' });
		}

		// Validate file type
		const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
		if (!validTypes.includes(imageFile.type)) {
			return fail(400, {
				error: 'Invalid file type. Please upload JPG, PNG, or WebP images.'
			});
		}

		// Validate file size (10MB max)
		const MAX_SIZE = 10 * 1024 * 1024;
		if (imageFile.size > MAX_SIZE) {
			return fail(400, { error: 'File too large. Maximum size is 10MB.' });
		}

		try {
			// Generate unique filename
			const timestamp = Date.now();
			const filename = `profile-${locals.user.id}-${timestamp}.jpg`;

			// Create a new File with the optimized blob and new filename
			// The image should already be processed client-side to 300x300
			const fileToUpload = new File([imageFile], filename, {
				type: 'image/jpeg'
			});

			// Upload to Vercel Blob
			const { url } = await uploadToBlob(fileToUpload, BLOB_READ_WRITE_TOKEN);

			// Get current user to check for existing image
			const currentUser = await db.query.user.findFirst({
				where: eq(user.id, locals.user.id),
				columns: { image: true }
			});

			// Delete old image if exists
			if (currentUser?.image) {
				try {
					// Extract pathname from URL
					const oldUrl = new URL(currentUser.image);
					const oldPathname = oldUrl.pathname.slice(1); // Remove leading slash
					await deleteFromBlob(oldPathname, BLOB_READ_WRITE_TOKEN);
				} catch (deleteErr) {
					console.error('Failed to delete old image:', deleteErr);
					// Continue even if delete fails
				}
			}

			// Update user record with new image URL
			await db
				.update(user)
				.set({
					image: url,
					updatedAt: new Date()
				})
				.where(eq(user.id, locals.user.id));

			return { success: true, image: url };
		} catch (err) {
			console.error('Failed to upload image:', err);
			return fail(500, { error: 'Failed to upload image. Please try again.' });
		}
	},

	deleteImage: async ({ locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		try {
			// Get current user to check for existing image
			const currentUser = await db.query.user.findFirst({
				where: eq(user.id, locals.user.id),
				columns: { image: true }
			});

			// Delete old image if exists
			if (currentUser?.image) {
				try {
					// Extract pathname from URL
					const oldUrl = new URL(currentUser.image);
					const oldPathname = oldUrl.pathname.slice(1); // Remove leading slash
					await deleteFromBlob(oldPathname, BLOB_READ_WRITE_TOKEN);
				} catch (deleteErr) {
					console.error('Failed to delete image:', deleteErr);
					// Continue even if delete fails
				}
			}

			// Update user record to remove image
			await db
				.update(user)
				.set({
					image: null,
					updatedAt: new Date()
				})
				.where(eq(user.id, locals.user.id));

			return { success: true };
		} catch (err) {
			console.error('Failed to delete image:', err);
			return fail(500, { error: 'Failed to delete image. Please try again.' });
		}
	},

	updateName: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;

		if (!name || !name.trim()) {
			return fail(400, { error: 'Display name is required' });
		}

		try {
			// Update user name in database directly
			await db
				.update(user)
				.set({
					name: name.trim(),
					updatedAt: new Date()
				})
				.where(eq(user.id, locals.user.id));

			return { success: true, name: name.trim() };
		} catch (err) {
			console.error('Failed to update name:', err);
			return fail(500, { error: 'Failed to update name. Please try again.' });
		}
	},

	updatePassword: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword') as string;
		const newPassword = formData.get('newPassword') as string;

		if (!currentPassword) {
			return fail(400, { error: 'Current password is required' });
		}

		if (!newPassword || newPassword.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters' });
		}

		try {
			// Use Better Auth's changePassword API which requires current password
			await auth.api.changePassword({
				body: {
					currentPassword,
					newPassword,
					revokeOtherSessions: false
				},
				headers: request.headers
			});

			return { success: true };
		} catch (err) {
			console.error('Failed to update password:', err);
			// Better Auth will throw specific errors for wrong current password
			if (err instanceof Error && err.message.includes('Invalid password')) {
				return fail(400, { error: 'Current password is incorrect' });
			}
			return fail(500, { error: 'Failed to update password. Please try again.' });
		}
	}
};
