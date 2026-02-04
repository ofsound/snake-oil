<script lang="ts">
	const baseClass = 'w-full rounded-sm border border-neutral-200 px-2 py-2 text-sm';

	type Props = {
		id?: string;
		name?: string;
		value?: string;
		rows?: number;
		placeholder?: string;
		required?: boolean;
		class?: string;
	};

	let {
		id,
		name,
		value = $bindable(''),
		rows = 4,
		placeholder,
		required = false,
		class: className = ''
	}: Props = $props();

	const fullClass = $derived(`${baseClass} ${className}`.trim());
</script>

<textarea {id} {name} bind:value {rows} {placeholder} {required} class={fullClass}></textarea>
