<script lang="ts">
	import { scale, fly } from 'svelte/transition';
	import { elasticOut } from 'svelte/easing';

	import { STREAK_MILESTONES } from '$lib/speed-run/types';
	import type { SpeedRunQuestion } from '$lib/speed-run/types';

	interface Props {
		isCorrect: boolean;
		guess: string;
		correctAnswer: string;
		revealDelayMs: number;
		streak: number;
		isLastQuestion: boolean;
		question?: SpeedRunQuestion;
	}

	let {
		isCorrect,
		guess,
		correctAnswer,
		revealDelayMs: _revealDelayMs,
		streak,
		isLastQuestion,
		question
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

{#if question?.variantType === 'image_choice'}
	<!-- Image Choice Reveal with 2-second animation -->
	<div
		class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
		in:scale={{ duration: 300, easing: elasticOut, start: 0.8 }}
	>
		<div
			class="mb-4 text-center text-2xl font-bold {isCorrect ? 'text-green-400' : 'text-red-400'}"
		>
			{#if isCorrect}
				✓ Correct!
			{:else}
				✗ Incorrect
			{/if}
		</div>

		<div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
			{#each question.variantConfig.options as option (option.id)}
				{@const isSelected = option.id === guess}
				{@const isCorrectOption = option.label === correctAnswer}

				<div
					class="relative aspect-square overflow-hidden rounded-xl border-4 {isSelected
						? isCorrect
							? 'animate-celebrate border-green-500'
							: 'animate-shake border-red-500'
						: isCorrectOption
							? 'animate-pulse-glow border-green-500'
							: 'border-white/10 opacity-50'}"
				>
					<img src={option.imageUrl} alt={option.label} class="h-full w-full object-cover" />

					{#if isSelected && isCorrect}
						<div class="absolute inset-0 flex items-center justify-center bg-green-500/30">
							<svg class="h-16 w-16 text-green-400" fill="currentColor" viewBox="0 0 24 24">
								<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
							</svg>
						</div>
					{/if}

					{#if isSelected && !isCorrect}
						<div class="absolute inset-0 flex items-center justify-center bg-red-500/30">
							<svg class="h-16 w-16 text-red-400" fill="currentColor" viewBox="0 0 24 24">
								<path
									d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
								/>
							</svg>
						</div>
					{/if}

					<span class="absolute right-0 bottom-0 left-0 bg-black/80 p-2 text-sm text-white">
						{option.label}
					</span>
				</div>
			{/each}
		</div>

		<!-- 2-second progress bar -->
		<div class="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/10">
			<div class="animate-progress h-full bg-amber-500"></div>
		</div>
	</div>
{:else}
	<!-- Standard Text Reveal -->
	<div
		class="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm"
		in:fly={{ y: 20, duration: 300 }}
	>
		<!-- Result Icon -->
		<div class="mb-4" in:scale={{ delay: 100, duration: 400, easing: elasticOut, start: 0.5 }}>
			{#if isCorrect}
				<div
					class="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20"
				>
					<svg
						class="h-12 w-12 text-green-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
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
			{/if}
		</p>

		<!-- Streak milestone -->
		{#if milestone && isCorrect}
			<div
				class="mb-6 inline-block animate-bounce rounded-full bg-linear-to-r from-orange-500 to-red-500 px-6 py-3 text-lg font-bold text-white"
				in:scale={{ delay: 200, duration: 500, easing: elasticOut, start: 0.3 }}
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
{/if}

<style>
	@keyframes celebrate {
		0%,
		100% {
			transform: scale(1);
		}
		25% {
			transform: scale(1.1) rotate(-5deg);
		}
		50% {
			transform: scale(1.15) rotate(5deg);
		}
		75% {
			transform: scale(1.1) rotate(0);
		}
	}

	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		20% {
			transform: translateX(-10px);
		}
		40% {
			transform: translateX(10px);
		}
		60% {
			transform: translateX(-10px);
		}
		80% {
			transform: translateX(10px);
		}
	}

	@keyframes pulse-glow {
		0%,
		100% {
			box-shadow: 0 0 20px rgba(34, 197, 94, 0.6);
		}
		50% {
			box-shadow: 0 0 40px rgba(34, 197, 94, 0.9);
		}
	}

	@keyframes progress {
		from {
			width: 100%;
		}
		to {
			width: 0%;
		}
	}

	@keyframes bounce {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-10px);
		}
	}

	.animate-celebrate {
		animation: celebrate 2s ease-in-out;
	}

	.animate-shake {
		animation: shake 0.5s ease-in-out;
		animation-iteration-count: 2;
	}

	.animate-pulse-glow {
		animation: pulse-glow 1s ease-in-out infinite;
	}

	.animate-progress {
		animation: progress 2s linear forwards;
	}

	.animate-bounce {
		animation: bounce 0.5s ease-in-out;
	}
</style>
