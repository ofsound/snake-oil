<script lang="ts">
	interface Props {
		trackUrl: string;
		gapMs: number;
		isPlaying: boolean;
	}

	let { trackUrl, gapMs, isPlaying }: Props = $props();

	let audioElement: HTMLAudioElement;
	let lastPlayedUrl = $state('');

	// Handle track URL changes and play when a new question starts
	$effect(() => {
		if (audioElement && isPlaying && trackUrl !== lastPlayedUrl) {
			lastPlayedUrl = trackUrl;
			audioElement.currentTime = 0;
			audioElement.volume = 1; // Reset volume after fade out
			audioElement.play();
		}
	});

	function handleAudioEnded() {
		// For short audio, loop with gap
		if (audioElement.duration < 5) {
			setTimeout(() => {
				if (isPlaying && audioElement) {
					audioElement.currentTime = 0;
					audioElement.play();
				}
			}, gapMs);
		}
	}

	export function fadeOutAudio() {
		if (audioElement) {
			const fadeInterval = setInterval(() => {
				if (!audioElement) {
					clearInterval(fadeInterval);
					return;
				}
				if (audioElement.volume > 0.1) {
					audioElement.volume -= 0.1;
				} else {
					audioElement.pause();
					clearInterval(fadeInterval);
				}
			}, 5);
		}
	}
</script>

<div class="mb-6">
	<audio
		src={trackUrl}
		bind:this={audioElement}
		onended={handleAudioEnded}
		autoplay={isPlaying}
		class="hidden"
	></audio>

	<div class="flex items-center justify-center rounded-xl bg-white/5 p-8">
		<div class="flex items-center gap-4">
			<div
				class="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-r from-amber-500 to-orange-500"
			>
				<svg class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
					/>
				</svg>
			</div>
			<div>
				<div class="text-lg font-semibold text-white">Now Playing</div>
				<div class="text-sm text-white/60">Listen carefully...</div>
			</div>
		</div>
	</div>
</div>
