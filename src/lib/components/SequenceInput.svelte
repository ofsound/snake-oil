<script lang="ts">
	import type { AnswerDetail } from '$lib/variant-types';

	interface Props {
		soundbiteId: string;
		result?: AnswerDetail | null;
		onBuzzer: () => void;
		disabled?: boolean;
	}

	let { soundbiteId, result = null, onBuzzer, disabled = false }: Props = $props();

	const hasResult = $derived(result !== null);
	const isCorrect = $derived(result?.isCorrect ?? false);
	const selectedTrackIndex = $derived(result?.selectedTrackIndex ?? -1);
</script>

<div class="flex flex-col items-center gap-4">
	{#if !hasResult}
		<!-- Buzzer Button -->
		<button
			type="button"
			onclick={onBuzzer}
			{disabled}
			class="flex h-24 w-24 items-center justify-center rounded-full bg-red-600 text-xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-red-700 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed disabled:bg-gray-400"
		>
			BUZZ
		</button>
		<p class="text-sm text-gray-500">Press when you hear the target sound</p>
	{:else}
		<!-- Result Display -->
		<div class="rounded-lg p-4 text-center {isCorrect ? 'bg-emerald-50' : 'bg-red-50'}">
			{#if isCorrect}
				<div class="mb-2 text-2xl">✓</div>
				<div class="font-medium text-emerald-700">Correct!</div>
				<div class="text-sm text-emerald-600">
					You pressed during Track {selectedTrackIndex + 1}
				</div>
			{:else}
				<div class="mb-2 text-2xl">✗</div>
				<div class="font-medium text-red-700">Incorrect</div>
				<div class="text-sm text-red-600">
					You pressed during Track {selectedTrackIndex + 1}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Hidden input for form submission -->
	<input type="hidden" name={`answer-${soundbiteId}`} value={selectedTrackIndex} />
</div>
