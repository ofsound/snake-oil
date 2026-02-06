<script lang="ts">
	import { flip } from 'svelte/animate';

	import { dndzone } from 'svelte-dnd-action';

	import QuizAudioPlayer from './audio/QuizAudioPlayer.svelte';

	import type { RankItem } from '$lib/variant-types';
	interface Props {
		items: RankItem[];
		soundbiteId: string;
		onOrderChange: (order: number[]) => void;
		disabled?: boolean;
	}

	let { items, soundbiteId, onOrderChange, disabled = false }: Props = $props();

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

	// Create display items
	// Labels A, B, C are assigned to POSITIONS (0=A, 1=B, 2=C...)
	// The tracks are shuffled underneath these fixed position labels
	function buildDisplayItems(order: number[]) {
		return order.map((itemIdx, position) => ({
			id: `rank-${soundbiteId}-${items[itemIdx]?.id ?? itemIdx}-${position}`,
			itemIdx,
			// Label is based on POSITION, not item - position 0 is always A, position 1 is always B
			label: String.fromCharCode(65 + position),
			position,
			item: items[itemIdx]
		}));
	}

	// Initialize display items state
	let displayItems = $state<
		Array<{
			id: string;
			itemIdx: number;
			label: string;
			position: number;
			item: RankItem;
		}>
	>([]);

	// Track when items change from parent
	let prevItemsJson = $state('');

	// Initialize with random shuffle when items are provided
	$effect(() => {
		const currentItemsJson = JSON.stringify(items.map((i) => i.id));
		const itemsChanged = currentItemsJson !== prevItemsJson;

		if (itemsChanged && items && items.length > 0) {
			const randomOrder = generateRandomOrder(items.length);
			displayItems = buildDisplayItems(randomOrder);
			// Send initial order to parent so it's saved even if user doesn't drag
			onOrderChange(randomOrder);
			prevItemsJson = currentItemsJson;
		}
	});

	// DnD handlers - these update displayItems directly
	function handleDndConsider(e: CustomEvent<{ items: typeof displayItems }>) {
		if (disabled) return;
		// Update display items during drag (visual only)
		displayItems = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<{ items: typeof displayItems }>) {
		if (disabled) return;
		// Finalize the order change
		displayItems = e.detail.items;
		const newOrder = displayItems.map((d) => d.itemIdx);
		onOrderChange(newOrder);
	}

	// Keyboard accessibility handlers
	function handleKeyDown(e: KeyboardEvent, currentIndex: number) {
		if (disabled) return;
		if (e.key === 'ArrowUp' && currentIndex > 0) {
			e.preventDefault();
			swapItems(currentIndex, currentIndex - 1);
		} else if (e.key === 'ArrowDown' && currentIndex < displayItems.length - 1) {
			e.preventDefault();
			swapItems(currentIndex, currentIndex + 1);
		}
	}

	function swapItems(fromIndex: number, toIndex: number) {
		const newItems = [...displayItems];
		[newItems[fromIndex], newItems[toIndex]] = [newItems[toIndex], newItems[fromIndex]];
		// Update labels to match new positions
		newItems.forEach((item, idx) => {
			item.label = String.fromCharCode(65 + idx);
			item.position = idx;
		});
		displayItems = newItems;
		const newOrder = displayItems.map((d) => d.itemIdx);
		onOrderChange(newOrder);

		// Focus management - focus the item that moved
		setTimeout(() => {
			const row = document.querySelector<HTMLElement>(
				`[data-rank-player-row="${soundbiteId}-${toIndex}"]`
			);
			const handle = row?.querySelector<HTMLElement>('[data-drag-handle]');
			handle?.focus();
		}, 0);
	}
</script>

<div class="flex flex-col gap-3" class:opacity-50={disabled}>
	<section
		use:dndzone={{
			items: displayItems,
			flipDurationMs,
			type: `rank-${soundbiteId}`,
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
		aria-label="Draggable audio ranking items"
	>
		{#each displayItems as displayItem, index (displayItem.id)}
			<div
				class="flex items-center gap-4 rounded-lg border bg-white p-4 shadow-sm"
				animate:flip={{ duration: flipDurationMs }}
				role="listitem"
				data-rank-player-row="{soundbiteId}-{index}"
				aria-label="Position {displayItem.label}, {displayItem.item.name}"
			>
				<!-- Position Label (A, B, C...) - stays with position -->
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700"
					aria-hidden="true"
				>
					{displayItem.label}
				</div>

				<!-- QuizAudioPlayer (existing component) -->
				<div class="min-w-0 flex-1">
					<QuizAudioPlayer
						soundbiteId="{soundbiteId}-{displayItem.itemIdx}"
						url={displayItem.item.url}
					/>
				</div>

				<!-- Drag Handle -->
				<button
					type="button"
					class="shrink-0 cursor-grab p-2 text-gray-400 hover:text-gray-600 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
					data-drag-handle
					aria-label="Drag to move position {displayItem.label}"
					onkeydown={(e) => handleKeyDown(e, index)}
					tabindex="0"
					{disabled}
				>
					<svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
						<path d="M9 3h2v2H9zm0 8h2v2H9zm0 8h2v2H9zm4-16h2v2h-2zm0 8h2v2h-2zm0 8h2v2h-2z" />
					</svg>
				</button>
			</div>
		{/each}
	</section>
</div>
