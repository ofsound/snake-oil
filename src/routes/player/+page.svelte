<script lang="ts">
	import { resolve } from '$app/paths';

	import PersistentPlayer from '$lib/components/audio/PersistentPlayer.svelte';
	interface Track {
		id: string;
		name: string;
		url: string;
		pathname: string | null;
		createdAt: Date | null;
	}

	interface PageData {
		tracks?: Track[];
		error?: string;
	}

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let { tracks, error } = $derived(data);
</script>

<svelte:head>
	<title>Player</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<div class="mx-auto max-w-4xl p-4 md:p-8">
		{#if error}
			<div class="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
				<p class="text-red-700 dark:text-red-300">{error}</p>
			</div>
		{:else if tracks && tracks.length > 0}
			<PersistentPlayer {tracks} {error} />
		{:else}
			<div class="flex flex-col items-center justify-center py-16 text-center">
				<svg
					class="mb-4 h-16 w-16 text-gray-400 dark:text-gray-600"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width={1.5}
						d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
					/>
				</svg>
				<h2 class="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
					No tracks available
				</h2>
				<p class="mb-6 text-gray-600 dark:text-gray-400">There are no tracks to play right now.</p>
				<a
					href={resolve('/')}
					class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:bg-blue-600 dark:hover:bg-blue-700"
				>
					<svg
						class="mr-2 h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width={2}
							d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
						/>
					</svg>
					Go back home
				</a>
			</div>
		{/if}
	</div>
</div>
