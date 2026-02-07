<script lang="ts">
	import FormField from '../FormField.svelte';

	import type { VariantEditorProps } from '$lib/types/soundbite';
	let { soundbite, onChange, editorId = 'correct-answer' }: VariantEditorProps = $props();

	// Display value: join array with comma+space for editing
	let displayValue = $derived(soundbite.simpleGuessAnswers?.join(', ') ?? '');

	function handleInput(value: string) {
		// Parse comma-separated values, trim, and filter out empty strings
		const answers = value
			.split(',')
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		onChange({ simpleGuessAnswers: answers });
	}
</script>

<FormField label="Correct Answers" id={`${editorId}-input`}>
	<input
		id={`${editorId}-input`}
		type="text"
		class="w-full rounded-sm border border-neutral-200 bg-white px-2 py-2 text-sm"
		placeholder="Enter acceptable answers, separated by commas"
		value={displayValue}
		oninput={(e) => handleInput(e.currentTarget.value)}
		required
	/>
	<p class="mt-1 text-xs text-gray-500">
		Enter all acceptable answers separated by commas. Example: trumpet, brass, horns
	</p>
</FormField>
