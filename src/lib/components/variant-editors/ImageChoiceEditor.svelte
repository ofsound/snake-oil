<script lang="ts">
	import { onDestroy } from 'svelte';

	import { processImageToThumbnail, validateImageFile, getFileHash } from '$lib/image-processing';
	import { MAX_IMAGE_CHOICE_OPTIONS } from '$lib/constants/variants';
	import { MAX_IMAGE_SIZE_MB } from '$lib/constants/uploads';

	import type { VariantEditorProps } from '$lib/types/soundbite';
	let { soundbite, onChange, editorId = 'ic-option' }: VariantEditorProps = $props();

	const options = $derived(soundbite.imageChoiceOptions);

	let fileInput: HTMLInputElement | null = $state(null);
	let isProcessing = $state(false);
	let processingCount = $state(0);
	let errorMessage = $state<string | null>(null);

	// Store processed files for form submission (id -> File)
	let processedFiles = $state<Map<string, File>>(new Map());
	// Store object URLs for preview (id -> URL)
	let previewUrls = $state<Map<string, string>>(new Map());
	// Track file hashes to prevent duplicates
	let fileHashes = $state<Set<string>>(new Set());

	// Generate a unique ID
	function generateId(): string {
		return crypto.randomUUID();
	}

	// Update parent with files when they change
	// Files must be in the same order as options, with null for existing images
	function notifyFilesChange(currentOptions = options) {
		// Create array in same order as options
		const filesInOrder = currentOptions.map((opt) => {
			// If this option has a new file in processedFiles, use it
			// Otherwise return null (existing image, no new file)
			return processedFiles.get(opt.id) || null;
		});
		onChange({ imageChoiceFiles: filesInOrder });
	}

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files || files.length === 0) return;

		// Check if adding these would exceed the limit
		const remainingSlots = MAX_IMAGE_CHOICE_OPTIONS - options.length;
		if (remainingSlots <= 0) {
			errorMessage = `Maximum ${MAX_IMAGE_CHOICE_OPTIONS} images allowed`;
			return;
		}

		isProcessing = true;
		processingCount = 0;
		errorMessage = null;

		const filesToProcess = Array.from(files).slice(0, remainingSlots);
		const newOptions: typeof options = [];
		const newFiles: File[] = [];
		const duplicateNames: string[] = [];

		for (const file of filesToProcess) {
			processingCount++;

			// Validate file
			const validationError = validateImageFile(file);
			if (validationError) {
				console.warn(validationError);
				continue;
			}

			// Check for duplicates using hash
			try {
				const hash = await getFileHash(file);
				if (fileHashes.has(hash)) {
					duplicateNames.push(file.name);
					continue;
				}
				fileHashes.add(hash);
			} catch (err) {
				console.error('Failed to hash file:', err);
			}

			// Process image to thumbnail
			try {
				const processed = await processImageToThumbnail(file);
				const optionId = generateId();

				// Store the processed file
				const processedFile = new File([processed.blob], `${optionId}.jpg`, {
					type: 'image/jpeg'
				});
				processedFiles.set(optionId, processedFile);
				newFiles.push(processedFile);

				// Create object URL for preview
				const previewUrl = URL.createObjectURL(processed.blob);
				previewUrls.set(optionId, previewUrl);

				newOptions.push({
					id: optionId,
					imageUrl: previewUrl, // Use preview URL for now
					pathname: '', // Will be filled after server upload
					label: processed.label,
					isCorrect: false
				});
			} catch (err) {
				console.error('Failed to process image:', err);
			}
		}

		// Update options with new ones
		if (newOptions.length > 0) {
			// If this is the first option, mark it as correct by default
			if (options.length === 0 && newOptions.length > 0) {
				newOptions[0].isCorrect = true;
			}
			const updatedOptions = [...options, ...newOptions];
			onChange({ imageChoiceOptions: updatedOptions });
			notifyFilesChange(updatedOptions);
		}

		// Show error if there were duplicates
		if (duplicateNames.length > 0) {
			errorMessage = `Skipped duplicate(s): ${duplicateNames.join(', ')}`;
		}

		// Reset file input
		if (fileInput) {
			fileInput.value = '';
		}

		isProcessing = false;
		processingCount = 0;
	}

	function removeOption(optionId: string) {
		if (options.length <= 2) return;

		// Remove from files map
		processedFiles.delete(optionId);

		// Revoke object URL to prevent memory leaks
		const previewUrl = previewUrls.get(optionId);
		if (previewUrl && previewUrl.startsWith('blob:')) {
			URL.revokeObjectURL(previewUrl);
		}
		previewUrls.delete(optionId);

		// Remove from options
		const updatedOptions = options.filter((opt) => opt.id !== optionId);

		// If we removed the correct option, mark the first remaining as correct
		const hasCorrectOption = updatedOptions.some((opt) => opt.isCorrect);
		if (!hasCorrectOption && updatedOptions.length > 0) {
			updatedOptions[0].isCorrect = true;
		}

		onChange({ imageChoiceOptions: updatedOptions });
		notifyFilesChange(updatedOptions);
	}

	function setCorrectOption(optionId: string) {
		onChange({
			imageChoiceOptions: options.map((opt) => ({ ...opt, isCorrect: opt.id === optionId }))
		});
	}

	const canAddMore = $derived(options.length < 10);
	const isMinReached = $derived(options.length >= 2);

	// Cleanup object URLs when component is destroyed
	onDestroy(() => {
		for (const url of previewUrls.values()) {
			if (url.startsWith('blob:')) {
				URL.revokeObjectURL(url);
			}
		}
	});
</script>

<div class="flex flex-col gap-4">
	<!-- File Upload -->
	<div class="flex flex-col gap-2">
		<label class="text-sm font-medium text-gray-700" for={`${editorId}-files`}>
			Upload Images (2-10)
		</label>
		<input
			id={`${editorId}-files`}
			bind:this={fileInput}
			type="file"
			accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
			multiple
			disabled={!canAddMore || isProcessing}
			onchange={handleFileUpload}
			class="w-full text-sm text-gray-700 file:mr-3 file:rounded-sm file:border file:border-neutral-200 file:bg-white file:px-2 file:py-1.5 file:font-medium disabled:opacity-50"
		/>
		<p class="text-xs text-gray-500">
			JPG, PNG, WebP, or HEIC. Max {MAX_IMAGE_SIZE_MB}MB per image.
		</p>

		{#if isProcessing}
			<div class="flex items-center gap-2 text-sm text-gray-600">
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600"
				></div>
				<span>Processing image {processingCount}...</span>
			</div>
		{/if}

		{#if errorMessage}
			<p class="text-sm text-amber-600">{errorMessage}</p>
		{/if}

		{#if !canAddMore}
			<p class="text-xs text-amber-600">Maximum {MAX_IMAGE_CHOICE_OPTIONS} images reached</p>
		{/if}
	</div>

	<!-- Image Grid -->
	{#if options.length > 0}
		<div class="flex flex-col gap-2">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-gray-700">
					{options.length} image{options.length === 1 ? '' : 's'}
				</span>
				<span class="text-xs text-gray-500">Click an image to mark as correct</span>
			</div>

			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
				{#each options as option (option.id)}
					<div class="relative flex flex-col gap-1">
						<!-- Image Container -->
						<button
							type="button"
							class="group relative aspect-square w-full overflow-hidden rounded-lg border-2 transition-all"
							class:border-emerald-500={option.isCorrect}
							class:border-gray-200={!option.isCorrect}
							class:ring-2={option.isCorrect}
							class:ring-emerald-500={option.isCorrect}
							onclick={() => setCorrectOption(option.id)}
							aria-label="Select {option.label} as correct answer"
						>
							{#if option.imageUrl || previewUrls.get(option.id)}
								<img
									src={option.imageUrl || previewUrls.get(option.id)}
									alt={option.label}
									class="h-full w-full object-cover"
									loading="lazy"
								/>
							{:else}
								<!-- Placeholder for newly uploaded images -->
								<div class="flex h-full w-full items-center justify-center bg-gray-100">
									<svg
										class="h-8 w-8 text-gray-400"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
										/>
									</svg>
								</div>
							{/if}

							<!-- Correct Indicator Overlay -->
							{#if option.isCorrect}
								<div class="absolute inset-0 flex items-start justify-end p-2">
									<div
										class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md"
									>
										<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
											<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
										</svg>
									</div>
								</div>
							{/if}
						</button>

						<!-- Label and Remove Button -->
						<div class="flex items-center justify-between gap-1">
							<span class="truncate text-xs text-gray-600" title={option.label}>
								{option.label}
							</span>
							<button
								type="button"
								class="shrink-0 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
								onclick={() => removeOption(option.id)}
								disabled={!isMinReached}
								aria-label="Remove {option.label}"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
									<path
										d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
									/>
								</svg>
							</button>
						</div>
					</div>
				{/each}
			</div>

			{#if options.length < 2}
				<p class="text-sm text-amber-600">Please add at least 2 images</p>
			{/if}
		</div>
	{/if}
</div>
