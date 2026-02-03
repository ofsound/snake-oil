import { put, del } from '@vercel/blob';
import type { VariantType, VariantConfig } from './db/schema';

/**
 * Extract soundbite values from form data (for create page)
 */
export function getSoundbiteValues(formData: FormData) {
	const files = formData.getAll('soundbiteFile') as File[];
	const questions = formData
		.getAll('soundbiteQuestion')
		.map((value) => String(value).trim() || null);
	const variantTypes = formData
		.getAll('soundbiteVariantType')
		.map((value) => String(value) as VariantType);
	const variantConfigs = formData.getAll('soundbiteVariantConfig').map((value) => {
		try {
			return JSON.parse(String(value)) as VariantConfig;
		} catch {
			return null;
		}
	});

	return { files, questions, variantTypes, variantConfigs };
}

/**
 * Extract existing soundbite values from form data (for edit page)
 */
export function getExistingSoundbites(formData: FormData) {
	const ids = formData.getAll('existingSoundbiteId').map((value) => String(value));
	const questions = formData
		.getAll('existingSoundbiteQuestion')
		.map((value) => String(value).trim() || null);
	const variantTypes = formData
		.getAll('existingSoundbiteVariantType')
		.map((value) => String(value) as VariantType);
	const variantConfigs = formData.getAll('existingSoundbiteVariantConfig').map((value) => {
		try {
			return JSON.parse(String(value)) as VariantConfig;
		} catch {
			return null;
		}
	});
	const files = formData.getAll('existingSoundbiteFile') as File[];
	const removed = new Set(formData.getAll('existingSoundbiteRemove').map((value) => String(value)));

	return { ids, questions, variantTypes, variantConfigs, files, removed };
}

/**
 * Extract new soundbite values from form data (for edit page)
 */
export function getNewSoundbites(formData: FormData) {
	const questions = formData
		.getAll('newSoundbiteQuestion')
		.map((value) => String(value).trim() || null);
	const variantTypes = formData
		.getAll('newSoundbiteVariantType')
		.map((value) => String(value) as VariantType);
	const variantConfigs = formData.getAll('newSoundbiteVariantConfig').map((value) => {
		try {
			return JSON.parse(String(value)) as VariantConfig;
		} catch {
			return null;
		}
	});
	const files = formData.getAll('newSoundbiteFile') as File[];

	return { questions, variantTypes, variantConfigs, files };
}

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
