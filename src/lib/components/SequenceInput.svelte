<script lang="ts">
	import type { AnswerDetail } from '$lib/variant-types';
	interface Props {
		soundbiteId: string;
		result?: AnswerDetail | null;
		answer?: string;
		onBuzzer: () => void;
		disabled?: boolean;
	}

	let { soundbiteId, result = null, answer = '', onBuzzer, disabled = false }: Props = $props();

	const hasResult = $derived(result !== null);
	const isCorrect = $derived(result?.isCorrect ?? false);
	const selectedTrackIndex = $derived(result?.selectedTrackIndex ?? -1);

	// Use the answer value for form submission, parsing it as an integer
	const submittedTrackIndex = $derived(answer ? parseInt(answer, 10) : -1);
</script>

<div class="flex flex-col items-center gap-4">
	{#if hasResult}
		<!-- Result Display -->
		<div class="rounded-lg p-4 text-center {isCorrect ? 'bg-emerald-50' : 'bg-red-50'}">
			{#if isCorrect}
				<div class="mb-2 text-2xl">✓</div>
				<div class="font-medium text-emerald-700">Correct!</div>
				<div class="text-sm text-emerald-600">
					You pressed during Track {submittedTrackIndex + 1}
				</div>
			{:else}
				<div class="mb-2 text-2xl">✗</div>
				<div class="font-medium text-red-700">Incorrect</div>
				<div class="text-sm text-red-600">
					You pressed during Track {submittedTrackIndex + 1}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Hidden input for form submission - only render if there's an actual answer -->
	{#if submittedTrackIndex >= 0}
		<input type="hidden" name={`answer-${soundbiteId}`} value={submittedTrackIndex} />
	{/if}
</div>
