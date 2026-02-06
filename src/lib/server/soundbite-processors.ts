import { db } from './db';
import { tracks } from './db/schema';
import { uploadToBlob } from './quiz-utils';
import { validateVariantConfig } from './variant-utils';
import type {
	SequenceConfig,
	RankConfig,
	ImageChoiceConfig,
	VariantConfig
} from '$lib/variant-types';

export interface ProcessingContext {
	formData: FormData;
	blobToken: string;
	soundbiteIndex: number;
	fileIndex: number;
	files: File[];
}

export interface ProcessingResult {
	trackId: string;
	updatedConfig: VariantConfig;
	newFileIndex: number;
}

export interface ProcessingError {
	message: string;
}

export type ProcessingOutcome = ProcessingResult | ProcessingError;

function isError(outcome: ProcessingOutcome): outcome is ProcessingError {
	return 'message' in outcome && !('trackId' in outcome);
}

export async function processSequenceVariant(
	config: SequenceConfig,
	context: ProcessingContext
): Promise<ProcessingOutcome> {
	const { formData, blobToken, soundbiteIndex } = context;
	const uploadedTracks = [];

	// Get sequence files from form data
	const sequenceFiles = formData.getAll(`sequenceFiles-${soundbiteIndex}`) as File[];
	console.log(
		`[Create Quiz] SoundBite ${soundbiteIndex + 1} (sequence): Found ${sequenceFiles.length} files, expected ${config.tracks.length} tracks`
	);

	for (let trackIndex = 0; trackIndex < config.tracks.length; trackIndex++) {
		const track = config.tracks[trackIndex];
		const file = sequenceFiles[trackIndex];

		if (file && file.size > 0) {
			// Upload to Vercel Blob
			const blob = await uploadToBlob(file, blobToken);
			uploadedTracks.push({
				id: track.id,
				name: track.name,
				url: blob.url
			});
		} else {
			// If no file provided, keep the original URL (might be an edit)
			uploadedTracks.push(track);
		}
	}

	// Update config with permanent URLs
	const updatedConfig: SequenceConfig = {
		...config,
		tracks: uploadedTracks
	};

	// Validate the updated sequence config
	if (!validateVariantConfig(updatedConfig)) {
		console.error(
			`[Create Quiz] Sequence validation failed for SoundBite ${soundbiteIndex + 1}:`,
			updatedConfig
		);
		return {
			message: `Invalid configuration for SoundBite ${soundbiteIndex + 1}. Please ensure all sequence files were uploaded successfully.`
		};
	}

	// Create a placeholder track for the soundbite
	const [track] = await db
		.insert(tracks)
		.values({
			name: `Sequence ${soundbiteIndex + 1}`,
			url: '',
			pathname: null
		})
		.returning({ id: tracks.id });

	return {
		trackId: track.id,
		updatedConfig,
		newFileIndex: context.fileIndex // Sequence doesn't consume from simple files array
	};
}

export async function processRankVariant(
	config: RankConfig,
	context: ProcessingContext
): Promise<ProcessingOutcome> {
	const { formData, blobToken, soundbiteIndex } = context;
	const uploadedItems = [];

	// Get rank files from form data
	const rankFiles = formData.getAll(`rankFiles-${soundbiteIndex}`) as File[];
	console.log(
		`[Create Quiz] SoundBite ${soundbiteIndex + 1} (rank): Found ${rankFiles.length} files, expected ${config.items.length} items`
	);

	for (let itemIndex = 0; itemIndex < config.items.length; itemIndex++) {
		const item = config.items[itemIndex];
		const file = rankFiles[itemIndex];

		if (file && file.size > 0) {
			// Upload to Vercel Blob
			const blob = await uploadToBlob(file, blobToken);
			uploadedItems.push({
				id: item.id,
				name: item.name,
				url: blob.url
			});
		} else {
			// If no file provided, keep the original URL
			uploadedItems.push(item);
		}
	}

	// Update config with permanent URLs
	const updatedConfig: RankConfig = {
		...config,
		items: uploadedItems
	};

	// Validate the updated rank config
	if (!validateVariantConfig(updatedConfig)) {
		console.error(
			`[Create Quiz] Rank validation failed for SoundBite ${soundbiteIndex + 1}:`,
			updatedConfig
		);
		return {
			message: `Invalid configuration for SoundBite ${soundbiteIndex + 1}. Please ensure all rank files were uploaded successfully.`
		};
	}

	// Create a placeholder track for the soundbite
	const [track] = await db
		.insert(tracks)
		.values({
			name: `Rank ${soundbiteIndex + 1}`,
			url: '',
			pathname: null
		})
		.returning({ id: tracks.id });

	return {
		trackId: track.id,
		updatedConfig,
		newFileIndex: context.fileIndex // Rank doesn't consume from simple files array
	};
}

export async function processImageChoiceVariant(
	config: ImageChoiceConfig,
	context: ProcessingContext
): Promise<ProcessingOutcome> {
	const { formData, blobToken, soundbiteIndex, fileIndex, files } = context;

	console.log(
		`[Create Quiz] image_choice: Getting MP3 file at index ${fileIndex}, files.length=${files.length}`
	);
	const file = files[fileIndex];

	console.log(
		`[Create Quiz] image_choice: mp3file=${file ? file.name : 'undefined'}, size=${file ? file.size : 0}`
	);

	if (!file || file.size === 0) {
		return { message: `SoundBite ${soundbiteIndex + 1} is missing an MP3 file.` };
	}

	const blob = await uploadToBlob(file, blobToken);

	const [track] = await db
		.insert(tracks)
		.values({
			name: file.name,
			url: blob.url,
			pathname: blob.pathname
		})
		.returning({ id: tracks.id });

	// Now handle the image files
	const uploadedOptions = [];

	// Get image files from form data
	const imageFiles = formData.getAll(`imageChoiceFiles-${soundbiteIndex}`) as File[];
	console.log(
		`[Create Quiz] SoundBite ${soundbiteIndex + 1} (image_choice): Found ${imageFiles.length} files in formData, expected ${config.options.length} images`
	);

	// Log all files received
	imageFiles.forEach((f, i) => {
		console.log(
			`[Create Quiz] image_choice file ${i}: name=${f.name}, size=${f.size}, type=${f.type}`
		);
	});

	for (let optionIndex = 0; optionIndex < config.options.length; optionIndex++) {
		const option = config.options[optionIndex];
		const imgFile = imageFiles[optionIndex];

		console.log(
			`[Create Quiz] Processing option ${optionIndex}: id=${option.id}, imgFile=${imgFile ? imgFile.name : 'none'}, imgFileSize=${imgFile ? imgFile.size : 0}`
		);

		if (imgFile && imgFile.size > 0) {
			// Upload to Vercel Blob
			console.log(`[Create Quiz] Uploading image ${optionIndex}: ${imgFile.name}`);
			const imgBlob = await uploadToBlob(imgFile, blobToken);
			console.log(
				`[Create Quiz] Image ${optionIndex} uploaded: url=${imgBlob.url.substring(0, 50)}..., pathname=${imgBlob.pathname}`
			);
			uploadedOptions.push({
				id: option.id,
				imageUrl: imgBlob.url,
				pathname: imgBlob.pathname,
				label: option.label,
				isCorrect: option.isCorrect
			});
		} else {
			// No file - this shouldn't happen on CREATE
			console.error(`[Create Quiz] ERROR: No image file for option ${optionIndex} on CREATE`);
			return {
				message: `SoundBite ${soundbiteIndex + 1} is missing image ${optionIndex + 1}. Please upload all images.`
			};
		}
	}

	// Update config with permanent URLs
	const updatedConfig: ImageChoiceConfig = {
		...config,
		options: uploadedOptions
	};

	console.log(
		`[Create Quiz] Final variantConfig for soundbite ${soundbiteIndex + 1}:`,
		JSON.stringify(updatedConfig, null, 2)
	);

	// Validate the updated image_choice config
	if (!validateVariantConfig(updatedConfig)) {
		console.error(
			`[Create Quiz] ImageChoice validation failed for SoundBite ${soundbiteIndex + 1}:`,
			updatedConfig
		);
		return {
			message: `Invalid configuration for SoundBite ${soundbiteIndex + 1}. Please ensure all image files were uploaded successfully.`
		};
	}

	return {
		trackId: track.id,
		updatedConfig,
		newFileIndex: fileIndex + 1
	};
}

export async function processSimpleVariant(
	config: VariantConfig,
	context: ProcessingContext
): Promise<ProcessingOutcome> {
	const { blobToken, soundbiteIndex, fileIndex, files } = context;

	const file = files[fileIndex];

	if (!file || file.size === 0) {
		return { message: `SoundBite ${soundbiteIndex + 1} is missing an MP3 file.` };
	}

	const blob = await uploadToBlob(file, blobToken);

	const [track] = await db
		.insert(tracks)
		.values({
			name: file.name,
			url: blob.url,
			pathname: blob.pathname
		})
		.returning({ id: tracks.id });

	return {
		trackId: track.id,
		updatedConfig: config,
		newFileIndex: fileIndex + 1
	};
}

export { isError };
