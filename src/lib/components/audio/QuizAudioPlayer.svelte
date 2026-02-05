<script lang="ts">
	import { onMount } from 'svelte';
	import { quizAudioContext } from '$lib/audio/quiz-audio-context.svelte';
	import { formatTime } from '$lib/audio/format-time';
	import MiniSpectrumVisualizer from './MiniSpectrumVisualizer.svelte';

	interface Props {
		soundbiteId: string;
		url: string;
	}

	let { soundbiteId, url }: Props = $props();

	let progressRef = $state<HTMLDivElement | null>(null);

	interface TooltipState {
		visible: boolean;
		x: number;
		time: number;
	}

	let tooltip = $state<TooltipState>({ visible: false, x: 0, time: 0 });

	// Local player state
	let isPlaying = $state(false);
	let isLoading = $state(false);
	let currentTime = $state(0);
	let duration = $state(0);
	let error = $state<string | null>(null);

	// iOS 17+: use playback session so Web Audio is not muted by the silent switch.
	function setAudioSessionPlayback(): void {
		const nav = navigator as Navigator & { audioSession?: { type: string } };
		if (typeof nav.audioSession !== 'undefined' && nav.audioSession.type !== undefined) {
			try {
				nav.audioSession.type = 'playback';
			} catch {
				// Ignore if setting fails
			}
		}
	}

	onMount(() => {
		// Register this player with the shared context
		quizAudioContext.register(soundbiteId, {
			onPlay: () => {
				isPlaying = true;
				isLoading = false;
			},
			onPause: () => {
				isPlaying = false;
				isLoading = false;
				// Don't reset time - maintain position for resume
			},
			onStop: () => {
				isPlaying = false;
				currentTime = 0;
			},
			onEnded: () => {
				isPlaying = false;
				currentTime = 0;
			}
		});

		return () => {
			// Unregister when component destroys
			quizAudioContext.unregister(soundbiteId);
		};
	});

	// Watch for changes in the shared context
	$effect(() => {
		const isCurrentPlayer = quizAudioContext.currentPlayerId === soundbiteId;

		// If we're no longer the current player, update playing state only
		// Don't reset currentTime - preserve it for potential resume
		if (!isCurrentPlayer && isPlaying) {
			isPlaying = false;
		}
	});

	// Sync with shared engine's reactive state when we're the active player
	$effect(() => {
		const engine = quizAudioContext.engine;
		if (quizAudioContext.currentPlayerId === soundbiteId && engine) {
			// Subscribe to engine's reactive state
			currentTime = engine.currentTime;
			duration = engine.duration;
			isLoading = engine.isLoading;
			error = engine.error;
		}
	});

	function handleProgressPointerDown(event: PointerEvent) {
		if (!progressRef || duration === 0 || quizAudioContext.currentPlayerId !== soundbiteId) return;

		// Capture pointer to track movement outside the element
		progressRef.setPointerCapture(event.pointerId);

		const rect = progressRef.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));
		const time = percentage * duration;

		// Seek in the shared engine
		quizAudioContext.engine?.seek(time);

		// Show tooltip for touch devices
		if (event.pointerType === 'touch') {
			tooltip = {
				visible: true,
				x: event.clientX - rect.left,
				time
			};
		}
	}

	function handleProgressPointerMove(event: PointerEvent) {
		if (!progressRef || duration === 0) return;

		const rect = progressRef.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));
		const time = percentage * duration;

		tooltip = {
			visible: true,
			x: event.clientX - rect.left,
			time
		};
	}

	function handleProgressPointerUp(event: PointerEvent) {
		// Release pointer capture
		if (progressRef) {
			progressRef.releasePointerCapture(event.pointerId);
		}
		tooltip = { ...tooltip, visible: false };
	}

	function handleProgressPointerLeave() {
		tooltip = { ...tooltip, visible: false };
	}

	function handleProgressKeyDown(event: KeyboardEvent) {
		if (duration === 0 || quizAudioContext.currentPlayerId !== soundbiteId) return;

		const engine = quizAudioContext.engine;
		if (!engine) return;

		const seekStep = 5; // seconds
		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				engine.seek(Math.max(0, currentTime - seekStep));
				break;
			case 'ArrowRight':
				event.preventDefault();
				engine.seek(Math.min(duration, currentTime + seekStep));
				break;
			case 'Home':
				event.preventDefault();
				engine.seek(0);
				break;
			case 'End':
				event.preventDefault();
				engine.seek(duration);
				break;
		}
	}

	async function handleTogglePlay() {
		setAudioSessionPlayback();
		// Only show loading when we're about to load (switching to this player); pause/resume is instant
		if (quizAudioContext.currentPlayerId !== soundbiteId) {
			isLoading = true;
		}
		await quizAudioContext.play(soundbiteId, url);
		if (quizAudioContext.currentPlayerId !== soundbiteId) {
			isLoading = false;
		}
	}

	function handleStop() {
		quizAudioContext.stop(soundbiteId);
	}

	const progressPercentage = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);

	// Determine if this player is disabled (engine error or not current and can't play)
	const isDisabled = $derived(quizAudioContext.isEngineError);
</script>

<div class="w-full min-w-0">
	<!-- Error Banner -->
	{#if error}
		<div
			class="mb-3 flex flex-wrap items-center justify-between gap-2 rounded bg-red-50 px-3 py-2 text-sm"
		>
			<span class="min-w-0 flex-1 truncate text-red-700">{error}</span>
			<button
				type="button"
				onclick={() => quizAudioContext.engine?.retryLoad()}
				class="shrink-0 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
			>
				Retry
			</button>
		</div>
	{/if}

	<!-- Transport Controls (Left-aligned) -->
	<div class="mb-4 flex min-w-0 items-center gap-2">
		<!-- Play/Pause Button with Loading Overlay -->
		<div class="relative">
			<button
				type="button"
				onclick={handleTogglePlay}
				disabled={isDisabled || isLoading}
				class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
				aria-label={isPlaying ? 'Pause' : 'Play'}
			>
				{#if isLoading}
					<div
						class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"
					></div>
				{:else if isPlaying}
					<svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
						<rect x="6" y="4" width="4" height="16" rx="1" />
						<rect x="14" y="4" width="4" height="16" rx="1" />
					</svg>
				{:else}
					<svg class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
						<path d="M8 5v14l11-7z" />
					</svg>
				{/if}
			</button>
		</div>

		<!-- Stop/Reset Button -->
		<button
			type="button"
			onclick={handleStop}
			disabled={!isPlaying || isDisabled || isLoading}
			class="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-neutral-700 transition-colors hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
			aria-label="Stop and reset"
		>
			<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
				<rect x="4" y="4" width="16" height="16" rx="2" />
			</svg>
		</button>

		<!-- Loading Indicator Text (shown when loading) -->
		{#if isLoading}
			<span class="text-sm text-neutral-600">Loading...</span>
		{/if}

		<!-- Time Display -->
		<div class="ml-auto shrink-0 text-xs text-neutral-600">
			<span class="font-mono">{formatTime(currentTime)}</span>
			<span class="mx-0.5">/</span>
			<span class="font-mono">{formatTime(duration)}</span>
		</div>
	</div>

	<!-- Progress Bar -->
	<div
		bind:this={progressRef}
		class="group relative h-2 cursor-pointer touch-none rounded-full bg-neutral-200"
		onpointerdown={handleProgressPointerDown}
		onpointermove={handleProgressPointerMove}
		onpointerup={handleProgressPointerUp}
		onpointerleave={handleProgressPointerLeave}
		onkeydown={handleProgressKeyDown}
		role="slider"
		aria-valuenow={currentTime}
		aria-valuemax={duration}
		aria-label="Progress"
		tabindex="0"
	>
		<div
			class="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-emerald-600"
			style="width: {progressPercentage}%"
		></div>

		<!-- Tooltip -->
		{#if tooltip.visible}
			<div
				class="pointer-events-none absolute -top-7 -translate-x-1/2 transform rounded bg-neutral-800 px-2 py-1 text-xs text-white"
				style="left: {tooltip.x}px"
			>
				{formatTime(tooltip.time)}
			</div>
		{/if}
	</div>

	<!-- Spectrum Visualizer -->
	{#if isPlaying}
		<MiniSpectrumVisualizer analyser={quizAudioContext.getAnalyser()} {isPlaying} />
	{/if}
</div>
