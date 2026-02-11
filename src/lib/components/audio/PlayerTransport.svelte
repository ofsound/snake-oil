<script lang="ts">
	import Icon from '../Icon.svelte';

	interface Props {
		isPlaying: boolean;
		isBuffering?: boolean;
		onPrevious: () => void;
		onPlayPause: () => void;
		onNext: () => void;
	}

	let { isPlaying, isBuffering = false, onPrevious, onPlayPause, onNext }: Props = $props();
</script>

<div class="flex items-center justify-center gap-3">
	<button
		type="button"
		class="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-gradient-to-t from-violet-600 to-cyan-500 text-text-inverse shadow-md transition-all hover:brightness-90 active:scale-95 md:min-h-14 md:min-w-14"
		onclick={onPrevious}
		aria-label="Previous track"
	>
		<Icon name="skip-back" size="sm" />
	</button>

	<button
		type="button"
		class="flex min-h-12 min-w-12 items-center justify-center rounded-full bg-gradient-to-t from-violet-600 to-cyan-500 text-text-inverse shadow-md transition-all hover:brightness-90 active:scale-95 md:min-h-14 md:min-w-14"
		onclick={onPlayPause}
		aria-label={isPlaying ? 'Pause' : 'Play'}
	>
		{#if isBuffering}
			<Icon name="loading" size="lg" class="animate-spin" />
		{:else if isPlaying}
			<Icon name="pause" size="lg" />
		{:else}
			<Icon name="play" size="lg" />
		{/if}
	</button>

	<button
		type="button"
		class="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-gradient-to-t from-violet-600 to-cyan-500 text-text-inverse shadow-md transition-all hover:brightness-90 active:scale-95 md:min-h-14 md:min-w-14"
		onclick={onNext}
		aria-label="Next track"
	>
		<Icon name="skip-forward" size="sm" />
	</button>
</div>
