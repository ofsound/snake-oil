<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { ModeWatcher } from 'mode-watcher';

	import Button from '$lib/components/Button.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	import { authClient } from '$lib/auth-client';

	import favicon from '$lib/assets/favicon.svg';

	import type { LayoutProps } from './$types';

	import './layout.css';
	let { data, children }: LayoutProps = $props();

	let loading = $state(false);

	async function handleSignOut() {
		loading = true;
		try {
			await authClient.signOut();
			// Redirect to home after successful logout
			goto(resolve('/'), { invalidateAll: true });
		} catch (err: unknown) {
			console.error('Sign out error:', err);
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- ModeWatcher handles the dark mode class toggling -->
<ModeWatcher defaultMode="system" />

<div class="flex min-h-svh w-full flex-col">
	<header
		class="border-b border-gray-200 bg-slate-200/80 py-4 transition-colors duration-200 dark:border-gray-700 dark:bg-slate-800/80"
	>
		<div class="mx-auto flex max-w-5xl justify-between gap-2 px-8">
			<a
				href={resolve('/')}
				class="text-xl font-bold transition-colors duration-200 text-shadow-sm text-shadow-zinc-400/20 dark:text-shadow-zinc-600/20"
				>snakeoil.app</a
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

	<div class="mx-auto w-full max-w-5xl grow p-8 transition-colors duration-200">
		{@render children()}
	</div>

	<footer class="mt-4 flex justify-end p-4">
		<ThemeToggle />
	</footer>
</div>
