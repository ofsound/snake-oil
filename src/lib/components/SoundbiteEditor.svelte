<script lang="ts">
	import type { Component } from 'svelte';

	import AudioPreview from './AudioPreview.svelte';
	import VariantSelector from './VariantSelector.svelte';
	import SimpleGuessEditor from './variant-editors/SimpleGuessEditor.svelte';
	import MultipleChoiceEditor from './variant-editors/MultipleChoiceEditor.svelte';
	import MultipleResponseEditor from './variant-editors/MultipleResponseEditor.svelte';
	import ImageChoiceEditor from './variant-editors/ImageChoiceEditor.svelte';
	import SequenceEditor from './variant-editors/SequenceEditor.svelte';
	import RankEditor from './variant-editors/RankEditor.svelte';
	import MultipleMatchEditor from './variant-editors/MultipleMatchEditor.svelte';

	import type { SoundbiteState } from '$lib/types/soundbite';
	import { VARIANT_PROMPT_PLACEHOLDERS, type VariantType } from '$lib/variant-types';

	export interface Props {
		soundbite: SoundbiteState;
		index: number;
		id?: string;
		removed?: boolean;
		fileInputRequired?: boolean;
		fileInputLabel?: string;
		disabledVariantType?: boolean;
		allowedVariantTypes?: VariantType[];
		onChange: (updates: Partial<SoundbiteState>) => void;
		/** URL of existing audio for preview in edit mode */
		existingAudioUrl?: string;
		/** Filename of existing audio */
		existingAudioName?: string;
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
		onChange,
		existingAudioUrl,
		existingAudioName
	}: Props = $props();

	// Track selected file for preview in create mode
	let selectedFile: File | null = $state(null);
	let objectUrl: string | null = $state(null);

	// Cleanup object URL on component destroy or when file changes
	$effect(() => {
		return () => {
			if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
			}
		};
	});

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0] ?? null;

		if (objectUrl) {
			URL.revokeObjectURL(objectUrl);
			objectUrl = null;
		}

		if (file) {
			selectedFile = file;
			objectUrl = URL.createObjectURL(file);
		} else {
			selectedFile = null;
		}
	}

	// Determine which audio URL to use for preview
	function getPreviewUrl(): string | null {
		return objectUrl ?? existingAudioUrl ?? null;
	}

	function getPreviewFilename(): string | null {
		if (selectedFile) {
			return selectedFile.name;
		}
		return existingAudioName ?? null;
	}

	// Generate bracket notation field names
	const fieldPrefix = $derived(`soundbite[${index}]`);
	const variantTypeName = $derived(`${fieldPrefix}.variantType`);
	const variantConfigName = $derived(`${fieldPrefix}.variantConfig`);
	const promptName = $derived(`${fieldPrefix}.prompt`);
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
		rank: RankEditor,
		multiple_match: MultipleMatchEditor
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
				correctTrackIndex: soundbite.sequenceCorrectTrackIndex
			});
		} else if (variantType === 'rank') {
			return JSON.stringify({
				type: 'rank',
				items: soundbite.rankItems,
				correctOrder: soundbite.rankCorrectOrder
			});
		} else if (variantType === 'multiple_match') {
			return JSON.stringify({
				type: 'multiple_match',
				items: soundbite.multipleMatchItems
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

	{#if soundbite.variantType !== 'sequence' && soundbite.variantType !== 'rank' && soundbite.variantType !== 'multiple_match'}
		<div class="flex flex-col gap-2">
			<label class="text-sm font-medium text-text-primary" for={`file-${soundbite.id}`}>
				{fileInputLabel}
			</label>
			<input
				id={`file-${soundbite.id}`}
				name={fileInputName}
				type="file"
				accept="audio/mpeg,.mp3"
				class="w-full text-sm text-text-primary file:mr-3 file:rounded-sm file:border file:border-border file:bg-surface-elevated file:px-2 file:py-1.5 file:font-medium"
				required={fileInputRequired}
				onchange={handleFileChange}
			/>
			{#if getPreviewUrl() && getPreviewFilename()}
				{#snippet audioPreviewSnippet()}
					{@const previewUrl = getPreviewUrl()}
					{@const previewFilename = getPreviewFilename()}
					{#if previewUrl && previewFilename}
						<AudioPreview url={previewUrl} filename={previewFilename} />
					{/if}
				{/snippet}
				{@render audioPreviewSnippet()}
			{/if}
		</div>
	{/if}

	<input type="hidden" name={variantTypeName} value={soundbite.variantType} />

	<!-- Dynamic variant editor -->
	<VariantEditor {soundbite} {onChange} editorId={`variant-${soundbite.id}`} />

	<input type="hidden" name={variantConfigName} value={getVariantConfigJson()} />

	<div class="flex flex-col gap-2">
		<label class="text-sm font-medium text-text-primary" for={`prompt-${soundbite.id}`}>
			Prompt <span class="font-normal text-text-muted italic">(optional)</span>
		</label>
		<textarea
			id={`prompt-${soundbite.id}`}
			name={promptName}
			rows="2"
			class="sm w-full rounded-sm border border-border bg-surface-elevated px-2 py-2 text-sm"
			placeholder={VARIANT_PROMPT_PLACEHOLDERS[soundbite.variantType]}
			value={soundbite.prompt}
			oninput={(e) => onChange({ prompt: e.currentTarget.value })}
		></textarea>
		<p class="hidden text-xs text-text-muted">
			Appears below the audio player to guide quiz takers.
		</p>
	</div>
</div>
