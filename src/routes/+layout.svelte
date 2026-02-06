<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import { ModeWatcher } from 'mode-watcher';
	import Button from '$lib/components/Button.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import type { LayoutProps } from './$types';
	import favicon from '$lib/assets/favicon.svg';
	import './layout.css';

	let { data, children }: LayoutProps = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleSignOut() {
		loading = true;
		try {
			await authClient.signOut();
			// Redirect to home after successful logout
			goto('/', { invalidateAll: true });
		} catch (err: unknown) {
			console.error('Sign out error:', err);
			error = err instanceof Error ? err.message : 'Failed to sign out';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- ModeWatcher handles the dark mode class toggling -->
<ModeWatcher defaultMode="system" />

<!-- 
  Dark mode examples in layout:
  - Header: bg-slate-200/80 → dark:bg-slate-800/80
  - Text: text-shadow-zinc-400/20 → dark:text-shadow-zinc-600/20
  - Border/separators: border-gray-200 → dark:border-gray-700
-->
<header
	class="border-b border-gray-200 bg-slate-200/80 py-4 transition-colors duration-200 dark:border-gray-700 dark:bg-slate-800/80"
>
	<div class="mx-auto flex max-w-5xl justify-between gap-2 px-8">
		<a
			href="/"
			class="text-xl font-bold transition-colors duration-200 text-shadow-sm text-shadow-zinc-400/20 dark:text-shadow-zinc-600/20"
			>catchy-app-name.io</a
		>

		<div class="flex gap-3">
			{#if data.user?.name}
				<Button variant="primary" size="sm" href="/profile">
					{data.user.name} <span class="text-xs">(profile)</span>
				</Button>
				<Button variant="secondary" size="sm" onclick={handleSignOut} disabled={loading}>
					log out
				</Button>
			{:else}
				<Button variant="secondary" size="sm" href="/login">sign in</Button>
			{/if}
		</div>
	</div>
</header>

<!-- 
  Main content area with dark mode transition
  Note: Background and text colors are set on body in app.html
  but you can override per-page if needed
-->
<div class="mx-auto max-w-5xl p-8 transition-colors duration-200">
	{@render children()}
</div>

<!-- 
  Footer with centered theme toggle
  Dark mode examples:
  - Border: border-gray-200 → dark:border-gray-700  
  - Background: bg-gray-50 → dark:bg-gray-800/50
  - Text: text-gray-600 → dark:text-gray-400
-->
<footer
	class="border-t border-gray-200 bg-gray-50 py-6 transition-colors duration-200 dark:border-gray-700 dark:bg-gray-800/50"
>
	<div class="mx-auto flex max-w-5xl flex-col items-end gap-4 px-8">
		<!-- Centered theme toggle -->
		<div class="flex items-center gap-3">
			<!-- <span class="text-sm text-gray-600 dark:text-gray-400">Theme</span> -->
			<ThemeToggle />
		</div>
	</div>
</footer>
