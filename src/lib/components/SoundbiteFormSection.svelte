<script lang="ts">
	import { tick } from 'svelte';
	import { fly } from 'svelte/transition';

	import Card from './Card.svelte';
	import Button from './Button.svelte';
	import SoundbiteEditor from './SoundbiteEditor.svelte';
	import Heading from './Heading.svelte';

	import { createEmptyOption } from '$lib/variant-client-utils';

	import type { SoundbiteState } from '$lib/types/soundbite';
	import type { VariantType } from '$lib/variant-types';

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
			prompt: ''
		};
		soundbites = [...soundbites, newSoundbite];
		onChange(soundbites);
		lastAddedId = newSoundbite.id;
		nextId += 1;
	}

	function removeSoundbite(id: number) {
		if (soundbites.length <= 1) return;
		soundbites = soundbites.filter((sb) => sb.id !== id);
		onChange(soundbites);
	}

	function updateSoundbite(id: number, updates: Partial<SoundbiteState>) {
		soundbites = soundbites.map((sb) => (sb.id === id ? { ...sb, ...updates } : sb));
		onChange(soundbites);
	}
</script>

<section>
	{#if showHeader}
		<Heading level={2} class="mb-6">{headerTitle}</Heading>
	{/if}

	<div class="flex flex-col gap-6">
		{#each soundbites as soundbite, localIndex (soundbite.id)}
			{@const globalIndex = startIndex + localIndex}
			{@const isNewlyAdded = lastAddedId === soundbite.id}
			<div
				class="flex"
				transition:fly={{ x: -20, duration: 300 }}
				use:scrollIntoView={isNewlyAdded}
				onintroend={() => {
					if (isNewlyAdded) lastAddedId = null;
				}}
			>
				<div class="mt-2 w-8 text-sm font-medium text-neutral-500">{globalIndex + 1}.</div>
				<Card variant="neutral" padding="md" class="relative flex-1">
					<button
						type="button"
						class="absolute top-4 right-4 cursor-pointer text-xs font-medium hover:underline"
						onclick={() => removeSoundbite(Number(soundbite.id))}
						disabled={soundbites.length <= 1}
					>
						Remove
					</button>

					<SoundbiteEditor
						{soundbite}
						index={globalIndex}
						fileInputRequired={true}
						disabledVariantType={isVariantTypeLocked()}
						allowedVariantTypes={getAvailableVariantTypes()}
						onChange={(updates) => updateSoundbite(Number(soundbite.id), updates)}
					/>
				</Card>
			</div>
		{/each}
	</div>

	<div class="mt-4 flex justify-end">
		<Button type="button" variant="outline" size="sm" onclick={addSoundbite}>
			{addButtonText}
		</Button>
	</div>
</section>
