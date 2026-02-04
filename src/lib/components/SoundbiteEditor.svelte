<script lang="ts">
	import VariantSelector from './VariantSelector.svelte';
	import SimpleGuessEditor from './SimpleGuessEditor.svelte';
	import MultipleChoiceEditor from './MultipleChoiceEditor.svelte';
	import MultipleResponseEditor from './MultipleResponseEditor.svelte';
	import FormField from './FormField.svelte';
	import type {
		VariantType,
		MultipleChoiceOption,
		MultipleResponseOption
	} from '$lib/variant-types';

	interface Props {
		id: string;
		variantType: VariantType;
		question: string;
		simpleGuessAnswer: string;
		multipleChoiceOptions: MultipleChoiceOption[];
		multipleResponseOptions: MultipleResponseOption[];
		variantTypeName: string;
		variantConfigName: string;
		questionName: string;
		fileInputName?: string;
		fileInputRequired?: boolean;
		fileInputLabel?: string;
		fileInputId?: string;
		onVariantTypeChange: (variantType: VariantType) => void;
		onQuestionChange: (question: string) => void;
		onSimpleGuessAnswerChange: (answer: string) => void;
		onMultipleChoiceOptionsChange: (options: MultipleChoiceOption[]) => void;
		onMultipleResponseOptionsChange: (options: MultipleResponseOption[]) => void;
	}

	let {
		id,
		variantType,
		question,
		simpleGuessAnswer,
		multipleChoiceOptions,
		multipleResponseOptions,
		variantTypeName,
		variantConfigName,
		questionName,
		fileInputName,
		fileInputRequired = false,
		fileInputLabel = 'MP3 file',
		fileInputId,
		onVariantTypeChange,
		onQuestionChange,
		onSimpleGuessAnswerChange,
		onMultipleChoiceOptionsChange,
		onMultipleResponseOptionsChange
	}: Props = $props();

	function getVariantConfigJson(): string {
		if (variantType === 'simple_guess') {
			return JSON.stringify({ type: 'simple_guess', correctAnswer: simpleGuessAnswer });
		} else if (variantType === 'multiple_choice') {
			return JSON.stringify({ type: 'multiple_choice', options: multipleChoiceOptions });
		} else if (variantType === 'multiple_response') {
			return JSON.stringify({ type: 'multiple_response', options: multipleResponseOptions });
		}
		return JSON.stringify({ type: 'simple_guess', correctAnswer: '' });
	}
</script>

<div class="flex flex-col gap-4">
	{#if fileInputName}
		<div class="space-y-2">
			<label class="text-sm font-medium text-gray-700" for={fileInputId}>
				{fileInputLabel}
			</label>
			<input
				id={fileInputId}
				name={fileInputName}
				type="file"
				accept="audio/mpeg,.mp3"
				class="w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5"
				required={fileInputRequired}
			/>
		</div>
	{/if}

	<VariantSelector id={`variant-type-${id}`} value={variantType} onchange={onVariantTypeChange} />

	<div class="flex flex-col gap-2">
		<label class="text-sm font-medium text-gray-700" for={`question-${id}`}>
			Question (optional)
		</label>
		<textarea
			id={`question-${id}`}
			name={questionName}
			rows="2"
			class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
	{/if}

	<input type="hidden" name={variantConfigName} value={getVariantConfigJson()} />
</div>
