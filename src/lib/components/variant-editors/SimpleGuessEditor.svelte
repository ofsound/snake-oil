<script lang="ts">
	import FormField from '../FormField.svelte';

	import type { VariantEditorProps } from '$lib/types/soundbite';
	let { soundbite, onChange, editorId = 'correct-answer' }: VariantEditorProps = $props();
</script>

<FormField label="Correct Answer" id={`${editorId}-input`}>
	<input
		id={`${editorId}-input`}
		type="text"
		class="w-full rounded-sm border border-neutral-200 bg-white px-2 py-2 text-sm"
		placeholder="Enter the correct answer"
		value={soundbite.simpleGuessAnswer}
		oninput={(e) => onChange({ simpleGuessAnswer: e.currentTarget.value })}
		required
	/>
</FormField>
