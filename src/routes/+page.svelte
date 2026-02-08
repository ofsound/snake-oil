<script lang="ts">
	import LoggedInHome from './LoggedInHome.svelte';
	import LoggedOutHome from './LoggedOutHome.svelte';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let isLoggedIn = $derived(!!data.user?.name);
</script>

{#if isLoggedIn}
	<LoggedInHome {data} />
{:else}
	<LoggedOutHome {data} />
{/if}
