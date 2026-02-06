<script lang="ts">
	import { createEmptyOption } from '$lib/variant-client-utils';
	import Card from './Card.svelte';
	import Button from './Button.svelte';
	import SoundbiteEditor from './SoundbiteEditor.svelte';
	import type {
		VariantType,
		MultipleChoiceOption,
		MultipleResponseOption,
		ImageChoiceOption,
		SequenceTrack,
		RankItem
	} from '$lib/variant-types';
	import Heading from './Heading.svelte';

	interface SoundbiteState {
		id: number;
		variantType: VariantType;
		simpleGuessAnswer: string;
		multipleChoiceOptions: MultipleChoiceOption[];
		multipleResponseOptions: MultipleResponseOption[];
		imageChoiceOptions: ImageChoiceOption[];
		imageChoiceFiles: (File | null)[]; // Actual files to upload (null for existing images)
		sequenceTracks: SequenceTrack[];
		sequenceCorrectTrackIndex: number;
		sequencePrompt: string;
		sequenceFiles: File[]; // Actual files to upload
		rankItems: RankItem[];
		rankCorrectOrder: number[];
		rankPrompt: string;
		rankFiles: File[]; // Actual files to upload
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

	let nextId = $state(Math.max(...soundbites.map((s) => s.id), 0) + 1);

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

	function updateImageChoiceOptions(id: number, options: ImageChoiceOption[]) {
		updateSoundbite(id, { imageChoiceOptions: options });
	}

	function updateImageChoiceFiles(id: number, files: (File | null)[]) {
		updateSoundbite(id, { imageChoiceFiles: files });
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

	function updateSequenceFiles(id: number, files: File[]) {
		updateSoundbite(id, { sequenceFiles: files });
	}

	function updateRankItems(id: number, items: RankItem[]) {
		updateSoundbite(id, { rankItems: items });
	}

	function updateRankCorrectOrder(id: number, order: number[]) {
		updateSoundbite(id, { rankCorrectOrder: order });
	}

	function updateRankPrompt(id: number, prompt: string) {
		updateSoundbite(id, { rankPrompt: prompt });
	}

	function updateRankFiles(id: number, files: File[]) {
		updateSoundbite(id, { rankFiles: files });
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
						variantType={forceVariantType || soundbite.variantType}
						question={soundbite.question}
						simpleGuessAnswer={soundbite.simpleGuessAnswer}
						multipleChoiceOptions={soundbite.multipleChoiceOptions}
						multipleResponseOptions={soundbite.multipleResponseOptions}
						imageChoiceOptions={soundbite.imageChoiceOptions}
						sequenceTracks={soundbite.sequenceTracks}
						sequenceCorrectTrackIndex={soundbite.sequenceCorrectTrackIndex}
						sequencePrompt={soundbite.sequencePrompt}
						rankItems={soundbite.rankItems}
						rankCorrectOrder={soundbite.rankCorrectOrder}
						rankPrompt={soundbite.rankPrompt}
						{variantTypeName}
						{variantConfigName}
						{questionName}
						{fileInputName}
						{fileInputRequired}
						{fileInputLabel}
						fileInputId={`soundbite-file-${soundbite.id}`}
						disabledVariantType={!!forceVariantType}
						onVariantTypeChange={(value) => updateVariantType(soundbite.id, value)}
						onQuestionChange={(value) => updateQuestion(soundbite.id, value)}
						onSimpleGuessAnswerChange={(value) => updateSimpleGuessAnswer(soundbite.id, value)}
						onMultipleChoiceOptionsChange={(options) =>
							updateMultipleChoiceOptions(soundbite.id, options)}
						onMultipleResponseOptionsChange={(options) =>
							updateMultipleResponseOptions(soundbite.id, options)}
						onImageChoiceOptionsChange={(options) =>
							updateImageChoiceOptions(soundbite.id, options)}
						onImageChoiceFilesChange={(files) => updateImageChoiceFiles(soundbite.id, files)}
						onSequenceTracksChange={(tracks) => updateSequenceTracks(soundbite.id, tracks)}
						onSequenceCorrectTrackIndexChange={(index) =>
							updateSequenceCorrectTrackIndex(soundbite.id, index)}
						onSequencePromptChange={(prompt) => updateSequencePrompt(soundbite.id, prompt)}
						onSequenceFilesChange={(files) => updateSequenceFiles(soundbite.id, files)}
						onRankItemsChange={(items) => updateRankItems(soundbite.id, items)}
						onRankCorrectOrderChange={(order) => updateRankCorrectOrder(soundbite.id, order)}
						onRankPromptChange={(prompt) => updateRankPrompt(soundbite.id, prompt)}
						onRankFilesChange={(files) => updateRankFiles(soundbite.id, files)}
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
