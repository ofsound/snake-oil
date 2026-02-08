<script lang="ts">
	import type { Component } from 'svelte';

	import VariantSelector from './VariantSelector.svelte';
	import SimpleGuessEditor from './variant-editors/SimpleGuessEditor.svelte';
	import MultipleChoiceEditor from './variant-editors/MultipleChoiceEditor.svelte';
	import MultipleResponseEditor from './variant-editors/MultipleResponseEditor.svelte';
	import ImageChoiceEditor from './variant-editors/ImageChoiceEditor.svelte';
	import SequenceEditor from './variant-editors/SequenceEditor.svelte';
	import RankEditor from './variant-editors/RankEditor.svelte';

	import type { SoundbiteState } from '$lib/types/soundbite';
	import type { VariantType } from '$lib/variant-types';

	interface Props {
		soundbite: SoundbiteState;
		index: number;
		id?: string;
		removed?: boolean;
		fileInputRequired?: boolean;
		fileInputLabel?: string;
		disabledVariantType?: boolean;
		allowedVariantTypes?: VariantType[];
		onChange: (updates: Partial<SoundbiteState>) => void;
	}

	let {
		soundbite,
		index,
		id,
		removed = false,
		fileInputRequired = false,
		fileInputLabel = 'MP3 file',
		disabledVariantType = false,
		allowedVariantTypes,
		onChange
	}: Props = $props();

	// Generate bracket notation field names
	const fieldPrefix = $derived(`soundbite[${index}]`);
	const variantTypeName = $derived(`${fieldPrefix}.variantType`);
	const variantConfigName = $derived(`${fieldPrefix}.variantConfig`);
	const questionName = $derived(`${fieldPrefix}.question`);
	const fileInputName = $derived(`${fieldPrefix}.file`);
	const idName = $derived(`${fieldPrefix}.id`);
	const removedName = $derived(`${fieldPrefix}.removed`);

	// Registry of variant editors
	const editorRegistry: Record<
		VariantType,
		Component<{
			soundbite: SoundbiteState;
			onChange: (updates: Partial<SoundbiteState>) => void;
			editorId?: string;
		}>
	> = {
		simple_guess: SimpleGuessEditor,
		multiple_choice: MultipleChoiceEditor,
		multiple_response: MultipleResponseEditor,
		image_choice: ImageChoiceEditor,
		sequence: SequenceEditor,
		rank: RankEditor
	};

	// Get the appropriate editor component
	const VariantEditor = $derived(editorRegistry[soundbite.variantType]);

	// Generate variant config JSON for form submission
	function getVariantConfigJson(): string {
		const { variantType } = soundbite;

		if (variantType === 'simple_guess') {
			return JSON.stringify({
				type: 'simple_guess',
				correctAnswers: soundbite.simpleGuessAnswers
			});
		} else if (variantType === 'multiple_choice') {
			return JSON.stringify({
				type: 'multiple_choice',
				options: soundbite.multipleChoiceOptions
			});
		} else if (variantType === 'multiple_response') {
			return JSON.stringify({
				type: 'multiple_response',
				options: soundbite.multipleResponseOptions
			});
		} else if (variantType === 'image_choice') {
			return JSON.stringify({
				type: 'image_choice',
				options: soundbite.imageChoiceOptions
			});
		} else if (variantType === 'sequence') {
			return JSON.stringify({
				type: 'sequence',
				tracks: soundbite.sequenceTracks,
				correctTrackIndex: soundbite.sequenceCorrectTrackIndex,
				prompt: soundbite.sequencePrompt
			});
		} else if (variantType === 'rank') {
			return JSON.stringify({
				type: 'rank',
				items: soundbite.rankItems,
				correctOrder: soundbite.rankCorrectOrder,
				prompt: soundbite.rankPrompt
			});
		}
		return JSON.stringify({ type: 'simple_guess', correctAnswers: [] });
	}
</script>

<div class="flex flex-col gap-4">
	{#if id}
		<input type="hidden" name={idName} value={id} />
	{/if}

	{#if removed}
		<input type="hidden" name={removedName} value="true" />
	{/if}

	<VariantSelector
		id={`variant-type-${soundbite.id}`}
		value={soundbite.variantType}
		onchange={(vt) => onChange({ variantType: vt })}
		disabled={disabledVariantType}
		allowedTypes={allowedVariantTypes}
	/>

	{#if soundbite.variantType !== 'sequence' && soundbite.variantType !== 'rank'}
		<div class="flex flex-col gap-2">
			<label class="text-sm font-medium text-gray-700" for={`file-${soundbite.id}`}>
				{fileInputLabel}
			</label>
			<input
				id={`file-${soundbite.id}`}
				name={fileInputName}
				type="file"
				accept="audio/mpeg,.mp3"
				class="w-full text-sm text-gray-700 file:mr-3 file:rounded-sm file:border file:border-neutral-200 file:bg-white file:px-2 file:py-1.5 file:font-medium"
				required={fileInputRequired}
			/>
		</div>
	{/if}

	<div class="flex flex-col gap-2">
		<label class="text-sm font-medium text-gray-700" for={`question-${soundbite.id}`}>
			Prompt (optional)
		</label>
		<textarea
			id={`question-${soundbite.id}`}
			name={questionName}
			rows="2"
			class="sm w-full rounded-sm border border-neutral-200 bg-white px-2 py-2 text-sm"
			placeholder="e.g., What guitar is being played?"
			value={soundbite.question}
			oninput={(e) => onChange({ question: e.currentTarget.value })}
		></textarea>
		<p class="hidden text-xs text-gray-500">Appears below the audio player to guide quiz takers.</p>
	</div>

	<input type="hidden" name={variantTypeName} value={soundbite.variantType} />

	<!-- Dynamic variant editor -->
	<VariantEditor {soundbite} {onChange} editorId={`variant-${soundbite.id}`} />

	<input type="hidden" name={variantConfigName} value={getVariantConfigJson()} />
</div>
