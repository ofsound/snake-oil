<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { authClient } from '$lib/auth';
	import { onMount } from 'svelte';

	let { children } = $props();
	let session = $state<any>(null);

	onMount(async () => {
		await checkSession();
	});

	async function checkSession() {
		try {
			const result = await authClient.getSession();

			// Handle the response format { data: Session | null, error: Error | null }
			if (result.data) {
				session = result.data;
			} else if (result.error) {
				console.error('Session error:', result.error);
				session = null;
			} else {
				// If data is null and no error, user is not logged in
				session = null;
			}
		} catch (err) {
			console.error('Error getting session:', err);
			session = null;
		}
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if session?.user?.email}
	<header class="user-header">
		<div class="user-info">
			{#if session.user.name}
				<span class="user-name"><strong>{session.user.name}</strong></span>
			{/if}
			<span class="user-email">{session.user.email}</span>
		</div>
	</header>
{/if}

{@render children()}
