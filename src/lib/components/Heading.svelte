<script lang="ts">
	import type { Snippet } from 'svelte';
	interface Props {
		level?: 1 | 2 | 3;
		class?: string;
		children: Snippet;
	}

	let { level = 1, class: className = '', children }: Props = $props();

	const baseStyles = 'tracking-wide';

	const levelStyles = {
		1: 'text-3xl font-semibold',
		2: 'text-xl font-bold',
		3: 'text-lg font-semibold '
	};

	let classes = $derived.by(() => {
		return [baseStyles, levelStyles[level], className].filter(Boolean).join(' ');
	});
</script>

{#if level === 1}
	<h1 class={classes}>
		{@render children()}
	</h1>
{:else if level === 2}
	<h2 class={classes}>
		{@render children()}
	</h2>
{:else if level === 3}
	<h3 class={classes}>
		{@render children()}
	</h3>
{/if}
