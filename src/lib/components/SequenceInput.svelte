<script lang="ts">
	import type { AnswerDetail } from '$lib/variant-types';
	interface Props {
		soundbiteId: string;
		result?: AnswerDetail | null;
		answer?: string;
	}

	let { soundbiteId, result = null, answer = '' }: Props = $props();

	const hasResult = $derived(result !== null);
	const isCorrect = $derived(result?.isCorrect ?? false);

	// Use the answer value for form submission, parsing it as an integer
	const submittedTrackIndex = $derived(answer ? parseInt(answer, 10) : -1);
</script>

<div class="flex flex-col items-center gap-4">
	{#if hasResult}
		<!-- Result Display -->
		<div
			class="rounded-lg p-4 text-center {isCorrect ? 'bg-accent-emerald-bg' : 'bg-accent-red-bg'}"
		>
			{#if isCorrect}
				<div class="mb-2 text-2xl">✓</div>
				<div class="font-medium text-accent-emerald-text">Correct!</div>
				<div class="text-sm text-accent-emerald-text">
					You pressed during Track {submittedTrackIndex + 1}
				</div>
			{:else}
				<div class="mb-2 text-2xl">✗</div>
				<div class="font-medium text-accent-red-text">Incorrect</div>
				<div class="text-sm text-accent-red-text">
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
