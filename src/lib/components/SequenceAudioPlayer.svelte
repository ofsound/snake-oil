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

	const LOAD_TIMEOUT_MS = 15000;

	const engine = new MultiTrackAudioEngine();
	let isInitialized = $state(false);
	let hasBuzzed = $state(false);
	let isBuffersLoaded = $state(false);
	let loadError = $state<string | null>(null);
	let previousTrackIndex = $state(-1);
	let isTransitioning = $state(false);

	// Calculate total duration and segment widths
	const totalDuration = $derived(engine.getTotalDuration());

	const segmentWidths = $derived(
		tracks.map((_, index) => {
			const duration = engine.getTrackDuration(index);
			return totalDuration > 0 ? (duration / totalDuration) * 100 : 100 / tracks.length;
		})
	);

	// Current position in sequence
	const currentTrackIndex = $derived(engine.currentTrackIndex);
	const currentTrackTime = $derived(engine.currentTime);
	const isPlaying = $derived(engine.isPlaying);

	// Detect track transitions
	$effect(() => {
		if (currentTrackIndex !== previousTrackIndex) {
			isTransitioning = true;
			previousTrackIndex = currentTrackIndex;
			// Clear transitioning state after a short delay
			setTimeout(() => {
				isTransitioning = false;
			}, 50);
		}
	});

	// Calculate elapsed time in the entire sequence
	const elapsedTime = $derived.by(() => {
		let elapsed = 0;
		for (let i = 0; i < currentTrackIndex; i++) {
			elapsed += engine.getTrackDuration(i);
		}
		elapsed += currentTrackTime;
		return elapsed;
	});

	onMount(() => {
		engine.initialize();
		engine.isLoopEnabled = true; // Enable infinite loop for sequence
		let timeoutId: ReturnType<typeof setTimeout> | null = null;

		const finishLoading = (error: string | null) => {
			isBuffersLoaded = true;
			if (error) loadError = error;
		};

		timeoutId = setTimeout(() => {
			if (!isBuffersLoaded) {
				finishLoading(
					'Audio is taking too long to load. You can still choose which track you think it is below.'
				);
			}
		}, LOAD_TIMEOUT_MS);

		engine
			.loadBuffers(tracks)
			.then(() => {
				if (timeoutId) clearTimeout(timeoutId);
				timeoutId = null;
				isBuffersLoaded = true;
				const loadedCount = tracks.filter((_, i) => engine.getTrackDuration(i) > 0).length;
				if (loadedCount === 0) {
					loadError = 'Failed to load audio tracks. Please check your connection and try again.';
				}
			})
			.catch((err) => {
				if (timeoutId) clearTimeout(timeoutId);
				timeoutId = null;
				isBuffersLoaded = true;
				loadError = 'Failed to load audio tracks';
				console.error('[SequenceAudioPlayer] Error loading tracks:', err);
			});
		isInitialized = true;

		return () => {
			if (timeoutId) clearTimeout(timeoutId);
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

	function handleChooseTrackWithoutAudio(trackIndex: number) {
		if (hasBuzzed || disabled) return;
		hasBuzzed = true;
		onBuzzer(trackIndex);
	}

	function getSegmentFillPercent(trackIndex: number): number {
		if (trackIndex < currentTrackIndex) {
			// Completed track
			return 100;
		} else if (trackIndex === currentTrackIndex) {
			// Current track - calculate progress
			const trackDuration = engine.getTrackDuration(trackIndex);
			if (trackDuration <= 0) return 0;
			// During transition, show 0% until time updates for the new track
			if (isTransitioning && currentTrackTime > trackDuration * 0.5) return 0;
			return (currentTrackTime / trackDuration) * 100;
		} else {
			// Future track
			return 0;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<!-- Track Counter -->
	<div class="text-center text-sm font-medium text-text-primary">
		Track {currentTrackIndex + 1} of {tracks.length}
	</div>

	<!-- Loading State -->
	{#if !isBuffersLoaded}
		<div class="flex items-center justify-center gap-2 py-2">
			<div
				class="border-t-accent-emerald-border h-4 w-4 animate-spin rounded-full border-2 border-border-muted"
			></div>
			<span class="text-sm text-text-secondary">Loading audio...</span>
		</div>
	{:else if loadError}
		<div class="flex flex-col gap-3">
			<div
				class="rounded-md border border-border bg-accent-amber-bg px-4 py-3 text-sm text-accent-amber-text"
			>
				{loadError}
			</div>
			<div class="flex flex-col gap-2">
				<span class="text-sm font-medium text-text-primary"
					>Choose which track you think it is:</span
				>
				<div class="flex flex-wrap gap-2">
					{#each tracks as _track, index (_track.id)}
						<button
							type="button"
							onclick={() => handleChooseTrackWithoutAudio(index)}
							disabled={hasBuzzed || disabled}
							class="rounded-lg border border-border-muted bg-surface-elevated px-4 py-2 text-sm font-medium text-text-secondary shadow-sm transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
						>
							Track {index + 1}
						</button>
					{/each}
				</div>
			</div>
		</div>
	{:else}
		<!-- Segmented Progress Bar -->
		<div class="relative h-3 w-full overflow-hidden rounded-full bg-surface-subtle">
			<div class="flex h-full w-full">
				{#each tracks, index (index)}
					{@const width = segmentWidths[index]}
					{@const fillPercent = getSegmentFillPercent(index)}
					<div
						class="relative h-full {index < tracks.length - 1
							? 'border-r border-surface-elevated'
							: ''}"
						style="width: {width}%"
					>
						<!-- Background -->
						<div class="absolute inset-0 bg-surface-muted"></div>
						<!-- Fill -->
						<div
							class="absolute inset-y-0 left-0 {index < currentTrackIndex
								? 'bg-accent-emerald-bg'
								: 'bg-accent-emerald-text'}"
							style="width: {fillPercent}%"
						></div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Time Display -->
		<div class="text-center text-xs text-text-secondary">
			{formatTime(elapsedTime)} / {formatTime(totalDuration)}
		</div>
	{/if}

	<!-- Controls -->
	<div class="flex items-center justify-center gap-4">
		<!-- Play/Pause Button -->
		<button
			type="button"
			onclick={handleTogglePlay}
			disabled={!isInitialized || !isBuffersLoaded || hasBuzzed}
			class="flex h-14 w-14 items-center justify-center rounded-full bg-accent-emerald-text text-text-inverse shadow-md transition-colors hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
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
			class="flex h-20 w-20 items-center justify-center rounded-full bg-accent-red-text text-lg font-bold text-text-inverse shadow-lg transition-all hover:scale-105 hover:brightness-90 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed disabled:bg-surface-subtle"
		>
			{#if hasBuzzed}
				Pressed
			{:else}
				BUZZ
			{/if}
		</button>
	</div>

	{#if hasBuzzed}
		<div class="text-center text-sm text-text-secondary">
			You pressed during Track {currentTrackIndex + 1}
		</div>
	{/if}
</div>
