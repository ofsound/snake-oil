<script lang="ts">
	import FormField from './FormField.svelte';

	import { VARIANT_LABELS } from '$lib/variant-types';

	import type { VariantType } from '$lib/variant-types';
	type Props = {
		value: VariantType;
		onchange: (value: VariantType) => void;
		id?: string;
		disabled?: boolean;
		allowedTypes?: VariantType[];
	};

	let { value, onchange, id = 'variant-type', disabled = false, allowedTypes }: Props = $props();

	const allVariantOptions: VariantType[] = [
		'simple_guess',
		'multiple_choice',
		'multiple_response',
		'image_choice',
		'sequence',
		'rank',
		'multiple_match'
	];

	// Filter options if allowedTypes is provided
	const variantOptions = $derived(
		allowedTypes && allowedTypes.length > 0
			? allVariantOptions.filter((v) => allowedTypes.includes(v))
			: allVariantOptions
	);
</script>

<FormField label="Question Type" {id}>
	<select
		{id}
		class="sm w-full rounded-sm border border-neutral-200 bg-white px-2 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
		{value}
		{disabled}
		onchange={(e) => onchange(e.currentTarget.value as VariantType)}
	>
		{#each variantOptions as variant (variant)}
			<option value={variant}>{VARIANT_LABELS[variant]}</option>
		{/each}
	</select>
	{#if disabled}
		<p class="mt-1 text-xs text-amber-600">
			⚡ Speed Run mode only supports Multiple Choice, Simple Guess, and Image Choice questions
		</p>
	{/if}
</FormField>
