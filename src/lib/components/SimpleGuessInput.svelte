<script lang="ts">
	type Props = {
		soundbiteId: string;
		value: string;
		oninput: (value: string) => void;
		disabled?: boolean;
	};

	let { soundbiteId, value, oninput, disabled = false }: Props = $props();
</script>

<div class="flex flex-col gap-2">
	<label class="text-sm font-medium text-gray-700" for={`answer-${soundbiteId}`}>Your answer:</label
	>
	<input
		id={`answer-${soundbiteId}`}
		name={`answer-${soundbiteId}`}
		type="text"
		class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
		placeholder=""
		{value}
		oninput={(e) => oninput(e.currentTarget.value)}
		{disabled}
	/>
</div>
