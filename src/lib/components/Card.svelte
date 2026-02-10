<script lang="ts">
	import type { Snippet } from 'svelte';
	interface Props {
		variant?: 'elevated' | 'flat' | 'neutral' | 'ghost' | 'interactive';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		class?: string;
		children: Snippet;
	}

	let { variant = 'flat', padding = 'md', class: className = '', children }: Props = $props();

	const variantClasses: Record<string, string> = {
		elevated: 'bg-surface-elevated shadow-sm border-border',
		flat: 'bg-surface border-border',
		neutral: 'bg-surface-subtle border-border-subtle',
		ghost: '',
		interactive:
			'bg-surface shadow-sm border-border hover:border-muted hover:shadow-md transition-all'
	};

	const baseClasses = 'rounded-sm border border-border';

	const paddingClasses: Record<string, string> = {
		none: '',
		sm: 'p-4',
		md: 'p-5',
		lg: 'p-8'
	};

	let classes = $derived.by(() => {
		return [baseClasses, variantClasses[variant], paddingClasses[padding], className]
			.filter(Boolean)
			.join(' ');
	});
</script>

<div class={classes}>
	{@render children()}
</div>
