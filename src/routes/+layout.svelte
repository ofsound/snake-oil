<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';
	import Button from '$lib/components/Button.svelte';
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

<header class="bg-slate-200/80 px-8 py-4">
	<div class="flex justify-between gap-2">
		<a href="/" class="text-xl font-bold text-shadow-sm text-shadow-zinc-400/20"
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

{@render children()}
