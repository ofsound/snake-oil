import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_MB } from '$lib/constants/uploads';

interface ProcessedImage {
	blob: Blob;
	label: string;
	originalName: string;
}

/**
 * Generate a hash for a file to detect duplicates
 */
export async function getFileHash(file: File): Promise<string> {
	const buffer = await file.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/**
 * Check if file is HEIC format
 */
function isHeicFile(file: File): boolean {
	return (
		file.type === 'image/heic' ||
		file.type === 'image/heif' ||
		file.name.toLowerCase().endsWith('.heic') ||
		file.name.toLowerCase().endsWith('.heif')
	);
}

/**
 * Convert HEIC to JPEG using heic2any
 * Uses dynamic import to avoid SSR issues
 */
async function convertHeicToJpeg(file: File): Promise<File> {
	try {
		// Dynamic import to avoid SSR issues
		const heic2anyModule = await import('heic2any');
		const heic2any = heic2anyModule.default;

		const blob = await heic2any({
			blob: file,
			toType: 'image/jpeg',
			quality: 0.9
		});

		// heic2any returns Blob or Blob[]
		const jpegBlob = Array.isArray(blob) ? blob[0] : blob;
		const newName = file.name.replace(/\.heic$/i, '.jpg').replace(/\.heif$/i, '.jpg');

		return new File([jpegBlob], newName, { type: 'image/jpeg' });
	} catch (error) {
		console.error('HEIC conversion failed:', error);
		throw new Error('Failed to convert HEIC image. Please try a different format.');
	}
}

/**
 * Process image file to 200x200px square thumbnail
 * - Converts HEIC to JPEG if needed
 * - Center-crops to square
 * - Outputs as JPEG at 85% quality
 * - Returns blob ready for upload
 */
export async function processImageToThumbnail(file: File): Promise<ProcessedImage> {
	// Handle HEIC conversion first
	let processedFile = file;
	if (isHeicFile(file)) {
		processedFile = await convertHeicToJpeg(file);
	}

	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (e) => {
			const img = new Image();

			img.onload = () => {
				const canvas = document.createElement('canvas');
				canvas.width = 200;
				canvas.height = 200;

				const ctx = canvas.getContext('2d');
				if (!ctx) {
					reject(new Error('Failed to get canvas context'));
					return;
				}

				// Center-crop calculations
				const size = Math.min(img.width, img.height);
				const x = (img.width - size) / 2;
				const y = (img.height - size) / 2;

				// Draw cropped image
				ctx.drawImage(img, x, y, size, size, 0, 0, 200, 200);

				// Convert to JPEG blob
				canvas.toBlob(
					(blob) => {
						if (blob) {
							// Generate label from filename (use original file name)
							const label = file.name
								.replace(/\.[^/.]+$/, '')
								.replace(/[-_]/g, ' ')
								.replace(/\b\w/g, (l) => l.toUpperCase());

							resolve({
								blob,
								label,
								originalName: file.name
							});
						} else {
							reject(new Error('Canvas toBlob failed'));
						}
					},
					'image/jpeg',
					0.85
				);
			};

			img.onerror = () => {
				reject(new Error('Failed to load image'));
			};

			img.src = e.target?.result as string;
		};

		reader.onerror = () => {
			reject(new Error('Failed to read file'));
		};

		reader.readAsDataURL(processedFile);
	});
}

/**
 * Validate image file before processing
 * Returns error message or null if valid
 */
export function validateImageFile(file: File): string | null {
	const validTypes = [
		'image/jpeg',
		'image/jpg',
		'image/png',
		'image/webp',
		'image/heic',
		'image/heif'
	];

	const isValidType =
		validTypes.includes(file.type) ||
		file.name.toLowerCase().endsWith('.heic') ||
		file.name.toLowerCase().endsWith('.heif');

	if (!isValidType) {
		return `Invalid file type: ${file.name}. Please upload JPG, PNG, WebP, or HEIC images.`;
	}

	if (file.size > MAX_IMAGE_SIZE_BYTES) {
		return `File too large: ${file.name}. Maximum size is ${MAX_IMAGE_SIZE_MB}MB.`;
	}

	return null;
}
