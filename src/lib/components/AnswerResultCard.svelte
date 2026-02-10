<script lang="ts">
	import {
		getCorrectAnswerText,
		calculateKendallTauPercentage,
		calculateMultipleMatchScore
	} from '$lib/variant-display';

	import type {
		VariantConfig,
		AnswerDetail,
		MultipleChoiceConfig,
		MultipleResponseConfig,
		ImageChoiceConfig,
		SequenceConfig,
		RankConfig,
		MultipleMatchConfig
	} from '$lib/variant-types';

	type Props = {
		answerDetail: AnswerDetail;
		variantConfig: VariantConfig;
	};

	let { answerDetail, variantConfig }: Props = $props();

	function getUserAnswerText(): string {
		if (answerDetail.variantType === 'simple_guess') {
			return answerDetail.guess;
		} else if (answerDetail.variantType === 'multiple_choice' && answerDetail.selectedOptionId) {
			const config = variantConfig as MultipleChoiceConfig;
			const selectedOption = config.options.find((opt) => opt.id === answerDetail.selectedOptionId);
			return selectedOption?.text ?? answerDetail.guess;
		} else if (
			answerDetail.variantType === 'multiple_response' &&
			answerDetail.selectedOptionIds &&
			answerDetail.selectedOptionIds.length > 0
		) {
			const config = variantConfig as MultipleResponseConfig;
			const selectedTexts = answerDetail.selectedOptionIds
				.map((id) => config.options.find((opt) => opt.id === id)?.text)
				.filter(Boolean);
			return selectedTexts.join(', ') || answerDetail.guess;
		} else if (
			answerDetail.variantType === 'sequence' &&
			answerDetail.selectedTrackIndex !== undefined
		) {
			const config = variantConfig as SequenceConfig;
			const selectedTrack = config.tracks[answerDetail.selectedTrackIndex];
			return selectedTrack?.name ?? `Track ${answerDetail.selectedTrackIndex + 1}`;
		} else if (answerDetail.variantType === 'rank' && answerDetail.userOrder) {
			const config = variantConfig as RankConfig;
			return answerDetail.userOrder
				.map((idx) => config.items[idx]?.name ?? '')
				.filter((name) => name.length > 0)
				.join(' → ');
		} else if (answerDetail.variantType === 'multiple_match' && answerDetail.userOrder) {
			const config = variantConfig as MultipleMatchConfig;
			return answerDetail.userOrder
				.map((idx) => config.items[idx]?.name ?? '')
				.filter((name) => name.length > 0)
				.join(' → ');
		}
		return answerDetail.guess;
	}

	let correctAnswerText = $derived(getCorrectAnswerText(variantConfig));
	let userAnswerText = $derived(getUserAnswerText());
	let kendallTauScore = $derived(
		variantConfig.type === 'rank' && answerDetail.userOrder
			? calculateKendallTauPercentage(answerDetail.userOrder, variantConfig.correctOrder)
			: 0
	);
	let multipleMatchScore = $derived(
		variantConfig.type === 'multiple_match' && answerDetail.userOrder
			? calculateMultipleMatchScore(answerDetail.userOrder)
			: 0
	);
</script>

<div
	class="rounded-md border p-3"
	class:border-accent-emerald-border={answerDetail.isCorrect}
	class:bg-accent-emerald-bg={answerDetail.isCorrect}
	class:border-accent-red-border={!answerDetail.isCorrect}
	class:bg-accent-red-bg={!answerDetail.isCorrect}
>
	<div class="flex items-start justify-end">
		<span
			class="text-sm font-semibold"
			class:text-accent-emerald-text={answerDetail.isCorrect}
			class:text-accent-red-text={!answerDetail.isCorrect}
		>
			{answerDetail.isCorrect ? 'Correct' : 'Incorrect'}
		</span>
	</div>

	{#if answerDetail.variantType === 'rank' && variantConfig.type === 'rank'}
		<!-- Rank variant: Show color-coded list with Kendall Tau score -->
		<div class="mt-3 flex flex-col gap-1">
			<p class="mb-1 text-xs text-text-muted">
				Your ranking vs correct ranking (Kendall Tau: {kendallTauScore}%):
			</p>
			{#if answerDetail.userOrder && answerDetail.userOrder.length > 0}
				{#each variantConfig.correctOrder as correctItemIdx, position (position)}
					{@const userItemIdx = answerDetail.userOrder[position]}
					{@const isCorrect = correctItemIdx === userItemIdx}
					<div
						class="flex items-center gap-2 rounded px-2 py-1 text-sm"
						class:bg-accent-emerald-bg={isCorrect}
						class:text-accent-emerald-text={isCorrect}
						class:bg-accent-red-bg={!isCorrect}
						class:text-accent-red-text={!isCorrect}
					>
						<span class="w-6 font-mono font-bold">{position + 1}.</span>
						<span class="flex-1">{variantConfig.items[userItemIdx]?.name ?? 'Unknown'}</span>
						{#if !isCorrect}
							<span class="text-xs opacity-75"
								>(should be: {variantConfig.items[correctItemIdx]?.name ?? 'Unknown'})</span
							>
						{:else}
							<span class="text-xs text-accent-emerald-text opacity-75"
								>(correct: {variantConfig.items[correctItemIdx]?.name ?? 'Unknown'})</span
							>
						{/if}
					</div>
				{/each}
			{:else}
				<p class="text-sm text-accent-red-text">No answer submitted</p>
			{/if}
		</div>
	{:else if answerDetail.variantType === 'multiple_match' && variantConfig.type === 'multiple_match'}
		<!-- Multiple Match variant: Simple position-based scoring -->
		<div class="mt-3 flex flex-col gap-1">
			<p class="mb-1 text-xs text-text-muted">
				Score: {multipleMatchScore}%
			</p>
			{#if answerDetail.userOrder && answerDetail.userOrder.length > 0}
				{#each answerDetail.userOrder as userItemIdx, position (position)}
					{@const isAtCorrectPosition = userItemIdx === position}
					<div class="flex items-center gap-2 rounded px-2 py-1 text-sm">
						<span class="w-6 font-mono font-bold">{position + 1}.</span>
						<span class="flex-1">{variantConfig.items[userItemIdx]?.answerLabel ?? 'Unknown'}</span>
						{#if !isAtCorrectPosition}
							<span class="text-xs text-accent-red-text opacity-75"
								>(should be: {variantConfig.items[position]?.answerLabel ?? 'Unknown'})</span
							>
						{/if}
					</div>
				{/each}
			{:else}
				<p class="text-sm text-accent-red-text">No answer submitted</p>
			{/if}
		</div>
	{:else if answerDetail.variantType === 'image_choice' && variantConfig.type === 'image_choice'}
		<!-- Image Choice variant: Show both images side by side -->
		{@const icConfig = variantConfig as ImageChoiceConfig}
		{@const selectedOption = answerDetail.selectedOptionId
			? icConfig.options.find((opt) => opt.id === answerDetail.selectedOptionId)
			: null}
		{@const correctOption = icConfig.options.find((opt) => opt.isCorrect)}
		<div class="mt-3 grid grid-cols-2 gap-4">
			<!-- User's Selection -->
			<div class="flex flex-col gap-2">
				<p class="text-xs text-text-muted">You selected:</p>
				{#if selectedOption}
					<div
						class="relative aspect-square w-full overflow-hidden rounded-lg border-2"
						class:border-border={answerDetail.isCorrect}
						class:border-accent-red-border={!answerDetail.isCorrect}
					>
						<img
							src={selectedOption.imageUrl}
							alt={selectedOption.label}
							class="h-full w-full object-cover"
						/>
					</div>
					<p class="text-center text-xs text-text-secondary">{selectedOption.label}</p>
				{:else}
					<div
						class="relative aspect-square w-full overflow-hidden rounded-lg border-2 border-border bg-surface-muted"
					>
						<div class="flex h-full w-full items-center justify-center text-text-muted">
							<span class="text-sm">No selection</span>
						</div>
					</div>
				{/if}
			</div>

			<!-- Correct Answer -->
			<div class="flex flex-col gap-2">
				<p class="text-xs text-text-muted">Correct answer:</p>
				{#if correctOption}
					<div
						class="border-accent-emerald-border relative aspect-square w-full overflow-hidden rounded-lg border-2"
					>
						<img
							src={correctOption.imageUrl}
							alt={correctOption.label}
							class="h-full w-full object-cover"
						/>
						<div class="absolute inset-0 flex items-start justify-end p-2">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-accent-emerald-bg text-text-inverse shadow-md"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
									<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
								</svg>
							</div>
						</div>
					</div>
					<p class="text-center text-xs text-text-secondary">{correctOption.label}</p>
				{:else}
					<div
						class="relative aspect-square w-full overflow-hidden rounded-lg border-2 border-border bg-surface-muted"
					>
						<div class="flex h-full w-full items-center justify-center text-text-muted">
							<span class="text-sm">Unknown</span>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- Other variants: Show simple text -->
		<div class="mt-2 flex flex-col gap-1 text-sm">
			<p>
				<span class="text-text-muted">Your answer:</span>
				<span class="ml-1" class:text-accent-red-text={!answerDetail.isCorrect}
					>{userAnswerText || '(no answer)'}</span
				>
			</p>
			{#if !answerDetail.isCorrect}
				{#if answerDetail.variantType === 'simple_guess'}
					<p>
						<span class="text-text-muted">Acceptable answers:</span>
						<span class="ml-1 text-accent-emerald-text">{correctAnswerText}</span>
					</p>
				{:else}
					<p>
						<span class="text-text-muted">Correct answer:</span>
						<span class="ml-1 text-accent-emerald-text">{correctAnswerText}</span>
					</p>
				{/if}
			{/if}
		</div>
	{/if}
</div>
