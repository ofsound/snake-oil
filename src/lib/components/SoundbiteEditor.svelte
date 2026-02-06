<script lang="ts">
	import VariantSelector from './VariantSelector.svelte';
	import SimpleGuessEditor from './SimpleGuessEditor.svelte';
	import MultipleChoiceEditor from './MultipleChoiceEditor.svelte';
	import MultipleResponseEditor from './MultipleResponseEditor.svelte';
	import ImageChoiceEditor from './ImageChoiceEditor.svelte';
	import SequenceEditor from './SequenceEditor.svelte';
	import RankEditor from './RankEditor.svelte';
	import FormField from './FormField.svelte';
	import type {
		VariantType,
		MultipleChoiceOption,
		MultipleResponseOption,
		ImageChoiceOption,
		SequenceTrack,
		RankItem
	} from '$lib/variant-types';

	interface Props {
		id: string;
		variantType: VariantType;
		question: string;
		simpleGuessAnswer: string;
		multipleChoiceOptions: MultipleChoiceOption[];
		multipleResponseOptions: MultipleResponseOption[];
		imageChoiceOptions: ImageChoiceOption[];
		sequenceTracks: SequenceTrack[];
		sequenceCorrectTrackIndex: number;
		sequencePrompt: string;
		rankItems: RankItem[];
		rankCorrectOrder: number[];
		rankPrompt: string;
		variantTypeName: string;
		variantConfigName: string;
		questionName: string;
		fileInputName?: string;
		fileInputRequired?: boolean;
		fileInputLabel?: string;
		fileInputId?: string;
		disabledVariantType?: boolean; // If true, variant selector is disabled
		onVariantTypeChange: (variantType: VariantType) => void;
		onQuestionChange: (question: string) => void;
		onSimpleGuessAnswerChange: (answer: string) => void;
		onMultipleChoiceOptionsChange: (options: MultipleChoiceOption[]) => void;
		onMultipleResponseOptionsChange: (options: MultipleResponseOption[]) => void;
		onImageChoiceOptionsChange: (options: ImageChoiceOption[]) => void;
		onImageChoiceFilesChange?: (files: (File | null)[]) => void;
		onSequenceTracksChange: (tracks: SequenceTrack[]) => void;
		onSequenceCorrectTrackIndexChange: (index: number) => void;
		onSequencePromptChange: (prompt: string) => void;
		onSequenceFilesChange?: (files: File[]) => void;
		onRankItemsChange: (items: RankItem[]) => void;
		onRankCorrectOrderChange: (order: number[]) => void;
		onRankPromptChange: (prompt: string) => void;
		onRankFilesChange?: (files: File[]) => void;
	}

	let {
		id,
		variantType,
		question,
		simpleGuessAnswer,
		multipleChoiceOptions,
		multipleResponseOptions,
		imageChoiceOptions,
		sequenceTracks,
		sequenceCorrectTrackIndex,
		sequencePrompt,
		rankItems,
		rankCorrectOrder,
		rankPrompt,
		variantTypeName,
		variantConfigName,
		questionName,
		fileInputName,
		fileInputRequired = false,
		fileInputLabel = 'MP3 file',
		fileInputId,
		disabledVariantType = false,
		onVariantTypeChange,
		onQuestionChange,
		onSimpleGuessAnswerChange,
		onMultipleChoiceOptionsChange,
		onMultipleResponseOptionsChange,
		onImageChoiceOptionsChange,
		onImageChoiceFilesChange,
		onSequenceTracksChange,
		onSequenceCorrectTrackIndexChange,
		onSequencePromptChange,
		onSequenceFilesChange,
		onRankItemsChange,
		onRankCorrectOrderChange,
		onRankPromptChange,
		onRankFilesChange
	}: Props = $props();

	// Debug logging
	$effect(() => {
		console.log(
			`[SoundbiteEditor ${id}] variantType=${variantType}, fileInputName=${fileInputName}, shouldShowFileInput=${fileInputName && variantType !== 'sequence' && variantType !== 'rank'}`
		);
	});

	function getVariantConfigJson(): string {
		if (variantType === 'simple_guess') {
			return JSON.stringify({ type: 'simple_guess', correctAnswer: simpleGuessAnswer });
		} else if (variantType === 'multiple_choice') {
			return JSON.stringify({ type: 'multiple_choice', options: multipleChoiceOptions });
		} else if (variantType === 'multiple_response') {
			return JSON.stringify({ type: 'multiple_response', options: multipleResponseOptions });
		} else if (variantType === 'image_choice') {
			return JSON.stringify({ type: 'image_choice', options: imageChoiceOptions });
		} else if (variantType === 'sequence') {
			return JSON.stringify({
				type: 'sequence',
				tracks: sequenceTracks,
				correctTrackIndex: sequenceCorrectTrackIndex,
				prompt: sequencePrompt
			});
		} else if (variantType === 'rank') {
			return JSON.stringify({
				type: 'rank',
				items: rankItems,
				correctOrder: rankCorrectOrder,
				prompt: rankPrompt
			});
		}
		return JSON.stringify({ type: 'simple_guess', correctAnswer: '' });
	}
</script>

<div class="flex flex-col gap-4">
	<VariantSelector
		id={`variant-type-${id}`}
		value={variantType}
		onchange={onVariantTypeChange}
		disabled={disabledVariantType}
	/>

	{#if fileInputName && variantType !== 'sequence' && variantType !== 'rank'}
		<div class="flex flex-col gap-2">
			<label class="text-sm font-medium text-gray-700" for={fileInputId}>
				{fileInputLabel}
			</label>
			<input
				id={fileInputId}
				name={fileInputName}
				type="file"
				accept="audio/mpeg,.mp3"
				class="w-full text-sm text-gray-700 file:mr-3 file:rounded-sm file:border file:border-neutral-200 file:bg-white file:px-2 file:py-1.5 file:font-medium"
				required={fileInputRequired}
			/>
		</div>
	{/if}

	<div class="flex flex-col gap-2">
		<label class="text-sm font-medium text-gray-700" for={`question-${id}`}>
			Prompt (optional)
		</label>
		<textarea
			id={`question-${id}`}
			name={questionName}
			rows="2"
			class="sm w-full rounded-sm border border-neutral-200 bg-white px-2 py-2 text-sm"
			placeholder="e.g., What guitar is being played?"
			value={question}
			oninput={(e) => onQuestionChange(e.currentTarget.value)}
		></textarea>
		<p class="hidden text-xs text-gray-500">Appears below the audio player to guide quiz takers.</p>
	</div>

	<input type="hidden" name={variantTypeName} value={variantType} />

	{#if variantType === 'simple_guess'}
		<SimpleGuessEditor
			id={`simple-guess-${id}`}
			value={simpleGuessAnswer}
			oninput={onSimpleGuessAnswerChange}
		/>
	{:else if variantType === 'multiple_choice'}
		<MultipleChoiceEditor
			idPrefix={`mc-${id}`}
			options={multipleChoiceOptions}
			onchange={onMultipleChoiceOptionsChange}
		/>
	{:else if variantType === 'multiple_response'}
		<MultipleResponseEditor
			idPrefix={`mr-${id}`}
			options={multipleResponseOptions}
			onchange={onMultipleResponseOptionsChange}
		/>
	{:else if variantType === 'image_choice'}
		<ImageChoiceEditor
			idPrefix={`ic-${id}`}
			options={imageChoiceOptions}
			onchange={onImageChoiceOptionsChange}
			onFilesChange={onImageChoiceFilesChange}
		/>
	{:else if variantType === 'sequence'}
		<SequenceEditor
			id={`sequence-${id}`}
			tracks={sequenceTracks}
			correctTrackIndex={sequenceCorrectTrackIndex}
			prompt={sequencePrompt}
			onTracksChange={onSequenceTracksChange}
			onCorrectTrackIndexChange={onSequenceCorrectTrackIndexChange}
			onPromptChange={onSequencePromptChange}
			onFilesChange={onSequenceFilesChange}
		/>
	{:else if variantType === 'rank'}
		<RankEditor
			id={`rank-${id}`}
			items={rankItems}
			correctOrder={rankCorrectOrder}
			prompt={rankPrompt}
			onItemsChange={onRankItemsChange}
			onCorrectOrderChange={onRankCorrectOrderChange}
			onPromptChange={onRankPromptChange}
			onFilesChange={onRankFilesChange}
		/>
	{/if}

	<input type="hidden" name={variantConfigName} value={getVariantConfigJson()} />
</div>
