<script lang="ts">
	import { resolvePath } from '$lib/utils';

	import type { Snippet } from 'svelte';
	interface Props {
		variant?:
			| 'primary'
			| 'secondary'
			| 'accent'
			| 'danger'
			| 'outline'
			| 'ghost'
			| 'admin'
			| 'glow'
			| 'glass'
			| 'gradient';
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		loading?: boolean;
		active?: boolean;
		fullWidth?: boolean;
		href?: string;
		target?: string;
		rel?: string;
		class?: string;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		loading = false,
		active = false,
		fullWidth = false,
		href,
		target,
		rel,
		class: className = '',
		onclick,
		children
	}: Props = $props();

	const variantClasses: Record<string, string> = {
		primary:
			'bg-emerald-800 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600',
		secondary: 'bg-zinc-600 text-white hover:bg-zinc-700 dark:bg-zinc-500 dark:hover:bg-zinc-600',
		accent:
			'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600',
		danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600',
		outline:
			'bg-white border border-neutral-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700',
		ghost:
			'bg-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
		admin: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600',
		glow: 'relative bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/30 transition-all duration-300',
		glass: 'glass text-white hover:bg-white/15 border-white/20 transition-all duration-300',
		gradient:
			'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 text-white hover:opacity-90 transition-opacity duration-300'
	};

	const sizeClasses: Record<string, string> = {
		xs: 'px-2 py-1 text-xs',
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-1.5 text-base',
		lg: 'px-6 py-3 text-base',
		xl: 'px-8 py-4 text-lg',
		'2xl': 'px-12 py-5 text-xl'
	};

	const baseClasses =
		'cursor-pointer rounded-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

	let classes = $derived.by(() => {
		// If active and outline variant, show accent styling instead
		let variantKey = variant;
		if (active && variant === 'outline') {
			variantKey = 'accent';
		}

		return [
			baseClasses,
			variantClasses[variantKey],
			sizeClasses[size],
			fullWidth ? 'w-full' : '',
			loading ? 'relative' : '',
			className
		]
			.filter(Boolean)
			.join(' ');
	});
</script>

{#if href}
	<a
		href={href && href.startsWith('/')
			? href.includes('?')
				? resolvePath(href.split('?')[0] ?? '') + '?' + href.split('?').slice(1).join('?')
				: resolvePath(href)
			: href}
		{target}
		{rel}
		class={classes}
		{onclick}
	>
		{@render children()}
	</a>
{:else}
	<button {type} class={classes} disabled={disabled || loading} {onclick}>
		{#if loading}
			<span class="absolute inset-0 flex items-center justify-center">
				<svg
					class="h-4 w-4 animate-spin text-current"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="4"
					/>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
			</span>
			<span class="invisible">
				{@render children()}
			</span>
		{:else}
			{@render children()}
		{/if}
	</button>
{/if}
