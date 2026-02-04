<script lang="ts">
	import { onMount } from 'svelte';
	import { SingleTrackAudioEngine } from '$lib/audio/single-track-audio-engine.svelte';
	import { formatTime } from '$lib/audio/format-time';
	import MiniSpectrumVisualizer from './MiniSpectrumVisualizer.svelte';

	interface Props {
		url: string;
	}

	let { url }: Props = $props();

	const engine = new SingleTrackAudioEngine();
	let progressRef = $state<HTMLDivElement | null>(null);

	interface TooltipState {
		visible: boolean;
		x: number;
		time: number;
	}

	let tooltip = $state<TooltipState>({ visible: false, x: 0, time: 0 });
	let isEngineReady = $state(false);
	let silentAudio: HTMLAudioElement | null = null;
	let iOSAudioUnlocked = $state(false);

	// Track which URL has been loaded (non-reactive to avoid infinite loops)
	let loadedUrl: string | null = null;

	// iOS silent mode workaround - unlock audio on first interaction
	async function unlockiOSAudio() {
		if (iOSAudioUnlocked || !silentAudio) return;

		try {
			silentAudio.volume = 0.01;
			await silentAudio.play();
			silentAudio.pause();
			iOSAudioUnlocked = true;
			console.log('iOS audio unlocked');
		} catch (err) {
			// Ignore errors, audio might already be unlocked
			console.log('iOS audio unlock attempt:', err);
		}
	}

	onMount(() => {
		// Initialize the engine
		const initialized = engine.initialize();
		isEngineReady = initialized;

		// Create silent audio element for iOS silent mode workaround
		if (typeof window !== 'undefined') {
			silentAudio = new Audio();
			silentAudio.src =
				'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA//8A';
			silentAudio.preload = 'auto';
		}

		return () => {
			engine.destroy();
			if (silentAudio) {
				silentAudio.src = '';
				silentAudio = null;
			}
		};
	});

	$effect(() => {
		// Only load buffer after engine is initialized and we have a URL
		if (url && isEngineReady && url !== loadedUrl) {
			loadedUrl = url;
			engine.loadBuffer(url);
		}
	});

	function handleProgressClick(event: MouseEvent) {
		if (!progressRef || engine.duration === 0) return;

		const rect = progressRef.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));
		const time = percentage * engine.duration;

		engine.seek(time);
	}

	function handleProgressMouseMove(event: MouseEvent) {
		if (!progressRef || engine.duration === 0) return;

		const rect = progressRef.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));
		const time = percentage * engine.duration;

		tooltip = {
			visible: true,
			x: event.clientX - rect.left,
			time
		};
	}

	function handleProgressMouseLeave() {
		tooltip = { ...tooltip, visible: false };
	}

	function handleProgressKeyDown(event: KeyboardEvent) {
		if (engine.duration === 0) return;

		const seekStep = 5; // seconds
		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				engine.seek(Math.max(0, engine.currentTime - seekStep));
				break;
			case 'ArrowRight':
				event.preventDefault();
				engine.seek(Math.min(engine.duration, engine.currentTime + seekStep));
				break;
			case 'Home':
				event.preventDefault();
				engine.seek(0);
				break;
			case 'End':
				event.preventDefault();
				engine.seek(engine.duration);
				break;
		}
	}

	// Logarithmic scale functions for filter
	function linearToLog(value: number): number {
		// Convert 0-1 to 20-20000 Hz logarithmically
		const minLog = Math.log10(20);
		const maxLog = Math.log10(20000);
		return Math.pow(10, minLog + value * (maxLog - minLog));
	}

	function logToLinear(value: number): number {
		// Convert 20-20000 Hz to 0-1 logarithmically
		const minLog = Math.log10(20);
		const maxLog = Math.log10(20000);
		return (Math.log10(value) - minLog) / (maxLog - minLog);
	}

	function formatFrequency(hz: number): string {
		if (hz >= 1000) {
			return `${(hz / 1000).toFixed(1)}kHz`;
		}
		return `${Math.round(hz)}Hz`;
	}

	function handleVolumeChange(event: Event) {
		const target = event.target as HTMLInputElement;
		engine.setVolume(parseFloat(target.value));
	}

	function handleFilterChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const linearValue = parseFloat(target.value);
		const frequency = linearToLog(linearValue);
		engine.setFilterFrequency(frequency);
	}

	const progressPercentage = $derived(
		engine.duration > 0 ? (engine.currentTime / engine.duration) * 100 : 0
	);

	const filterLinearValue = $derived(logToLinear(engine.filterFrequency));
</script>

<div class="w-full min-w-0 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
	<!-- Error Banner -->
	{#if engine.error}
		<div
			class="mb-3 flex flex-wrap items-center justify-between gap-2 rounded bg-red-50 px-3 py-2 text-sm"
		>
			<span class="min-w-0 flex-1 truncate text-red-700">{engine.error}</span>
			<button
				type="button"
				onclick={() => engine.retryLoad()}
				class="shrink-0 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
			>
				Retry
			</button>
		</div>
	{/if}

	<!-- Loading State -->
	{#if engine.isLoading}
		<div class="flex items-center justify-center gap-2 py-4">
			<div
				class="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600"
			></div>
			<span class="text-sm text-neutral-600">Loading audio...</span>
		</div>
	{:else}
		<!-- Transport Controls (Left-aligned) -->
		<div class="mb-3 flex min-w-0 items-center gap-2">
			<!-- Play/Pause Button -->
			<button
				type="button"
				onclick={() => {
					// Try to unlock iOS audio synchronously first, then play
					unlockiOSAudio().catch(() => {});
					engine.togglePlayPause();
				}}
				disabled={!engine.bufferLoaded}
				class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				aria-label={engine.isPlaying ? 'Pause' : 'Play'}
			>
				{#if engine.isPlaying}
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
						<rect x="6" y="4" width="4" height="16" rx="1" />
						<rect x="14" y="4" width="4" height="16" rx="1" />
					</svg>
				{:else}
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
						<path d="M8 5v14l11-7z" />
					</svg>
				{/if}
			</button>

			<!-- Stop/Reset Button -->
			<button
				type="button"
				onclick={() => engine.stopAndReset()}
				disabled={!engine.bufferLoaded}
				class="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-200 text-neutral-700 transition-colors hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
				aria-label="Stop and reset"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
					<rect x="4" y="4" width="16" height="16" rx="2" />
				</svg>
			</button>

			<!-- Time Display -->
			<div class="ml-auto shrink-0 text-xs text-neutral-600">
				<span class="font-mono">{formatTime(engine.currentTime)}</span>
				<span class="mx-0.5">/</span>
				<span class="font-mono">{formatTime(engine.duration)}</span>
			</div>
		</div>

		<!-- Progress Bar -->
		<div
			bind:this={progressRef}
			class="group relative mb-3 h-2 cursor-pointer rounded-full bg-neutral-200"
			onclick={handleProgressClick}
			onkeydown={handleProgressKeyDown}
			onmousemove={handleProgressMouseMove}
			onmouseleave={handleProgressMouseLeave}
			role="slider"
			aria-valuenow={engine.currentTime}
			aria-valuemax={engine.duration}
			aria-label="Progress"
			tabindex="0"
		>
			<div
				class="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-blue-600"
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
		<MiniSpectrumVisualizer analyser={engine.getAnalyser()} isPlaying={engine.isPlaying} />

		<!-- Controls Row - Stack vertically on small screens -->
		<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
			<!-- Volume Control -->
			<div class="flex w-full items-center gap-2 sm:flex-1">
				<svg
					class="h-4 w-4 shrink-0 text-neutral-500"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
					<path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
				</svg>
				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					value={engine.volume}
					oninput={handleVolumeChange}
					class="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-200 accent-blue-600"
					aria-label="Volume"
				/>
			</div>

			<!-- Filter Control -->
			<div class="flex w-full items-center gap-2 sm:flex-1">
				<svg
					class="h-4 w-4 shrink-0 text-neutral-500"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
				</svg>
				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					value={filterLinearValue}
					oninput={handleFilterChange}
					class="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-200 accent-purple-600"
					aria-label="Low-pass filter frequency"
				/>
				<span class="shrink-0 text-right font-mono text-xs text-neutral-600">
					{formatFrequency(engine.filterFrequency)}
				</span>
			</div>
		</div>
	{/if}
</div>
