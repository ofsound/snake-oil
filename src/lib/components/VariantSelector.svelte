<script lang="ts">
	import type { VariantType } from '$lib/variant-types';
	import { VARIANT_LABELS } from '$lib/variant-types';

	type Props = {
		value: VariantType;
		onchange: (value: VariantType) => void;
		id?: string;
	};

	let { value, onchange, id = 'variant-type' }: Props = $props();

	const variantOptions: VariantType[] = ['simple_guess', 'multiple_choice'];
</script>

<div class="space-y-2">
	<label class="text-sm font-medium text-gray-700" for={id}>Question Type</label>
	<select
		{id}
		class="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
		{value}
		onchange={(e) => onchange(e.currentTarget.value as VariantType)}
	>
		{#each variantOptions as variant (variant)}
			<option value={variant}>{VARIANT_LABELS[variant]}</option>
		{/each}
	</select>
</div>
