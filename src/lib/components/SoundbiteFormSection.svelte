<script lang="ts">
	import { tick } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import { dndzone } from 'svelte-dnd-action';

	import Card from './Card.svelte';
	import Button from './Button.svelte';
	import SoundbiteEditor from './SoundbiteEditor.svelte';
	import Heading from './Heading.svelte';
	import Icon from './Icon.svelte';

	import { createEmptyOption } from '$lib/variant-client-utils';

	import type { SoundbiteState } from '$lib/types/soundbite';
	import type { VariantType } from '$lib/variant-types';

	interface DndItem {
		id: number | string;
		soundbite: SoundbiteState;
	}

	// Action to scroll newly added soundbites into view
	function scrollIntoView(node: HTMLElement, shouldScroll: boolean) {
		if (shouldScroll) {
			tick().then(() => {
				setTimeout(() => {
					node.scrollIntoView({ behavior: 'smooth', block: 'center' });
				}, 100);
			});
		}
		return {};
	}

	interface Props {
		soundbites: SoundbiteState[];
		onChange: (soundbites: SoundbiteState[]) => void;
		showHeader?: boolean;
		headerTitle?: string;
		addButtonText?: string;
		forceVariantType?: VariantType;
		allowedVariantTypes?: VariantType[];
		// Starting index for bracket notation (0 for create, existing count for edit)
		startIndex?: number;
	}

	let {
		soundbites = $bindable(),
		onChange,
		showHeader = true,
		headerTitle = 'Questions',
		addButtonText = 'Add Question',
		forceVariantType,
		allowedVariantTypes,
		startIndex = 0
	}: Props = $props();

	// Transform soundbites into D&D items
	// Initialize from props immediately - runs once on component creation
	let dndItems = $state<DndItem[]>(soundbites.map((sb) => ({ id: sb.id, soundbite: sb })));

	// Determine the default variant type for new soundbites
	function getDefaultVariantType(): VariantType {
		if (forceVariantType) return forceVariantType;
		if (allowedVariantTypes && allowedVariantTypes.length > 0) return allowedVariantTypes[0];
		return 'simple_guess';
	}

	// Check if variant type changing is allowed
	function isVariantTypeLocked(): boolean {
		return !!forceVariantType;
	}

	// Get available variant types for selector
	function getAvailableVariantTypes(): VariantType[] | undefined {
		if (forceVariantType) return undefined; // Use default behavior (all types)
		return allowedVariantTypes;
	}

	let nextId = $state(
		Math.max(...soundbites.map((s) => (typeof s.id === 'number' ? s.id : 0)), 0) + 1
	);
	let lastAddedId = $state<number | string | null>(null);

	function addSoundbite() {
		const defaultVariantType = getDefaultVariantType();
		const newSoundbite: SoundbiteState = {
			id: nextId,
			variantType: defaultVariantType,
			simpleGuessAnswers: [],
			multipleChoiceOptions: [createEmptyOption(), createEmptyOption()],
			multipleResponseOptions: [createEmptyOption(), createEmptyOption()],
			imageChoiceOptions: [],
			imageChoiceFiles: [],
			sequenceTracks: [],
			sequenceCorrectTrackIndex: 0,
			sequenceFiles: [],
			rankItems: [],
			rankCorrectOrder: [],
			rankFiles: [],
			multipleMatchItems: [],
			multipleMatchFiles: [],
			prompt: ''
		};
		soundbites = [...soundbites, newSoundbite];
		dndItems = [...dndItems, { id: newSoundbite.id, soundbite: newSoundbite }];
		onChange(soundbites);
		lastAddedId = newSoundbite.id;
		nextId += 1;
	}

	function removeSoundbite(id: number) {
		if (soundbites.length <= 1) return;
		soundbites = soundbites.filter((sb) => sb.id !== id);
		dndItems = dndItems.filter((item) => item.id !== id);
		onChange(soundbites);
	}

	function updateSoundbite(id: number, updates: Partial<SoundbiteState>) {
		soundbites = soundbites.map((sb) => (sb.id === id ? { ...sb, ...updates } : sb));
		dndItems = dndItems.map((item) =>
			item.id === id ? { ...item, soundbite: { ...item.soundbite, ...updates } } : item
		);
		onChange(soundbites);
	}

	function handleDndConsider(e: CustomEvent<{ items: DndItem[] }>) {
		dndItems = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<{ items: DndItem[] }>) {
		dndItems = e.detail.items;
		// Update the parent soundbites array to match the new order
		soundbites = dndItems.map((item) => item.soundbite);
		onChange(soundbites);
	}

	const flipDurationMs = 200;
</script>

<section>
	{#if showHeader}
		<Heading level={2} class="mb-6">{headerTitle}</Heading>
	{/if}

	<div
		class="flex flex-col gap-6"
		use:dndzone={{
			items: dndItems,
			flipDurationMs,
			type: 'soundbite',
			dropTargetStyle: { outline: '2px dashed #3b82f6', outlineOffset: '-2px' },
			dragDisabled: false,
			morphDisabled: false,
			zoneTabIndex: -1,
			// 200ms delay on touch devices to prevent accidental drags while scrolling
			delayTouchStart: 200
		}}
		onconsider={handleDndConsider}
		onfinalize={handleDndFinalize}
	>
		{#each dndItems as item, localIndex (item.id)}
			{@const globalIndex = startIndex + localIndex}
			{@const isNewlyAdded = lastAddedId === item.id}
			<div
				class="flex"
				animate:flip={{ duration: flipDurationMs }}
				transition:fly={{ x: -20, duration: 300 }}
				use:scrollIntoView={isNewlyAdded}
				onintroend={() => {
					if (isNewlyAdded) lastAddedId = null;
				}}
			>
				<div
					class="mt-2 flex w-12 cursor-grab touch-none flex-row items-center gap-2 active:cursor-grabbing"
					aria-label="Drag to reorder"
					title="Drag to reorder"
				>
					<Icon name="grip-vertical" size="sm" class="text-text-muted" />
					<span class="text-sm font-medium text-text-muted">{globalIndex + 1}.</span>
				</div>
				<Card
					variant="neutral"
					padding="md"
					class="relative flex-1 shadow-none transition-shadow duration-200 hover:shadow-md"
				>
					<button
						type="button"
						class="absolute top-4 right-4 inline-flex cursor-pointer items-center gap-1 text-xs font-medium hover:underline"
						onclick={() => removeSoundbite(Number(item.id))}
						disabled={dndItems.length <= 1}
					>
						<Icon name="trash" size="xs" />
						Remove
					</button>

					<SoundbiteEditor
						soundbite={item.soundbite}
						index={globalIndex}
						fileInputRequired={true}
						disabledVariantType={isVariantTypeLocked()}
						allowedVariantTypes={getAvailableVariantTypes()}
						onChange={(updates) => updateSoundbite(Number(item.id), updates)}
					/>
				</Card>
			</div>
		{/each}
	</div>

	<div class="mt-4 flex justify-end">
		<Button type="button" variant="outline" size="sm" onclick={addSoundbite} icon="plus">
			{addButtonText}
		</Button>
	</div>
</section>
