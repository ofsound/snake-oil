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
		elevated: 'bg-white shadow-sm',
		flat: 'bg-white',
		neutral: 'bg-neutral-50 border-neutral-100',
		ghost: '',
		interactive: 'bg-white shadow-sm hover:border-gray-300 hover:shadow-md transition-all'
	};

	const baseClasses = 'rounded-sm border border-gray-200';

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
