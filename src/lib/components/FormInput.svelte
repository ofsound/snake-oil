<script lang="ts">
	const baseClass = 'w-full rounded-sm border border-neutral-200 px-2 py-2 text-sm text-sm';

	type Props = {
		id?: string;
		name?: string;
		type?: string;
		value?: string;
		placeholder?: string;
		required?: boolean;
		class?: string;
		oninput?: (e: Event) => void;
	};

	let {
		id,
		name,
		type = 'text',
		value = $bindable(''),
		placeholder,
		required = false,
		class: className = '',
		oninput
	}: Props = $props();

	const fullClass = $derived(`${baseClass} ${className}`.trim());
</script>

<input {id} {name} {type} bind:value {placeholder} {required} class={fullClass} {oninput} />
