<script lang="ts">
	import type { SpeedRunQuestion } from '$lib/speed-run/types';

	interface Props {
		question: SpeedRunQuestion;
		gapMs: number;
		onAnswer: (guess: string) => void;
	}

	let { question, gapMs, onAnswer }: Props = $props();

	let audioElement: HTMLAudioElement;
	let isPlaying = $state(true);
	let hasAnswered = $state(false);

	// Auto-play audio when question appears
	$effect(() => {
		if (audioElement) {
			audioElement.play();
			isPlaying = true;
		}
	});

	function handleAudioEnded() {
		// For short audio, loop with gap
		if (audioElement.duration < 5) {
			setTimeout(() => {
				if (!hasAnswered && audioElement) {
					audioElement.currentTime = 0;
					audioElement.play();
				}
			}, gapMs);
		}
	}

	function handleOptionClick(optionId: string) {
		if (hasAnswered) return;

		hasAnswered = true;

		// Fade out audio quickly (50ms)
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

		onAnswer(optionId);
	}
</script>

<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
	<!-- Audio Player -->
	<div class="mb-6">
		<audio
			src={question.track.url}
			bind:this={audioElement}
			onended={handleAudioEnded}
			autoplay
			class="hidden"
		></audio>

		<div class="flex items-center justify-center rounded-xl bg-white/5 p-8">
			<div class="flex items-center gap-4">
				<div
					class="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500"
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

	<!-- Question text if present -->
	{#if question.question}
		<div class="mb-6">
			<h3 class="text-xl font-semibold text-white">{question.question}</h3>
		</div>
	{/if}

	<!-- Multiple Choice Options -->
	<div class="grid gap-3">
		{#each question.variantConfig.options as option, index}
			<button
				onclick={() => handleOptionClick(option.id)}
				disabled={hasAnswered}
				class="group relative w-full rounded-xl border-2 border-white/10 bg-white/5 p-4 text-left transition-all hover:border-amber-500/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<div class="flex items-center gap-4">
					<div
						class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg font-bold text-white group-hover:bg-amber-500/20 group-hover:text-amber-400"
					>
						{String.fromCharCode(65 + index)}
					</div>
					<span class="text-lg text-white">{option.text}</span>
				</div>
			</button>
		{/each}
	</div>
</div>
