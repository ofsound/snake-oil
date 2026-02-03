<script lang="ts">
	type Props = {
		value: string;
		oninput: (value: string) => void;
		id?: string;
		required?: boolean;
	};

	let { value, oninput, id = 'correct-answer', required = true }: Props = $props();
</script>

<div class="space-y-2">
	<label class="text-sm font-medium text-gray-700" for={id}>Correct Answer</label>
	<input
		{id}
		type="text"
		class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
		placeholder="Enter the correct answer"
		{value}
		oninput={(e) => oninput(e.currentTarget.value)}
		{required}
	/>
</div>
