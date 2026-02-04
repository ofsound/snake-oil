<script lang="ts">
	import FormField from './FormField.svelte';

	type Props = {
		value: string;
		oninput: (value: string) => void;
		id?: string;
		required?: boolean;
	};

	let { value, oninput, id = 'correct-answer', required = true }: Props = $props();
</script>

<FormField label="Correct Answer" {id}>
	<input
		{id}
		type="text"
		class="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
		placeholder="Enter the correct answer"
		{value}
		oninput={(e) => oninput(e.currentTarget.value)}
		{required}
	/>
</FormField>
