import { put, del } from '@vercel/blob';

/**
 * Validate soundbite files
 */
export function validateFiles(files: File[], isRequired: boolean): string | null {
	if (isRequired && files.length === 0) {
		return 'At least one SoundBite is required.';
	}

	for (const file of files) {
		if (isRequired && (!file || file.size === 0)) {
			return 'Each SoundBite must include an MP3 file.';
		}
		if (file && file.size > 0) {
			if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3')) {
				return 'All SoundBite files must be MP3 audio.';
			}
		}
	}

	return null;
}

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
