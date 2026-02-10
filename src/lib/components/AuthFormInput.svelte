<script lang="ts">
	interface Props {
		type?: string;
		placeholder?: string;
		value?: string;
		disabled?: boolean;
		required?: boolean;
	}

	let {
		type = 'text',
		placeholder = '',
		value = $bindable(''),
		disabled = false,
		required = false
	}: Props = $props();
</script>

<input
	{type}
	{placeholder}
	bind:value
	{disabled}
	{required}
	class="box-border w-full rounded-sm border border-border bg-surface-elevated px-2 py-3 text-base focus:border-accent-indigo-border focus:ring-1 focus:ring-accent-indigo-border focus:outline-none"
/>
