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
	class="box-border w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-base focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
/>
