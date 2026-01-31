<script lang="ts">
	import './layout.css';

	import { useSessionWithInitialData, authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

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

{#if $session.data?.user.name}
	<header class="bg-slate-200 px-4 py-2">
		<div class="flex justify-between gap-2">
			<a href="/" class="font-bold">snakeoil.csstune.com</a>
			<div class="flex flex-1 gap-4">
				<a href="/create" class="mr-auto text-blue-500 hover:text-blue-700">create quiz</a>
				<a href="/profile" class="text-blue-500 hover:text-blue-700">{$session.data.user.name}</a>

				<button
					type="button"
					onclick={handleSignOut}
					disabled={loading}
					class="font-inherit cursor-pointer border-none bg-transparent p-0 text-blue-500 hover:text-blue-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
				>
					log out
				</button>
			</div>
		</div>
	</header>
{:else}
		<header class="bg-slate-200 px-4 py-2">
			<div class="flex justify-between gap-2">
				<a href="/" class="font-bold">snakeoil.csstune.com</a>
				<button
					type="button"
					onclick={() => goto('/login')}
					class="font-inherit cursor-pointer border-none bg-transparent p-0 text-blue-500 hover:text-blue-700 hover:underline"
				>
					sign in
				</button>
			</div>
		</header>
{/if}

{@render children()}
