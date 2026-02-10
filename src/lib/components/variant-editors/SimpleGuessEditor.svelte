<script lang="ts">
	import FormField from '../FormField.svelte';

	import { MAX_SIMPLE_GUESS_ANSWERS } from '$lib/constants/variants';
	import type { VariantEditorProps } from '$lib/types/soundbite';
	let { soundbite, onChange, editorId = 'correct-answer' }: VariantEditorProps = $props();

	// Display value: join array with comma+space for editing
	let displayValue = $derived(soundbite.simpleGuessAnswers?.join(', ') ?? '');
	let answerCount = $derived(soundbite.simpleGuessAnswers?.length ?? 0);

	function handleInput(value: string) {
		// Parse comma-separated values, trim, filter out empty strings, cap at max
		const answers = value
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0)
			.slice(0, MAX_SIMPLE_GUESS_ANSWERS);
		onChange({ simpleGuessAnswers: answers });
	}
</script>

<FormField label="Correct Answers" id={`${editorId}-input`}>
	<input
		id={`${editorId}-input`}
		type="text"
		class="w-full rounded-sm border border-border bg-surface-elevated px-2 py-2 text-sm"
		placeholder="Enter acceptable answers, separated by commas"
		value={displayValue}
		oninput={(e) => handleInput(e.currentTarget.value)}
		required
	/>
	<div class="mt-1 flex flex-col gap-0.5">
		<p class="text-xs text-text-muted">
			Enter all acceptable answers separated by commas. Example: trumpet, brass, horns
		</p>
		{#if answerCount >= MAX_SIMPLE_GUESS_ANSWERS}
			<p class="text-xs text-accent-amber-text">
				Maximum {MAX_SIMPLE_GUESS_ANSWERS} answers reached
			</p>
		{/if}
	</div>
</FormField>
