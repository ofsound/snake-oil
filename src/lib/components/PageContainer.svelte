<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
	}

	let { children, class: className = '' }: Props = $props();
</script>

<div class="mx-auto w-full max-w-5xl grow p-8 {className}">
	{@render children()}
</div>
