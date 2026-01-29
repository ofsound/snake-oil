<script lang="ts">
	import './layout.css';

	import { useSessionWithInitialData } from '$lib/auth-client';

	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// svelte-ignore state_referenced_locally
	const initialSessionData =
		data.session && data.user ? { session: data.session, user: data.user } : null;

	const session = useSessionWithInitialData(initialSessionData);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if $session.data?.user.name}
	<header class="bg-slate-200 px-4 py-2">
		<div class="flex justify-between gap-2">
			<a href="/" class="font-bold">snakeoil.csstune.com</a>
			<a href="/profile" class="text-blue-500 hover:text-blue-700">{$session.data.user.name}</a>
		</div>
	</header>
{/if}

{@render children()}
