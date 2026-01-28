<script lang="ts">
	import Auth from '$lib/components/Auth.svelte';
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

<Auth />

Hello!

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
		<div class="message success">{uploadMessage}</div>
	{/if}
	{#if uploadError}
		<div class="message error">{uploadError}</div>
	{/if}

	<button type="submit" disabled={uploading}>
		{uploading ? 'Uploading...' : 'Upload Track'}
	</button>
</form>

<!-- <div class="player-container">
  <h2>My Library</h2>
  <ul>
    {#each data.tracks as track}
      <li>
        <button on:click={() => currentTrackUrl = track.url}>
          Play {track.name}
        </button>
      </li>
    {each}
  </ul>

  {#if currentTrackUrl}
    <div class="now-playing">
      <audio controls src={currentTrackUrl} autoplay>
        Your browser does not support the audio element.
      </audio>
    </div>
  {/if}
</div>

<style>
  .player-container { padding: 20px; }
  .now-playing { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
</style> -->

<main class="container">
	<h2>Music Library</h2>

	{#if data.tracks.length === 0}
		<p>No tracks found. Go to the upload page to add some!</p>
	{:else}
		<ul class="track-list">
			{#each data.tracks as track}
				<li class:active={currentTrack?.id === track.id}>
					<div class="track-info">
						<strong>{track.name}</strong>
						<!-- <span>Added: {new Date(track.createdAt).toLocaleDateString()}</span> -->
					</div>
					<button onclick={() => selectTrack(track)}>
						{currentTrack?.id === track.id ? 'Playing...' : 'Play'}
					</button>
				</li>
			{/each}
		</ul>
	{/if}

	{#if currentTrack}
		<footer class="player-bar">
			<div class="now-playing">
				<p>Now Playing: <strong>{currentTrack.name}</strong></p>
				<audio controls src={currentTrack.url} autoplay>
					Your browser does not support the audio element.
				</audio>
			</div>
		</footer>
	{/if}
</main>

<style>
	.container {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem;
	}
	.track-list {
		list-style: none;
		padding: 0;
	}
	.track-list li {
		display: flex;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid #eee;
		align-items: center;
	}
	.active {
		background-color: #f0f9ff;
		border-radius: 8px;
	}
	.track-info {
		display: flex;
		flex-direction: column;
	}
	.player-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background: #fff;
		box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
		padding: 1rem;
		display: flex;
		justify-content: center;
	}

	.message {
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.message.success {
		background-color: #d1fae5;
		color: #065f46;
		border: 1px solid #10b981;
	}

	.message.error {
		background-color: #fee2e2;
		color: #991b1b;
		border: 1px solid #ef4444;
	}
</style>
