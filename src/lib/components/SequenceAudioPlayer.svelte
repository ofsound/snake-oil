<script lang="ts">
	import { onMount } from 'svelte';
	import { MultiTrackAudioEngine } from '$lib/audio/multi-track-audio-engine.svelte';
	import { formatTime } from '$lib/audio/format-time';
	import type { SequenceTrack } from '$lib/variant-types';

	interface Props {
		tracks: SequenceTrack[];
		onBuzzer: (trackIndex: number) => void;
		disabled?: boolean;
	}

	let { tracks, onBuzzer, disabled = false }: Props = $props();

	const engine = new MultiTrackAudioEngine();
	let isInitialized = $state(false);
	let hasBuzzed = $state(false);

	// Calculate total duration and segment widths
	const totalDuration = $derived(engine.getTotalDuration());

	const segmentWidths = $derived(
		tracks.map((_, index) => {
			const duration = engine.getTrackDuration(index);
			return totalDuration > 0 ? (duration / totalDuration) * 100 : 0;
		})
	);

	// Current position in sequence
	const currentTrackIndex = $derived(engine.currentTrackIndex);
	const currentTrackTime = $derived(engine.currentTime);
	const isPlaying = $derived(engine.isPlaying);

	// Calculate elapsed time in the entire sequence
	const elapsedTime = $derived(() => {
		let elapsed = 0;
		for (let i = 0; i < currentTrackIndex; i++) {
			elapsed += engine.getTrackDuration(i);
		}
		elapsed += currentTrackTime;
		return elapsed;
	});

	onMount(() => {
		engine.initialize();
		engine.loadBuffers(tracks);
		isInitialized = true;

		return () => {
			engine.destroy();
		};
	});

	function handleTogglePlay() {
		if (!isInitialized) return;
		engine.togglePlayPause();
	}

	function handleBuzzer() {
		if (hasBuzzed || disabled) return;
		hasBuzzed = true;
		onBuzzer(currentTrackIndex);
		// Pause playback after buzz
		if (isPlaying) {
			engine.togglePlayPause();
		}
	}

	function getSegmentFillPercent(trackIndex: number): number {
		if (trackIndex < currentTrackIndex) {
			// Completed track
			return 100;
		} else if (trackIndex === currentTrackIndex) {
			// Current track - calculate progress
			const trackDuration = engine.getTrackDuration(trackIndex);
			if (trackDuration <= 0) return 0;
			return (currentTrackTime / trackDuration) * 100;
		} else {
			// Future track
			return 0;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<!-- Track Counter -->
	<div class="text-center text-sm font-medium text-gray-700">
		Track {currentTrackIndex + 1} of {tracks.length}
	</div>

	<!-- Segmented Progress Bar -->
	<div class="relative h-3 w-full overflow-hidden rounded-full bg-gray-100">
		<div class="flex h-full w-full">
			{#each tracks as _, index (index)}
				{@const width = segmentWidths[index]}
				{@const fillPercent = getSegmentFillPercent(index)}
				<div
					class="relative h-full {index < tracks.length - 1 ? 'border-r border-white' : ''}"
					style="width: {width}%"
				>
					<!-- Background -->
					<div class="absolute inset-0 bg-neutral-200"></div>
					<!-- Fill -->
					<div
						class="absolute inset-y-0 left-0 transition-all duration-100 {index < currentTrackIndex
							? 'bg-emerald-400'
							: 'bg-emerald-600'}"
						style="width: {fillPercent}%"
					></div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Time Display -->
	<div class="text-center text-xs text-gray-600">
		{formatTime(elapsedTime())} / {formatTime(totalDuration)}
	</div>

	<!-- Controls -->
	<div class="flex items-center justify-center gap-4">
		<!-- Play/Pause Button -->
		<button
			type="button"
			onclick={handleTogglePlay}
			disabled={!isInitialized || hasBuzzed}
			class="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
			aria-label={isPlaying ? 'Pause' : 'Play'}
		>
			{#if isPlaying}
				<svg class="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
					<rect x="6" y="4" width="4" height="16" rx="1" />
					<rect x="14" y="4" width="4" height="16" rx="1" />
				</svg>
			{:else}
				<svg class="h-7 w-7" viewBox="0 0 24 24" fill="currentColor">
					<path d="M8 5v14l11-7z" />
				</svg>
			{/if}
		</button>
	</div>

	<!-- Buzzer Button -->
	<div class="flex justify-center">
		<button
			type="button"
			onclick={handleBuzzer}
			disabled={hasBuzzed || disabled}
			class="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-red-700 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed disabled:bg-gray-400"
		>
			{#if hasBuzzed}
				Pressed
			{:else}
				BUZZ
			{/if}
		</button>
	</div>

	{#if hasBuzzed}
		<div class="text-center text-sm text-gray-600">
			You pressed during Track {currentTrackIndex + 1}
		</div>
	{/if}
</div>
