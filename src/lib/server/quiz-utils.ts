import { put, del } from '@vercel/blob';

/**
 * Upload a file to Vercel Blob storage
 */
export async function uploadToBlob(
	file: File,
	token: string
): Promise<{ url: string; pathname: string }> {
	const blob = await put(file.name, file, {
		access: 'public',
		addRandomSuffix: true,
		token
	});

	return { url: blob.url, pathname: blob.pathname };
}

/**
 * Delete a file from Vercel Blob storage
 */
export async function deleteFromBlob(pathname: string, token: string): Promise<void> {
	await del(pathname, { token });
}
