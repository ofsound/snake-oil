<script lang="ts">
	import FormField from '$lib/components/FormField.svelte';
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';
	import type { VariantEditorProps } from '$lib/types/soundbite';

	let { soundbite, onChange, editorId = 'rank-editor' }: VariantEditorProps = $props();

	const items = $derived(soundbite.rankItems);
	const correctOrder = $derived(soundbite.rankCorrectOrder);
	const prompt = $derived(soundbite.rankPrompt);

	let fileInput: HTMLInputElement | null = $state(null);
	let isUploading = $state(false);
	// Store actual File objects for form submission
	let itemFiles = $state<Map<string, File>>(new Map());

	// Flip animation duration
	const flipDurationMs = 200;

	// Helper to build display items from items and order
	function buildDisplayItems(
		itemsList: typeof items,
		order: typeof correctOrder
	): Array<{ id: string; itemIdx: number; name: string }> {
		if (itemsList.length === 0) return [];

		// If order doesn't match, use identity order
		const effectiveOrder = order.length === itemsList.length ? order : itemsList.map((_, i) => i);

		return effectiveOrder.map((itemIdx, position) => ({
			id: `${itemsList[itemIdx]?.id ?? itemIdx}-${position}`,
			itemIdx,
			name: itemsList[itemIdx]?.name ?? `Item ${itemIdx + 1}`
		}));
	}

	// Create display items that track both the item index and a unique ID for dnd
	// The order of displayItems IS the correct order
	let displayItems = $state<
		Array<{
			id: string;
			itemIdx: number;
			name: string;
		}>
	>([]);

	// Sync displayItems when items or correctOrder change from parent
	// Track previous values to detect changes
	let prevItemsJson = $state('');
	let prevCorrectOrderJson = $state('');

	$effect(() => {
		// Create JSON representations to detect actual changes
		const currentItemsJson = JSON.stringify(items.map((i) => i.id));
		const currentCorrectOrderJson = JSON.stringify(correctOrder);

		if (currentItemsJson !== prevItemsJson || currentCorrectOrderJson !== prevCorrectOrderJson) {
			displayItems = buildDisplayItems(items, correctOrder);
			prevItemsJson = currentItemsJson;
			prevCorrectOrderJson = currentCorrectOrderJson;
		}
	});

	// Update parent with files when they change
	function notifyFilesChange() {
		onChange({ rankFiles: Array.from(itemFiles.values()) });
	}

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
				url: '' // Will be filled in by server after upload
			});
		}

		// Merge with existing items
		const updatedItems = [...items, ...newItems].slice(0, 10); // Max 10 items
		onChange({ rankItems: updatedItems });

		// If this is the first upload, set correctOrder to identity
		if (items.length === 0 && updatedItems.length > 0) {
			onChange({ rankCorrectOrder: updatedItems.map((_, i) => i) });
		}

		// Notify parent of file changes
		notifyFilesChange();

		// Reset file input
		if (fileInput) {
			fileInput.value = '';
		}

		isUploading = false;
	}

	function removeItem(index: number) {
		const displayItemToRemove = displayItems[index];
		if (!displayItemToRemove) return;

		// Remove from files map
		const itemId = items[displayItemToRemove.itemIdx]?.id;
		if (itemId) {
			itemFiles.delete(itemId);
		}

		// Remove the item from the items array
		const itemIdxToRemove = displayItemToRemove.itemIdx;
		const updatedItems = items.filter((_, i) => i !== itemIdxToRemove);

		// Rebuild correctOrder: remove the removed index and adjust all higher indices
		const updatedOrder = displayItems
			.filter((_, i) => i !== index)
			.map((d) => {
				let idx = d.itemIdx;
				if (idx > itemIdxToRemove) {
					idx -= 1; // Adjust indices that were after the removed item
				}
				return idx;
			});

		onChange({ rankItems: updatedItems, rankCorrectOrder: updatedOrder });
		notifyFilesChange();
	}

	function updateItemName(itemIdx: number, newName: string) {
		const updatedItems = items.map((item, i) =>
			i === itemIdx ? { ...item, name: newName } : item
		);
		onChange({ rankItems: updatedItems });
		// Update display item name too
		displayItems = displayItems.map((d) => (d.itemIdx === itemIdx ? { ...d, name: newName } : d));
	}

	// DnD handlers
	function handleDndConsider(e: CustomEvent<{ items: typeof displayItems }>) {
		displayItems = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<{ items: typeof displayItems }>) {
		displayItems = e.detail.items;
		// Extract the new correctOrder from the reordered display items
		const newOrder = displayItems.map((d) => d.itemIdx);
		onChange({ rankCorrectOrder: newOrder });
	}

	// Keyboard accessibility handlers
	function handleKeyDown(e: KeyboardEvent, currentIndex: number) {
		if (e.key === 'ArrowUp' && currentIndex > 0) {
			e.preventDefault();
			swapItems(currentIndex, currentIndex - 1);
		} else if (e.key === 'ArrowDown' && currentIndex < displayItems.length - 1) {
			e.preventDefault();
			swapItems(currentIndex, currentIndex + 1);
		}
	}

	function swapItems(fromIndex: number, toIndex: number) {
		const newDisplayItems = [...displayItems];
		[newDisplayItems[fromIndex], newDisplayItems[toIndex]] = [
			newDisplayItems[toIndex],
			newDisplayItems[fromIndex]
		];
		displayItems = newDisplayItems;
		// Update the correctOrder
		const newOrder = newDisplayItems.map((d) => d.itemIdx);
		onChange({ rankCorrectOrder: newOrder });

		// Focus management - focus the item that moved
		setTimeout(() => {
			const row = document.querySelector(`[data-rank-editor-row="${toIndex}"]`) as HTMLElement;
			row?.focus();
		}, 0);
	}

	const isValid = $derived(items.length >= 2 && items.length <= 10 && prompt.trim().length > 0);
	const canAddMore = $derived(items.length < 10);
</script>

<div class="flex flex-col gap-4">
	<!-- File Upload -->
	<div class="flex flex-col gap-2">
		<label class="text-sm font-medium text-gray-700" for={`${editorId}-files`}>
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
			class="w-full text-sm text-gray-700 file:mr-3 file:rounded-sm file:border file:border-neutral-200 file:bg-white file:px-2 file:py-1.5 file:font-medium disabled:opacity-50"
		/>
		{#if isUploading}
			<div class="flex items-center gap-2 text-sm text-gray-600">
				<div
					class="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600"
				></div>
				<span>Uploading...</span>
			</div>
		{/if}
		{#if !canAddMore}
			<p class="text-xs text-amber-600">Maximum 10 tracks reached</p>
		{/if}
	</div>

	<!-- Draggable Items List -->
	{#if displayItems.length > 0}
		<div class="flex flex-col gap-2">
			<div class="flex items-center justify-between">
				<span class="text-sm font-medium text-gray-700">
					Set Correct Ranking Order ({displayItems.length} items)
				</span>
				<span class="text-xs text-gray-500">Drag to reorder</span>
			</div>

			<section
				use:dndzone={{
					items: displayItems,
					flipDurationMs,
					type: 'rank-editor',
					dropTargetStyle: {
						outline: '2px dashed #3b82f6',
						outlineOffset: '-2px'
					}
				}}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
				class="flex flex-col gap-2"
				role="list"
				aria-label="Draggable ranking items"
			>
				{#each displayItems as displayItem, index (displayItem.id)}
					<div
						class="flex items-center gap-3 rounded border bg-white p-2 shadow-sm"
						animate:flip={{ duration: flipDurationMs }}
						role="listitem"
						aria-label="{displayItem.name}, position {index + 1} of {displayItems.length}"
					>
						<!-- Drag Handle with keyboard controls -->
						<button
							type="button"
							class="cursor-grab p-1 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
							aria-label="Drag handle for {displayItem.name}"
							onkeydown={(e) => handleKeyDown(e, index)}
							tabindex="0"
						>
							<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
								<path d="M9 3h2v2H9zm0 8h2v2H9zm0 8h2v2H9zm4-16h2v2h-2zm0 8h2v2h-2zm0 8h2v2h-2z" />
							</svg>
						</button>

						<!-- Position Indicator -->
						<span class="w-6 text-center font-mono text-sm font-bold text-gray-500">
							{index + 1}
						</span>

						<!-- Item Name Input -->
						<input
							type="text"
							value={displayItem.name}
							oninput={(e) => updateItemName(displayItem.itemIdx, e.currentTarget.value)}
							class="flex-1 rounded border border-neutral-200 px-2 py-1 text-sm"
							placeholder="Track name"
						/>

						<!-- Remove Button -->
						<button
							type="button"
							onclick={() => removeItem(index)}
							class="rounded p-1 text-red-600 hover:bg-red-50"
							aria-label="Remove {displayItem.name}"
						>
							<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
								/>
							</svg>
						</button>
					</div>
				{/each}
			</section>

			<p class="text-xs text-gray-500">
				The order shown above is the correct answer. Quiz takers will need to match this order.
			</p>
		</div>
	{/if}

	<!-- Prompt -->
	<FormField label="Prompt" id={`${editorId}-prompt`}>
		<textarea
			id={`${editorId}-prompt`}
			value={prompt}
			oninput={(e) => onChange({ rankPrompt: e.currentTarget.value })}
			rows="2"
			class="w-full rounded border border-neutral-200 bg-white px-2 py-2 text-sm"
			placeholder="e.g., Rank these from lowest to highest pitch"
		></textarea>
	</FormField>

	{#if items.length < 2}
		<p class="text-sm text-amber-600">Please upload at least 2 MP3 files</p>
	{/if}
</div>
