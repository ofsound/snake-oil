<script lang="ts">
	import Card from './Card.svelte';
	import Button from './Button.svelte';
	import SoundbiteEditor from './SoundbiteEditor.svelte';
	import Heading from './Heading.svelte';

	import { createEmptyOption } from '$lib/variant-client-utils';

	import type { SoundbiteState } from '$lib/types/soundbite';
	import type { VariantType } from '$lib/variant-types';
	interface Props {
		soundbites: SoundbiteState[];
		variantTypeName: string;
		variantConfigName: string;
		questionName: string;
		fileInputName: string;
		fileInputRequired?: boolean;
		fileInputLabel?: string;
		onChange: (soundbites: SoundbiteState[]) => void;
		showHeader?: boolean;
		headerTitle?: string;
		addButtonText?: string;
		cardTitle?: (index: number) => string;
		forceVariantType?: VariantType; // If set, all soundbites will use this variant type
	}

	let {
		soundbites = $bindable(),
		variantTypeName,
		variantConfigName,
		questionName,
		fileInputName,
		fileInputRequired = true,
		fileInputLabel = 'MP3 file',
		onChange,
		showHeader = true,
		headerTitle = 'Audio Clips',
		addButtonText = 'Add Audio Clip',
		cardTitle = (index) => `SoundBite #${index + 1}`,
		forceVariantType
	}: Props = $props();

	let nextId = $state(
		Math.max(...soundbites.map((s) => (typeof s.id === 'number' ? s.id : 0)), 0) + 1
	);

	function addSoundbite() {
		// Default to forced variant type if set, otherwise simple_guess
		const defaultVariantType = forceVariantType || 'simple_guess';
		const newSoundbite: SoundbiteState = {
			id: nextId,
			variantType: defaultVariantType,
			simpleGuessAnswer: '',
			multipleChoiceOptions: [createEmptyOption(), createEmptyOption()],
			multipleResponseOptions: [createEmptyOption(), createEmptyOption()],
			imageChoiceOptions: [],
			imageChoiceFiles: [],
			sequenceTracks: [],
			sequenceCorrectTrackIndex: 0,
			sequencePrompt: '',
			sequenceFiles: [],
			rankItems: [],
			rankCorrectOrder: [],
			rankPrompt: '',
			rankFiles: [],
			question: ''
		};
		soundbites = [...soundbites, newSoundbite];
		onChange(soundbites);
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
		{#each soundbites as soundbite, index (soundbite.id)}
			<div class="flex">
				<div class="mt-2 w-8 text-sm font-medium text-neutral-500">{index + 1}.</div>
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
						soundbite={forceVariantType
							? { ...soundbite, variantType: forceVariantType }
							: soundbite}
						{variantTypeName}
						{variantConfigName}
						{questionName}
						{fileInputName}
						{fileInputRequired}
						{fileInputLabel}
						fileInputId={`soundbite-file-${String(soundbite.id)}`}
						disabledVariantType={!!forceVariantType}
						onChange={(updates) => updateSoundbite(Number(soundbite.id), updates)}
					/>
				</Card>
			</div>
		{/each}
	</div>

	{#if showHeader}
		<div class="mt-4 flex justify-end">
			<Button type="button" variant="outline" size="sm" onclick={addSoundbite}>
				{addButtonText}
			</Button>
		</div>
	{/if}

	{#if !showHeader}
		<Button type="button" variant="outline" size="sm" onclick={addSoundbite}>
			{addButtonText}
		</Button>
	{/if}
</section>
