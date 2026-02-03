<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'elevated' | 'flat' | 'ghost' | 'interactive';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		class?: string;
		children: Snippet;
	}

	let { variant = 'elevated', padding = 'md', class: className = '', children }: Props = $props();

	const variantClasses: Record<string, string> = {
		elevated: 'rounded-lg border border-gray-200 bg-white shadow-sm',
		flat: 'rounded-lg border border-gray-200 bg-white',
		ghost: 'rounded-lg border border-gray-200',
		interactive:
			'rounded-lg border border-gray-200 bg-white shadow-sm hover:border-gray-300 hover:shadow-md transition-all'
	};

	const paddingClasses: Record<string, string> = {
		none: '',
		sm: 'p-4',
		md: 'p-5',
		lg: 'p-8'
	};

	let classes = $derived.by(() => {
		return [variantClasses[variant], paddingClasses[padding], className].filter(Boolean).join(' ');
	});
</script>

<div class={classes}>
	{@render children()}
</div>
