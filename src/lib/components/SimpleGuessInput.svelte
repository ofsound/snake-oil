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
	<div class="text-sm text-gray-500">Your answer:</div>
	<input
		id={`answer-${soundbiteId}`}
		name={`answer-${soundbiteId}`}
		type="text"
		class="w-full rounded-sm border border-neutral-200 bg-white p-3 px-3 py-2 text-sm font-medium"
		placeholder=""
		{value}
		oninput={(e) => oninput(e.currentTarget.value)}
		{disabled}
	/>
</div>
