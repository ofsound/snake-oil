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
		class="sm w-full rounded-sm border border-border bg-surface-elevated px-2 py-2 text-sm disabled:bg-surface-muted disabled:text-text-muted"
		{value}
		{disabled}
		onchange={(e) => onchange(e.currentTarget.value as VariantType)}
	>
		{#each variantOptions as variant (variant)}
			<option value={variant}>{VARIANT_LABELS[variant]}</option>
		{/each}
	</select>
	{#if disabled}
		<p class="mt-1 text-xs text-accent-amber-text">
			⚡ Speed Run mode only supports Multiple Choice, Simple Guess, and Image Choice questions
		</p>
	{/if}
</FormField>
