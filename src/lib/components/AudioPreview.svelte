<script lang="ts">
	interface Props {
		url: string;
		filename: string;
	}

	let { url, filename }: Props = $props();

	let audio: HTMLAudioElement | null = $state(null);
	let isPlaying = $state(false);

	function togglePlay() {
		if (!audio) return;

		if (isPlaying) {
			audio.pause();
		} else {
			audio.play();
		}
	}

	function handlePlay() {
		isPlaying = true;
	}

	function handlePause() {
		isPlaying = false;
	}

	function handleEnded() {
		isPlaying = false;
		if (audio) {
			audio.currentTime = 0;
		}
	}
</script>

<div class="flex items-center gap-2">
	<button
		type="button"
		onclick={togglePlay}
		class="hover:bg-surface-elevated-hover flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-text-primary focus:ring-2 focus:ring-border focus:ring-offset-2 focus:outline-none"
		aria-label={isPlaying ? 'Pause' : 'Play'}
	>
		{#if isPlaying}
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
				<rect x="6" y="4" width="4" height="16" rx="1" />
				<rect x="14" y="4" width="4" height="16" rx="1" />
			</svg>
		{:else}
			<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
				<path d="M8 5v14l11-7z" />
			</svg>
		{/if}
	</button>
	<span class="text-sm text-text-primary">{filename}</span>
</div>

<audio bind:this={audio} src={url} onplay={handlePlay} onpause={handlePause} onended={handleEnded}
></audio>
