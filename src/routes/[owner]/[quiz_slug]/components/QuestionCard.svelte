<script lang="ts">
	import type { SpeedRunQuestion } from '$lib/speed-run/types';

	interface Props {
		question: SpeedRunQuestion;
		onAnswer: (guess: string, isCorrect?: boolean, correctAnswer?: string) => void;
		onValidateGuess?: (
			guess: string
		) => Promise<{ isCorrect: boolean; correctAnswer: string } | null>;
		onAudioFadeOut?: () => void;
	}

	let { question, onAnswer, onValidateGuess, onAudioFadeOut }: Props = $props();

	let hasAnswered = $state(false);
	let guessInput = $state('');
	let showError = $state(false);
	let isCelebrating = $state(false);
	let isShaking = $state(false);

	function handleOptionClick(optionId: string) {
		if (hasAnswered) return;

		hasAnswered = true;
		onAudioFadeOut?.();
		onAnswer(optionId);
	}

	function triggerError() {
		showError = true;
		isShaking = true;
		guessInput = '';
		setTimeout(() => {
			showError = false;
			isShaking = false;
		}, 1500);
	}

	function triggerCelebration() {
		isCelebrating = true;
		setTimeout(() => {
			isCelebrating = false;
		}, 500);
	}

	async function handleSimpleGuessSubmit() {
		if (hasAnswered || !guessInput.trim()) return;

		const guess = guessInput.trim();

		// Validate via parent's callback
		if (!onValidateGuess) return;

		const result = await onValidateGuess(guess);
		if (!result) return; // API error - don't block gameplay

		if (result.isCorrect) {
			hasAnswered = true;
			triggerCelebration();
			onAudioFadeOut?.();
			setTimeout(() => {
				onAnswer(guess, true, result.correctAnswer);
			}, 500);
		} else {
			triggerError();
		}
	}

	function handleEnterKey(event: KeyboardEvent) {
		if (event.key === 'Enter' && question.variantType === 'simple_guess') {
			event.preventDefault();
			handleSimpleGuessSubmit();
		}
	}
</script>

<div
	class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
	class:shake={isShaking}
>
	<!-- Question text if present -->
	{#if question.question}
		<div class="mb-6">
			<h3 class="text-xl font-semibold text-white">{question.question}</h3>
		</div>
	{/if}

	<!-- Multiple Choice Options -->
	{#if question.variantType === 'multiple_choice'}
		<div class="grid gap-3">
			{#each question.variantConfig.options as option, index (option.id)}
				<button
					onclick={() => handleOptionClick(option.id)}
					disabled={hasAnswered}
					class="group relative w-full rounded-xl border-2 border-white/10 bg-white/5 p-4 text-left transition-all hover:border-amber-500/50 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<div class="flex items-center gap-4">
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg font-bold text-white group-hover:bg-amber-500/20 group-hover:text-amber-400"
						>
							{String.fromCharCode(65 + index)}
						</div>
						<span class="text-lg text-white">{option.text}</span>
					</div>
				</button>
			{/each}
		</div>

		<!-- Simple Guess Input -->
	{:else if question.variantType === 'simple_guess'}
		<div class="relative">
			<!-- Toast Error Notification -->
			{#if showError}
				<div
					class="absolute -top-16 left-1/2 z-10 -translate-x-1/2 transform rounded-lg border border-red-500/30 bg-gradient-to-r from-red-500/90 to-red-600/90 px-6 py-3 text-white shadow-lg backdrop-blur-sm"
				>
					<div class="flex items-center gap-2">
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
						<span class="font-semibold">Incorrect! Try again</span>
					</div>
				</div>
			{/if}

			<!-- Input Container with Celebration -->
			<div class="relative" class:celebration={isCelebrating}>
				<input
					type="text"
					bind:value={guessInput}
					onkeydown={handleEnterKey}
					disabled={hasAnswered}
					placeholder="Type your answer and press Enter..."
					class="w-full rounded-xl border-2 border-white/10 bg-white/5 p-4 text-lg text-white placeholder-white/40 transition-all focus:border-amber-500/50 focus:bg-white/10 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				/>

				<!-- Celebration Overlay -->
				{#if isCelebrating}
					<div
						class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-green-500/20"
					>
						<div class="scale-animation">
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
					</div>
				{/if}
			</div>

			<div class="mt-3 text-center text-sm text-white/40">Press Enter to submit your guess</div>
		</div>

		<!-- Image Choice Grid -->
	{:else}
		<div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
			{#each question.variantConfig.options as option (option.id)}
				<button
					onclick={() => handleOptionClick(option.id)}
					disabled={hasAnswered}
					class="group relative aspect-square overflow-hidden rounded-xl border-2 border-white/10 bg-white/5 transition-all duration-200 hover:scale-105 hover:border-amber-500/50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<img src={option.imageUrl} alt={option.label} class="h-full w-full object-cover" />
					<span class="absolute right-0 bottom-0 left-0 bg-black/60 p-2 text-sm text-white">
						{option.label}
					</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	@keyframes shake {
		0%,
		100% {
			transform: translateX(0);
		}
		10%,
		30%,
		50%,
		70%,
		90% {
			transform: translateX(-5px);
		}
		20%,
		40%,
		60%,
		80% {
			transform: translateX(5px);
		}
	}

	.shake {
		animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
	}

	@keyframes scaleUp {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		50% {
			transform: scale(1.2);
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	.scale-animation {
		animation: scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
	}

	.celebration input {
		border-color: rgba(34, 197, 94, 0.5);
		box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
	}
</style>
