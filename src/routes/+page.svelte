<script lang="ts">
	import AuthForms from '$lib/components/AuthForms.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let uploading = $state(false);
	let uploadMessage = $state<string | null>(null);
	let uploadError = $state<string | null>(null);

	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData | undefined } = $props();

	let currentTrack = $state<(typeof data.tracks)[0] | null>(null);

	function selectTrack(track: (typeof data.tracks)[0]) {
		currentTrack = track;
	}

	// Handle form result
	$effect(() => {
		if (form?.success) {
			uploadMessage = 'File uploaded successfully!';
			uploadError = null;
			// Refresh the page data to show the new track
			invalidateAll();
		} else if (form?.message) {
			uploadError = form.message;
			uploadMessage = null;
		}
	});
</script>

<AuthForms />

<h1>Here we go again...</h1>

<p>I'm embarassed by how many "vibes" I've wasted on this project.</p>

<form
	method="POST"
	enctype="multipart/form-data"
	use:enhance={() => {
		uploading = true;
		uploadMessage = null;
		uploadError = null;
		return async ({ update, result }) => {
			uploading = false;
			await update();
			// Clear messages after 3 seconds
			if (result.type === 'success') {
				setTimeout(() => {
					uploadMessage = null;
				}, 3000);
			}
		};
	}}
>
	<label for="audio">Select MP3:</label>
	<input type="file" name="audio" accept="audio/mpeg,.mp3" required />

	{#if uploadMessage}
		<div class="mb-4 rounded border border-green-500 bg-green-100 px-3 py-3 text-sm text-green-800">
			{uploadMessage}
		</div>
	{/if}
	{#if uploadError}
		<div class="mb-4 rounded border border-red-500 bg-red-100 px-3 py-3 text-sm text-red-800">
			{uploadError}
		</div>
	{/if}

	<button type="submit" disabled={uploading}>
		{uploading ? 'Uploading...' : 'Upload Track'}
	</button>
</form>

<main class="mx-auto max-w-[600px] p-8">
	<h2>Music Library</h2>

	{#if data.tracks.length === 0}
		<p>No tracks found. Go to the upload page to add some!</p>
	{:else}
		<ul class="list-none p-0">
			{#each data.tracks as track (track.id)}
				<li
					class="flex items-center justify-between border-b border-gray-200 p-4"
					class:bg-blue-50={currentTrack?.id === track.id}
					class:rounded-lg={currentTrack?.id === track.id}
				>
					<div class="flex flex-col">
						<strong>{track.name}</strong>
						<span>Added: {track.createdAt?.toLocaleDateString()}</span>
					</div>
					<button onclick={() => selectTrack(track)}>
						{currentTrack?.id === track.id ? 'Playing...' : 'Play'}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if currentTrack}
		<footer
			class="fixed right-0 bottom-0 left-0 flex justify-center bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]"
		>
			<div class="now-playing">
				<p>Now Playing: <strong>{currentTrack.name}</strong></p>
				<audio controls src={currentTrack.url} autoplay>
					Your browser does not support the audio element.
				</audio>
			</div>
		</footer>
	{/if}
</main>
