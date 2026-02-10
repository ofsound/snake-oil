<script lang="ts">
	const baseClass =
		'w-full rounded-sm border border-border bg-surface px-2 py-2 text-sm text-text-primary placeholder:text-text-muted';

	type Props = {
		id?: string;
		name?: string;
		type?: string;
		value?: string;
		placeholder?: string;
		required?: boolean;
		class?: string;
		oninput?: (e: Event) => void;
		min?: string | number;
		max?: string | number;
		step?: string | number;
	};

	let {
		id,
		name,
		type = 'text',
		value = $bindable(''),
		placeholder,
		required = false,
		class: className = '',
		oninput,
		min,
		max,
		step
	}: Props = $props();

	const fullClass = $derived(`${baseClass} ${className}`.trim());
</script>

<input
	{id}
	{name}
	{type}
	bind:value
	{placeholder}
	{required}
	class={fullClass}
	{oninput}
	{min}
	{max}
	{step}
/>
