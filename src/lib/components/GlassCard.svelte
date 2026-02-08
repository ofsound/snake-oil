<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
		class?: string;
		interactive?: boolean;
		glowOnHover?: boolean;
		href?: string;
		children: Snippet;
	}

	let {
		padding = 'md',
		class: className = '',
		interactive = true,
		glowOnHover = true,
		href,
		children
	}: Props = $props();

	const paddingClasses: Record<string, string> = {
		none: '',
		sm: 'p-4',
		md: 'p-6',
		lg: 'p-8',
		xl: 'p-10'
	};

	let classes = $derived.by(() => {
		const baseClasses = 'glass-card rounded-xl';
		const interactiveClasses = interactive ? 'cursor-pointer' : '';
		const glowClasses = glowOnHover ? 'hover:shadow-[0_8px_32px_rgba(124,58,237,0.2)]' : '';

		return [baseClasses, interactiveClasses, glowClasses, paddingClasses[padding], className]
			.filter(Boolean)
			.join(' ');
	});
</script>

{#if href}
	<a {href} class={classes}>
		{@render children()}
	</a>
{:else}
	<div class={classes}>
		{@render children()}
	</div>
{/if}
