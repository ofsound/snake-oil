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
	class="box-border w-full rounded-sm border border-neutral-200 bg-white px-2 py-3 text-base focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
/>
