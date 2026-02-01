<script lang="ts">
	import { goto } from '$app/navigation';

	import { useSessionWithInitialData, authClient } from '$lib/auth-client';

	import type { LayoutProps } from './$types';

	import favicon from '$lib/assets/favicon.svg';
	import './layout.css';

	let { data, children }: LayoutProps = $props();

	// svelte-ignore state_referenced_locally
	const session = useSessionWithInitialData(
		data.session ? { session: data.session, user: data.user } : null
	);

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
		<a href="/" class="text-xl font-bold text-shadow-sm text-shadow-zinc-400/20">guessmyaudio.com</a
		>

		<div class="flex gap-3">
			{#if $session.data?.user.name}
				<a
					href="/profile"
					class="cursor-pointer rounded-sm border border-stone-300 bg-emerald-800 px-1.5 py-0.5 text-sm text-white"
					>{$session.data?.user.name} <span class="text-xs">(profile)</span></a
				>
				<button
					type="button"
					onclick={handleSignOut}
					disabled={loading}
					class="cursor-pointer rounded-sm border border-stone-500 bg-zinc-600 px-1.5 py-0.5 text-sm text-white"
				>
					log out
				</button>
			{:else}
				<a
					href="/login"
					class="cursor-pointer rounded-sm border border-stone-500 bg-zinc-600 px-1.5 py-0.5 text-sm text-white"
				>
					sign in
				</a>
			{/if}
		</div>
	</div>
</header>

{@render children()}
