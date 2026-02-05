<script lang="ts">
	import { createEmptyOption } from '$lib/variant-client-utils';
	import Card from './Card.svelte';
	import Button from './Button.svelte';
	import SoundbiteEditor from './SoundbiteEditor.svelte';
	import type {
		VariantType,
		MultipleChoiceOption,
		MultipleResponseOption,
		SequenceTrack
	} from '$lib/variant-types';
	import Heading from './Heading.svelte';

	interface SoundbiteState {
		id: number;
		variantType: VariantType;
		simpleGuessAnswer: string;
		multipleChoiceOptions: MultipleChoiceOption[];
		multipleResponseOptions: MultipleResponseOption[];
		sequenceTracks: SequenceTrack[];
		sequenceCorrectTrackIndex: number;
		sequencePrompt: string;
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
		headerTitle = 'Audio Clips',
		addButtonText = 'Add Audio Clip',
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
			sequenceTracks: [],
			sequenceCorrectTrackIndex: 0,
			sequencePrompt: '',
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

	function updateSequenceTracks(id: number, tracks: SequenceTrack[]) {
		updateSoundbite(id, { sequenceTracks: tracks });
	}

	function updateSequenceCorrectTrackIndex(id: number, index: number) {
		updateSoundbite(id, { sequenceCorrectTrackIndex: index });
	}

	function updateSequencePrompt(id: number, prompt: string) {
		updateSoundbite(id, { sequencePrompt: prompt });
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
						onclick={() => removeSoundbite(soundbite.id)}
						disabled={soundbites.length <= 1}
					>
						Remove
					</button>

					<SoundbiteEditor
						id={String(soundbite.id)}
						variantType={soundbite.variantType}
						question={soundbite.question}
						simpleGuessAnswer={soundbite.simpleGuessAnswer}
						multipleChoiceOptions={soundbite.multipleChoiceOptions}
						multipleResponseOptions={soundbite.multipleResponseOptions}
						sequenceTracks={soundbite.sequenceTracks}
						sequenceCorrectTrackIndex={soundbite.sequenceCorrectTrackIndex}
						sequencePrompt={soundbite.sequencePrompt}
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
						onSequenceTracksChange={(tracks) => updateSequenceTracks(soundbite.id, tracks)}
						onSequenceCorrectTrackIndexChange={(index) =>
							updateSequenceCorrectTrackIndex(soundbite.id, index)}
						onSequencePromptChange={(prompt) => updateSequencePrompt(soundbite.id, prompt)}
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
