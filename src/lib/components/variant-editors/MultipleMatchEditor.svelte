<script lang="ts">
	import { MAX_MULTIPLE_MATCH_ITEMS } from '$lib/constants/variants';
	import type { VariantEditorProps } from '$lib/types/soundbite';

	let { soundbite, onChange, editorId = 'multiple-match-editor' }: VariantEditorProps = $props();

	const items = $derived(soundbite.multipleMatchItems);

	let fileInput: HTMLInputElement | null = $state(null);
	let isUploading = $state(false);
	// Store actual File objects for form submission
	let itemFiles = $state<Map<string, File>>(new Map());

	function extractNameFromFilename(filename: string): string {
		return filename
			.replace(/\.[^/.]+$/, '') // Remove extension
			.replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
			.replace(/\b\w/g, (l) => l.toUpperCase()); // Title case
	}

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const files = input.files;
		if (!files || files.length === 0) return;

		isUploading = true;
		const newItems: typeof items = [];
		const newFiles: File[] = [];

		for (const file of Array.from(files)) {
			if (file.type !== 'audio/mpeg' && !file.name.endsWith('.mp3')) {
				console.warn(`Skipping non-MP3 file: ${file.name}`);
				continue;
			}

			const itemId = crypto.randomUUID();

			// Store the file for form submission
			itemFiles.set(itemId, file);
			newFiles.push(file);

			newItems.push({
				id: itemId,
				name: extractNameFromFilename(file.name),
				url: '', // Will be filled in by server after upload
				answerLabel: '' // User must fill this in
			});
		}

		// Merge with existing items
		const updatedItems = [...items, ...newItems].slice(0, MAX_MULTIPLE_MATCH_ITEMS);
		onChange({ multipleMatchItems: updatedItems });

		// Notify parent of file changes
		onChange({ multipleMatchFiles: Array.from(itemFiles.values()) });

		// Reset file input
		if (fileInput) {
			fileInput.value = '';
		}

		isUploading = false;
	}

	function removeItem(index: number) {
		const itemToRemove = items[index];
		if (!itemToRemove) return;

		// Remove from files map
		if (itemToRemove.id) {
			itemFiles.delete(itemToRemove.id);
		}

		// Remove the item from the items array
		const updatedItems = items.filter((_, i) => i !== index);

		onChange({ multipleMatchItems: updatedItems });
		onChange({ multipleMatchFiles: Array.from(itemFiles.values()) });
	}

	function updateAnswerLabel(index: number, newLabel: string) {
		const updatedItems = items.map((item, i) =>
			i === index ? { ...item, answerLabel: newLabel } : item
		);
		onChange({ multipleMatchItems: updatedItems });
	}

	const canAddMore = $derived(items.length < MAX_MULTIPLE_MATCH_ITEMS);
</script>

<div class="flex flex-col gap-4">
	<!-- File Upload -->
	<div class="flex flex-col gap-2">
		<label class="text-sm font-medium text-text-primary" for={`${editorId}-files`}>
			Upload MP3 Files (2-10 tracks)
		</label>
		<input
			id={`${editorId}-files`}
			bind:this={fileInput}
			type="file"
			accept="audio/mpeg,.mp3"
			multiple
			disabled={!canAddMore || isUploading}
			onchange={handleFileUpload}
			class="w-full text-sm text-text-primary file:mr-3 file:rounded-sm file:border file:border-border file:bg-surface-elevated file:px-2 file:py-1.5 file:font-medium disabled:opacity-50"
		/>
		{#if isUploading}
			<div class="flex items-center gap-2 text-sm text-text-secondary">
				<div
					class="border-t-accent-emerald-border h-4 w-4 animate-spin rounded-full border-2 border-border-muted"
				></div>
				<span>Uploading...</span>
			</div>
		{/if}
		{#if !canAddMore}
			<p class="text-xs text-accent-amber-text">Maximum {MAX_MULTIPLE_MATCH_ITEMS} items reached</p>
		{/if}
	</div>

	<!-- Two-Column Header -->
	{#if items.length > 0}
		<div class="flex gap-4 border-b border-border pb-2 text-xs font-medium text-text-muted">
			<div class="flex-1">Audio Track</div>
			<div class="w-[200px] shrink-0">Answer</div>
			<div class="w-8 shrink-0"></div>
		</div>
	{/if}

	<!-- Items List -->
	{#if items.length > 0}
		<div class="flex flex-col gap-2">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-text-primary">
					{items.length}
					{items.length === 1 ? 'item' : 'items'}
				</span>
			</div>

			<div class="flex flex-col gap-3">
				{#each items as item, index (item.id)}
					<div class="flex items-center gap-4">
						<!-- Left Column: Audio Track Name (plain text) -->
						<div
							class="flex h-[72px] flex-1 items-center rounded-lg border border-border bg-surface-elevated p-3 shadow-sm"
						>
							<div class="flex items-center gap-2">
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-emerald-bg"
								>
									<svg
										class="h-4 w-4 text-accent-emerald-text"
										viewBox="0 0 24 24"
										fill="currentColor"
									>
										<path
											d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
										/>
									</svg>
								</div>
								<span class="text-sm font-medium text-text-primary">{item.name}</span>
							</div>
						</div>

						<!-- Right Column: Answer Label (editable) -->
						<div class="h-[72px] w-[200px] shrink-0">
							<input
								type="text"
								value={item.answerLabel}
								oninput={(e) => updateAnswerLabel(index, e.currentTarget.value)}
								class="h-full w-full rounded-lg border border-border px-3 text-sm"
								placeholder="e.g., Guitar"
							/>
						</div>

						<!-- Remove Button (small X) -->
						<button
							type="button"
							onclick={() => removeItem(index)}
							class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-accent-red-bg hover:text-accent-red-text"
							aria-label="Remove {item.name}"
						>
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
								/>
							</svg>
						</button>
					</div>
				{/each}
			</div>

			<p class="text-xs text-text-muted">
				Upload audio files and enter the correct answer for each. Quiz takers will see shuffled
				answer labels and need to drag them to match the correct audio.
			</p>
		</div>
	{/if}

	{#if items.length < 2}
		<p class="text-sm text-accent-amber-text">Please upload at least 2 MP3 files</p>
	{/if}
</div>
