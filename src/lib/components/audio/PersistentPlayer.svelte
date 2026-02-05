<script lang="ts">
	import { onMount } from 'svelte';
	import type { Component } from 'svelte';
	import { AudioEngine } from '$lib/audio/audio-engine.svelte';
	import { formatTime } from '$lib/audio/format-time';
	import PlayerTransport from './PlayerTransport.svelte';
	import SinglePlaylist from './SinglePlaylist.svelte';

	interface VisualizerProps {
		analyser: AnalyserNode | null;
		isPlaying?: boolean;
	}

	let VisualizerComponent = $state<Component<VisualizerProps> | null>(null);

	interface Props {
		tracks: Array<{
			id: string;
			name: string;
			url: string;
			pathname: string | null;
			createdAt: Date | null;
		}>;
		error?: string | null;
	}

	let { tracks, error: initialError = null }: Props = $props();

	const engine = new AudioEngine();
	let playlistVisible = $state(false);
	let progressRef = $state<HTMLDivElement | null>(null);

	interface TooltipState {
		visible: boolean;
		x: number;
		time: number;
	}

	let tooltip = $state<TooltipState>({ visible: false, x: 0, time: 0 });

	onMount(() => {
		engine.initialize();
		import('./SpectrumVisualizer.svelte').then((mod) => {
			VisualizerComponent = mod.default;
		});
		return () => {
			engine.destroy();
		};
	});

	$effect(() => {
		if (tracks.length > 0) {
			engine.loadBuffers(tracks);
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

	function handleKeyDown(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}

		switch (event.key) {
			case ' ':
				event.preventDefault();
				engine.togglePlayPause();
				break;
			case 'ArrowLeft':
				event.preventDefault();
				engine.previousTrack();
				break;
			case 'ArrowRight':
				event.preventDefault();
				engine.nextTrack();
				break;
		}
	}

	const progressPercentage = $derived(
		engine.duration > 0 ? (engine.currentTime / engine.duration) * 100 : 0
	);

	const displayError = $derived(initialError || engine.error);
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="w-full overflow-hidden rounded-lg bg-white shadow-lg dark:bg-gray-900">
	<!-- Error Banner -->
	{#if displayError}
		<div class="flex items-center justify-between bg-red-500 px-4 py-3 text-white">
			<span class="text-sm">{displayError}</span>
			<button
				onclick={() => engine.retryLoad()}
				class="rounded bg-white px-3 py-1 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
			>
				Retry
			</button>
		</div>
	{/if}

	<!-- Loading State -->
	{#if engine.isLoading}
		<div class="flex items-center justify-center gap-2 p-6">
			<div
				class="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-green-800 dark:border-gray-600"
			></div>
			<span class="text-sm text-gray-600 dark:text-gray-400">Loading audio...</span>
		</div>
	{:else}
		<!-- Mobile Layout -->
		<div class="flex flex-col gap-4 p-4 md:hidden">
			<!-- Title -->
			<div class="text-center">
				<h3 class="truncate text-lg font-semibold text-gray-900 dark:text-white">
					{engine.getCurrentTrack()?.name || 'No track selected'}
				</h3>
			</div>

			<!-- Playlist Button & Volume -->
			<div class="flex items-center justify-between">
				<button
					onclick={() => (playlistVisible = !playlistVisible)}
					class="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 6h16M4 12h16M4 18h16"
						/>
					</svg>
					<span class="text-sm">Playlist</span>
				</button>

				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					value={engine.volume}
					oninput={(e) => engine.setVolume(parseFloat(e.currentTarget.value))}
					class="w-24 accent-green-800"
				/>
			</div>

			<!-- Transport Controls -->
			<div class="flex justify-center">
				<PlayerTransport
					isPlaying={engine.isPlaying}
					isBuffering={engine.isBuffering}
					onPlayPause={() => engine.togglePlayPause()}
					onPrevious={() => engine.previousTrack()}
					onNext={() => engine.nextTrack()}
				/>
			</div>

			<!-- Progress Bar -->
			<div
				bind:this={progressRef}
				class="group relative h-3 cursor-pointer rounded-full bg-gray-200 dark:bg-gray-700"
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
					class="absolute inset-y-0 left-0 rounded-full bg-green-800 transition-all duration-100"
					style="width: {progressPercentage}%"
				></div>

				<!-- Tooltip -->
				{#if tooltip.visible}
					<div
						class="pointer-events-none absolute -top-8 -translate-x-1/2 transform rounded bg-gray-900 px-2 py-1 text-xs text-white"
						style="left: {tooltip.x}px"
					>
						{formatTime(tooltip.time)}
					</div>
				{/if}
			</div>

			<!-- Time Display -->
			<div class="flex justify-between text-sm text-gray-600 dark:text-gray-400">
				<span>{formatTime(engine.currentTime)}</span>
				<span>{formatTime(engine.duration)}</span>
			</div>

			<!-- Spectrum Visualizer (client-only to avoid SSR/GSAP issues) -->
			{#if VisualizerComponent}
				<VisualizerComponent analyser={engine.getAnalyser()} isPlaying={engine.isPlaying} />
			{/if}
		</div>

		<!-- Desktop Layout -->
		<div class="hidden flex-col gap-4 p-4 md:flex">
			<!-- Top Row: Title | Transport | Playlist+Volume -->
			<div class="flex items-center justify-between">
				<!-- Title -->
				<div class="mr-4 min-w-0 flex-1">
					<h3 class="truncate text-lg font-semibold text-gray-900 dark:text-white">
						{engine.getCurrentTrack()?.name || 'No track selected'}
					</h3>
				</div>

				<!-- Transport Controls -->
				<div class="shrink-0">
					<PlayerTransport
						isPlaying={engine.isPlaying}
						isBuffering={engine.isBuffering}
						onPlayPause={() => engine.togglePlayPause()}
						onPrevious={() => engine.previousTrack()}
						onNext={() => engine.nextTrack()}
					/>
				</div>

				<!-- Playlist Button & Volume -->
				<div class="ml-4 flex flex-1 items-center justify-end gap-4">
					<button
						onclick={() => (playlistVisible = !playlistVisible)}
						class="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 6h16M4 12h16M4 18h16"
							/>
						</svg>
						<span class="text-sm">Playlist</span>
					</button>

					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={engine.volume}
						oninput={(e) => engine.setVolume(parseFloat(e.currentTarget.value))}
						class="w-24 accent-green-800"
					/>
				</div>
			</div>

			<!-- Progress Bar -->
			<div
				bind:this={progressRef}
				class="group relative h-3 cursor-pointer rounded-full bg-gray-200 dark:bg-gray-700"
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
					class="absolute inset-y-0 left-0 rounded-full bg-green-800 transition-all duration-100"
					style="width: {progressPercentage}%"
				></div>

				<!-- Tooltip -->
				{#if tooltip.visible}
					<div
						class="pointer-events-none absolute -top-8 -translate-x-1/2 transform rounded bg-gray-900 px-2 py-1 text-xs text-white"
						style="left: {tooltip.x}px"
					>
						{formatTime(tooltip.time)}
					</div>
				{/if}
			</div>

			<!-- Time Display -->
			<div class="flex justify-between text-sm text-gray-600 dark:text-gray-400">
				<span>{formatTime(engine.currentTime)}</span>
				<span>{formatTime(engine.duration)}</span>
			</div>

			<!-- Spectrum Visualizer (client-only to avoid SSR/GSAP issues) -->
			{#if VisualizerComponent}
				<VisualizerComponent analyser={engine.getAnalyser()} isPlaying={engine.isPlaying} />
			{/if}
		</div>
	{/if}

	<!-- Playlist Drawer -->
	<SinglePlaylist
		{tracks}
		currentTrackIndex={engine.currentTrackIndex}
		isVisible={playlistVisible}
		onTrackSelect={(index) => engine.startTrack(index)}
		onClose={() => (playlistVisible = false)}
	/>
</div>
