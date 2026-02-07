<script lang="ts">
	import { STREAK_MILESTONES } from '$lib/speed-run/types';
	interface Props {
		isCorrect: boolean;
		guess: string;
		correctAnswer: string;
		revealDelayMs: number;
		streak: number;
		isLastQuestion: boolean;
	}

	let {
		isCorrect,
		guess: _guess,
		correctAnswer,
		revealDelayMs: _revealDelayMs,
		streak,
		isLastQuestion
	}: Props = $props();

	let countdown = $state(3);

	$effect(() => {
		const interval = setInterval(() => {
			if (countdown > 1) {
				countdown--;
			}
		}, 1000);

		return () => clearInterval(interval);
	});

	// Check for streak milestone
	const milestone = $derived(STREAK_MILESTONES.find((m) => m.count === streak));
</script>

<div class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
	<!-- Result Icon -->
	<div class="mb-4">
		{#if isCorrect}
			<div class="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20">
				<svg class="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="3"
						d="M5 13l4 4L19 7"
					/>
				</svg>
			</div>
		{:else}
			<div class="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-500/20">
				<svg class="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="3"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</div>
		{/if}
	</div>

	<!-- Result Text -->
	<h2 class="mb-2 text-3xl font-bold text-white">
		{#if isCorrect}
			<span class="text-green-400">Correct!</span>
		{:else}
			<span class="text-red-400">Incorrect</span>
		{/if}
	</h2>

	<!-- Answer display -->
	<p class="mb-4 text-lg text-white/80">
		{#if isCorrect}
			Great job! That's the right answer.
		{:else}
			The correct answer was: <span class="font-semibold text-white">{correctAnswer}</span>
			<!-- Debug: correctAnswer="{correctAnswer}" -->
		{/if}
	</p>

	<!-- Streak milestone -->
	{#if milestone && isCorrect}
		<div
			class="mb-6 inline-block animate-bounce rounded-full bg-linear-to-r from-orange-500 to-red-500 px-6 py-3 text-lg font-bold text-white"
		>
			{milestone.emoji}
			{milestone.message}
		</div>
	{/if}

	<!-- Next question countdown -->
	<div class="mt-6">
		<div class="text-6xl font-black text-white/20">{countdown}</div>
		<p class="mt-2 text-sm text-white/60">
			{#if isLastQuestion}
				Finishing...
			{:else}
				Next question in...
			{/if}
		</p>
	</div>
</div>

<style>
	@keyframes bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}

	.animate-bounce {
		animation: bounce 0.5s ease-in-out;
	}
</style>
