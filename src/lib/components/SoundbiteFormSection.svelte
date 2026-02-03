<script lang="ts">
	import { createEmptyOption } from '$lib/variant-client-utils';
	import Card from './Card.svelte';
	import Button from './Button.svelte';
	import SoundbiteEditor from './SoundbiteEditor.svelte';
	import type {
		VariantType,
		MultipleChoiceOption,
		MultipleResponseOption
	} from '$lib/variant-types';

	interface SoundbiteState {
		id: number;
		variantType: VariantType;
		simpleGuessAnswer: string;
		multipleChoiceOptions: MultipleChoiceOption[];
		multipleResponseOptions: MultipleResponseOption[];
		question: string;
	}

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
		headerTitle = 'SoundBites',
		addButtonText = 'Add SoundBite',
		cardTitle = (index) => `SoundBite #${index + 1}`
	}: Props = $props();

	let nextId = $state(Math.max(...soundbites.map((s) => s.id), 0) + 1);

	function addSoundbite() {
		const newSoundbite: SoundbiteState = {
			id: nextId,
			variantType: 'simple_guess',
			simpleGuessAnswer: '',
			multipleChoiceOptions: [createEmptyOption(), createEmptyOption()],
			multipleResponseOptions: [createEmptyOption(), createEmptyOption()],
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

	function updateVariantType(id: number, variantType: VariantType) {
		updateSoundbite(id, { variantType });
	}

	function updateQuestion(id: number, question: string) {
		updateSoundbite(id, { question });
	}

	function updateSimpleGuessAnswer(id: number, answer: string) {
		updateSoundbite(id, { simpleGuessAnswer: answer });
	}

	function updateMultipleChoiceOptions(id: number, options: MultipleChoiceOption[]) {
		updateSoundbite(id, { multipleChoiceOptions: options });
	}

	function updateMultipleResponseOptions(id: number, options: MultipleResponseOption[]) {
		updateSoundbite(id, { multipleResponseOptions: options });
	}
</script>

<section class="space-y-4">
	{#if showHeader}
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold">{headerTitle}</h2>
			<Button type="button" variant="outline" size="sm" onclick={addSoundbite}>
				{addButtonText}
			</Button>
		</div>
	{/if}

	<div class="space-y-4">
		{#each soundbites as soundbite, index (soundbite.id)}
			<Card variant="flat" padding="sm">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium text-gray-700">{cardTitle(index)}</span>
					<button
						type="button"
						class="text-xs text-gray-500 hover:text-gray-700"
						onclick={() => removeSoundbite(soundbite.id)}
						disabled={soundbites.length <= 1}
					>
						Remove
					</button>
				</div>

				<SoundbiteEditor
					id={String(soundbite.id)}
					variantType={soundbite.variantType}
					question={soundbite.question}
					simpleGuessAnswer={soundbite.simpleGuessAnswer}
					multipleChoiceOptions={soundbite.multipleChoiceOptions}
					multipleResponseOptions={soundbite.multipleResponseOptions}
					{variantTypeName}
					{variantConfigName}
					{questionName}
					{fileInputName}
					{fileInputRequired}
					{fileInputLabel}
					fileInputId={`soundbite-file-${soundbite.id}`}
					onVariantTypeChange={(value) => updateVariantType(soundbite.id, value)}
					onQuestionChange={(value) => updateQuestion(soundbite.id, value)}
					onSimpleGuessAnswerChange={(value) => updateSimpleGuessAnswer(soundbite.id, value)}
					onMultipleChoiceOptionsChange={(options) =>
						updateMultipleChoiceOptions(soundbite.id, options)}
					onMultipleResponseOptionsChange={(options) =>
						updateMultipleResponseOptions(soundbite.id, options)}
				/>
			</Card>
		{/each}
	</div>

	{#if !showHeader}
		<Button type="button" variant="outline" size="sm" onclick={addSoundbite}>
			{addButtonText}
		</Button>
	{/if}
</section>
