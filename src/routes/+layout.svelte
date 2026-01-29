<script lang="ts">
	import './layout.css';

	import { useSessionWithInitialData } from '$lib/auth-client';

	import favicon from '$lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// This skips the initial network fetch and provides immediate SSR rendering
	// svelte-ignore state_referenced_locally
	const initialSessionData =
		data.session && data.user ? { session: data.session, user: data.user } : null;

	const session = useSessionWithInitialData(initialSessionData);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if $session.data?.user?.email}
	<header>
		<div>
			{#if $session.data.user.name}
				<span><strong>{$session.data.user.name}</strong></span>
			{/if}
			<span>{$session.data.user.email}</span>
		</div>
	</header>
{/if}

{@render children()}
