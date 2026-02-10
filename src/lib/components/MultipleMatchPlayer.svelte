<script lang="ts">
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';
	import QuizAudioPlayer from './audio/QuizAudioPlayer.svelte';
	import type { MultipleMatchItem } from '$lib/variant-types';

	interface Props {
		items: MultipleMatchItem[];
		soundbiteId: string;
		onOrderChange: (order: number[]) => void;
		disabled?: boolean;
		initialOrder?: number[]; // For displaying a specific order (e.g., in results)
	}

	let { items, soundbiteId, onOrderChange, disabled = false, initialOrder }: Props = $props();

	// Flip animation duration
	const flipDurationMs = 300;

	// Truly random shuffle using Math.random() - different on every page load
	function shuffleArray<T>(array: T[]): T[] {
		const result = [...array];
		for (let i = result.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[result[i], result[j]] = [result[j], result[i]];
		}
		return result;
	}

	// Generate random initial order
	function generateRandomOrder(length: number): number[] {
		const identity = Array.from({ length }, (_, i) => i);
		return shuffleArray(identity);
	}

	// Display state
	// Audio is always shown in order: items[0], items[1], items[2]...
	// labelOrder: shuffled indices for the draggable answer labels
	let labelOrder = $state<number[]>([]);

	// Track when items change from parent
	let prevItemsJson = $state('');

	// Initialize with provided order or random shuffle when items are provided
	$effect(() => {
		const currentItemsJson = JSON.stringify(items.map((i) => i.id));
		const itemsChanged = currentItemsJson !== prevItemsJson;

		if (itemsChanged && items && items.length > 0) {
			// Use initialOrder if provided (for results view), otherwise shuffle
			labelOrder = initialOrder ?? generateRandomOrder(items.length);
			// Send initial order to parent so it's saved even if user doesn't drag
			onOrderChange(labelOrder);
			prevItemsJson = currentItemsJson;
		}
	});

	// Build display items for the label column (draggable)
	function buildLabelDisplayItems(order: number[]) {
		return order.map((itemIdx, position) => ({
			id: `multiple-match-label-${soundbiteId}-${items[itemIdx]?.id ?? itemIdx}-${position}`,
			itemIdx,
			position,
			item: items[itemIdx]
		}));
	}

	// Create display items that track both the item index and a unique ID for dnd
	let labelDisplayItems = $state<
		Array<{
			id: string;
			itemIdx: number;
			position: number;
			item: MultipleMatchItem;
		}>
	>([]);

	// Sync labelDisplayItems when labelOrder changes
	$effect(() => {
		if (labelOrder.length > 0) {
			labelDisplayItems = buildLabelDisplayItems(labelOrder);
		}
	});

	// DnD handlers - these update labelDisplayItems directly
	function handleDndConsider(e: CustomEvent<{ items: typeof labelDisplayItems }>) {
		if (disabled) return;
		// Update display items during drag (visual only)
		labelDisplayItems = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<{ items: typeof labelDisplayItems }>) {
		if (disabled) return;
		// Finalize the order change
		labelDisplayItems = e.detail.items;
		// Update positions
		labelDisplayItems.forEach((item, idx) => {
			item.position = idx;
		});
		labelDisplayItems = [...labelDisplayItems]; // Trigger reactivity
		const newOrder = labelDisplayItems.map((d) => d.itemIdx);
		onOrderChange(newOrder);
	}

	// Keyboard accessibility handlers
	function handleKeyDown(e: KeyboardEvent, currentIndex: number) {
		if (disabled) return;
		if (e.key === 'ArrowUp' && currentIndex > 0) {
			e.preventDefault();
			swapItems(currentIndex, currentIndex - 1);
		} else if (e.key === 'ArrowDown' && currentIndex < labelDisplayItems.length - 1) {
			e.preventDefault();
			swapItems(currentIndex, currentIndex + 1);
		}
	}

	function swapItems(fromIndex: number, toIndex: number) {
		const newItems = [...labelDisplayItems];
		[newItems[fromIndex], newItems[toIndex]] = [newItems[toIndex], newItems[fromIndex]];
		// Update positions
		newItems.forEach((item, idx) => {
			item.position = idx;
		});
		labelDisplayItems = newItems;
		const newOrder = labelDisplayItems.map((d) => d.itemIdx);
		onOrderChange(newOrder);

		// Focus management - focus the item that moved
		setTimeout(() => {
			const row = document.querySelector<HTMLElement>(
				`[data-multiple-match-label-row="${soundbiteId}-${toIndex}"]`
			);
			const handle = row?.querySelector<HTMLElement>('[data-drag-handle]');
			handle?.focus();
		}, 0);
	}
</script>

<div class="flex flex-col gap-3">
	<!-- Header -->
	<div class="flex gap-4 border-b pb-2 text-xs font-medium text-text-muted">
		<div class="flex-1">Audio</div>
		<div class="w-[200px] shrink-0 text-center">Match the Answer</div>
	</div>

	<!-- Two Column Layout -->
	<div class="flex gap-4">
		<!-- Left Column: Static Audio Players (in original order) -->
		<div class="flex min-w-0 flex-1 flex-col gap-3">
			{#each items as item, index (item.id)}
				<div
					class="flex h-[72px] items-center gap-3 rounded-lg border bg-surface-elevated p-3 shadow-sm"
				>
					<!-- QuizAudioPlayer -->
					<div class="min-w-0 flex-1">
						<QuizAudioPlayer soundbiteId="{soundbiteId}-{index}" url={item.url} />
					</div>
				</div>
			{/each}
		</div>

		<!-- Right Column: Draggable Answer Labels -->
		<div class="flex w-[200px] shrink-0 flex-col gap-3">
			<section
				use:dndzone={{
					items: labelDisplayItems,
					flipDurationMs,
					type: `multiple-match-labels-${soundbiteId}`,
					dragDisabled: disabled,
					morphDisabled: false,
					dropTargetStyle: {
						outline: '2px dashed #3b82f6',
						outlineOffset: '-2px'
					}
				}}
				onconsider={handleDndConsider}
				onfinalize={handleDndFinalize}
				class="flex flex-col gap-3"
				role="list"
				aria-label="Draggable answer labels"
			>
				{#each labelDisplayItems as displayItem, index (displayItem.id)}
					<div
						class="flex h-[72px] items-center gap-3 rounded-lg border bg-surface-muted p-3 shadow-sm"
						animate:flip={{ duration: flipDurationMs }}
						role="listitem"
						data-multiple-match-label-row="{soundbiteId}-{index}"
						aria-label={displayItem.item.answerLabel}
					>
						<!-- Answer Label -->
						<div class="flex-1 text-center font-medium text-text-primary">
							{displayItem.item.answerLabel}
						</div>

						<!-- Drag Handle -->
						<button
							type="button"
							class="shrink-0 cursor-grab p-1 text-text-muted hover:text-text-secondary active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
							data-drag-handle
							aria-label="Drag to reorder"
							onkeydown={(e) => handleKeyDown(e, index)}
							tabindex="0"
							{disabled}
						>
							<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
								<path d="M9 3h2v2H9zm0 8h2v2H9zm0 8h2v2H9zm4-16h2v2h-2zm0 8h2v2h-2zm0 8h2v2h-2z" />
							</svg>
						</button>
					</div>
				{/each}
			</section>
		</div>
	</div>
</div>
