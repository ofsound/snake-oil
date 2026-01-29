<script lang="ts">
	import './layout.css';

	import favicon from '$lib/assets/favicon.svg';

	/** @type {import('./$types').LayoutProps} */
	let { data, children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{#if data.user?.email}
	<header>
		<div>
			{#if data.user.name}
				<span><strong>{data.user.name}</strong></span>
			{/if}
			<span>{data.user.email}</span>
		</div>
	</header>
{/if}

{@render children()}
