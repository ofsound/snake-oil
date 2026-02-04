<script lang="ts">
	import type { VariantType } from '$lib/variant-types';
	import { VARIANT_LABELS } from '$lib/variant-types';
	import FormField from './FormField.svelte';

	type Props = {
		value: VariantType;
		onchange: (value: VariantType) => void;
		id?: string;
	};

	let { value, onchange, id = 'variant-type' }: Props = $props();

	const variantOptions: VariantType[] = ['simple_guess', 'multiple_choice', 'multiple_response'];
</script>

<FormField label="Question Type" {id}>
	<select
		{id}
		class="sm w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
		{value}
		onchange={(e) => onchange(e.currentTarget.value as VariantType)}
	>
		{#each variantOptions as variant (variant)}
			<option value={variant}>{VARIANT_LABELS[variant]}</option>
		{/each}
	</select>
</FormField>
