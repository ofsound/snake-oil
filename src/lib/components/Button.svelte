<script lang="ts">
	import { resolvePath } from '$lib/utils';

	import Icon from './Icon.svelte';

	import type { IconName } from './Icon.svelte';
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
		form?: string;
		href?: string;
		target?: string;
		rel?: string;
		class?: string;
		title?: string;
		onclick?: (e: MouseEvent) => void;
		icon?: string;
		iconPosition?: 'left' | 'right';
		children?: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		disabled = false,
		loading = false,
		active = false,
		fullWidth = false,
		form,
		href,
		target,
		rel,
		class: className = '',
		title,
		onclick,
		icon,
		iconPosition = 'left',
		children
	}: Props = $props();

	const variantClasses: Record<string, string> = {
		primary:
			'bg-accent-emerald-bg text-accent-emerald-text border border-accent-emerald-bg hover:brightness-95',
		secondary:
			'bg-interactive-bg text-text-primary border border-border hover:bg-interactive-bg-hover',
		accent:
			'bg-accent-indigo-bg text-accent-indigo-text border border-accent-indigo-bg hover:brightness-95',
		danger: 'bg-accent-red-bg text-accent-red-text border border-accent-red-bg hover:brightness-95',
		outline: 'bg-surface border border-border text-text-primary hover:bg-interactive-bg',
		ghost: 'bg-transparent text-text-secondary hover:text-text-primary',
		admin:
			'bg-admin-accent-violet-bg text-admin-accent-violet-text border border-admin-accent-violet-bg hover:brightness-95',
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
		'inline-flex items-center justify-center gap-2 cursor-pointer rounded-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

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
		{title}
		class={classes}
		{onclick}
	>
		{#if icon && iconPosition === 'left'}
			<Icon name={icon as IconName} size={size === 'xs' ? 'xs' : size === 'sm' ? 'sm' : 'md'} />
		{/if}
		{#if children}
			{@render children()}
		{/if}
		{#if icon && iconPosition === 'right'}
			<Icon name={icon as IconName} size={size === 'xs' ? 'xs' : size === 'sm' ? 'sm' : 'md'} />
		{/if}
	</a>
{:else}
	<button {type} {form} class={classes} disabled={disabled || loading} {onclick}>
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
				{#if children}
					{@render children()}
				{/if}
			</span>
		{:else}
			{#if icon && iconPosition === 'left'}
				<Icon name={icon as IconName} size={size === 'xs' ? 'xs' : size === 'sm' ? 'sm' : 'md'} />
			{/if}
			{#if children}
				{@render children()}
			{/if}
			{#if icon && iconPosition === 'right'}
				<Icon name={icon as IconName} size={size === 'xs' ? 'xs' : size === 'sm' ? 'sm' : 'md'} />
			{/if}
		{/if}
	</button>
{/if}
