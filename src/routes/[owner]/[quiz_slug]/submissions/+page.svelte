<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';

	import { getCorrectAnswerText } from '$lib/variant-client-utils';

	import type { PageData } from './$types';
	import type { AnswersPayload } from '$lib/variant-types';
	let { data }: { data: PageData } = $props();

	const getSubmitterLabel = (entry: PageData['answers'][number]) =>
		entry.userName || entry.userEmail || entry.displayName || 'Anonymous';

	function getAnswerDisplay(
		answers: AnswersPayload | null,
		soundbiteId: string,
		soundbite: PageData['soundbites'][number]
	): { guess: string; isCorrect: boolean; imageUrl?: string; correctImageUrl?: string } {
		const detail = answers?.[soundbiteId];
		if (!detail) return { guess: '(no answer)', isCorrect: false };

		let guessText = detail.guess;
		let imageUrl: string | undefined;
		let correctImageUrl: string | undefined;

		if (detail.variantType === 'multiple_choice' && detail.selectedOptionId) {
			const config = soundbite.variantConfig;
			if (config.type === 'multiple_choice') {
				const option = config.options.find((o) => o.id === detail.selectedOptionId);
				guessText = option?.text ?? detail.guess;
			}
		} else if (detail.variantType === 'multiple_response' && detail.selectedOptionIds) {
			const config = soundbite.variantConfig;
			if (config.type === 'multiple_response') {
				const texts = detail.selectedOptionIds
					.map((id) => config.options.find((o) => o.id === id)?.text)
					.filter(Boolean);
				guessText = texts.join(', ');
			}
		} else if (detail.variantType === 'image_choice' && detail.selectedOptionId) {
			const config = soundbite.variantConfig;
			if (config.type === 'image_choice') {
				const selectedOption = config.options.find((o) => o.id === detail.selectedOptionId);
				const correctOption = config.options.find((o) => o.isCorrect);
				guessText = selectedOption?.label ?? detail.guess;
				imageUrl = selectedOption?.imageUrl;
				correctImageUrl = correctOption?.imageUrl;
			}
		} else if (detail.variantType === 'sequence' && detail.selectedTrackIndex !== undefined) {
			const config = soundbite.variantConfig;
			if (config.type === 'sequence') {
				const selectedTrack = config.tracks[detail.selectedTrackIndex];
				guessText = selectedTrack?.name ?? `Track ${detail.selectedTrackIndex + 1}`;
			}
		} else if (detail.variantType === 'rank' && detail.userOrder) {
			const config = soundbite.variantConfig;
			if (config.type === 'rank') {
				guessText = detail.userOrder
					.map((idx) => config.items[idx]?.name ?? '')
					.filter((name) => name.length > 0)
					.join(', ');
			}
		}

		return {
			guess: guessText || '(no answer)',
			isCorrect: detail.isCorrect,
			imageUrl,
			correctImageUrl
		};
	}
</script>

<PageContainer>
	<header class="mb-6">
		<Heading level={1}>{data.quiz.title}</Heading>
	</header>

	{#if !data.hasSpeedRun}
		<section class="mb-10">
			{#if data.answers.length === 0}
				<p class="text-sm text-gray-500">No submissions yet.</p>
			{:else}
				<div class="flex flex-col gap-4">
					{#each data.answers as submission, index (submission.id)}
						<Card variant="flat" padding="sm" class="flex flex-col gap-3">
							<div class="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
								<div class="flex gap-1">
									<span class="font-medium">{getSubmitterLabel(submission)}</span> on
									<span>
										{submission.createdAt
											? new Date(submission.createdAt).toLocaleDateString()
											: ''}
									</span>
								</div>

								<div class="flex items-center gap-3">
									Score: {submission.totalCorrect}/{submission.totalQuestions} ({submission.score}%)
								</div>
							</div>
							<div class="flex flex-col gap-2">
								{#each data.soundbites as soundbite (soundbite.id)}
									{@const answerInfo = getAnswerDisplay(
										submission.answers as AnswersPayload,
										soundbite.id,
										soundbite
									)}
									<div
										class="rounded-sm border px-3 py-2 text-sm"
										class:border-green-200={answerInfo.isCorrect}
										class:bg-green-50={answerInfo.isCorrect}
										class:border-red-100={!answerInfo.isCorrect}
										class:bg-red-50={!answerInfo.isCorrect}
									>
										<div class="flex items-center justify-between">
											<span class="font-medium">{index + 1}. {soundbite.trackName}:</span>
											<span class="text-xs text-gray-500"
												>{soundbite.variantType.replace(/_/g, ' ')}</span
											>
										</div>
										<div class="mt-1">
											{#if soundbite.variantType === 'image_choice' && answerInfo.imageUrl}
												<div class="flex items-center gap-2">
													<span class="text-gray-500">Answer:</span>
													<img
														src={answerInfo.imageUrl}
														alt={answerInfo.guess}
														class="h-[70px] w-[70px] rounded border object-cover"
													/>
													{#if !answerInfo.isCorrect && answerInfo.correctImageUrl}
														<span class="ml-2 text-gray-500">Correct:</span>
														<img
															src={answerInfo.correctImageUrl}
															alt="Correct"
															class="h-[70px] w-[70px] rounded border object-cover"
														/>
													{/if}
												</div>
											{:else}
												<span>Answer: <span class="font-medium">{answerInfo.guess}</span></span>
												{#if !answerInfo.isCorrect}
													<span class="ml-3">
														({soundbite.variantType === 'simple_guess'
															? 'Acceptable answers'
															: 'Correct'}:
														<span class="font-medium"
															>{getCorrectAnswerText(soundbite.variantConfig)}</span
														>)
													</span>
												{/if}
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</Card>
					{/each}
				</div>
			{/if}
		</section>
	{:else}
		<section class="flex flex-col gap-4">
			{#if data.speedRunResults.length === 0}
				<p class="text-sm text-gray-500">No speed run submissions yet.</p>
			{:else}
				<div class="flex flex-col gap-4">
					{#each data.speedRunResults as result (result.id)}
						<Card variant="flat" padding="sm" class="flex flex-col gap-3">
							<div class="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
								<div class="flex gap-1">
									<span class="font-medium"
										>{result.displayName ||
											result.userName ||
											result.userEmail ||
											'Anonymous'}</span
									>
									on
									<span>
										{result.createdAt ? new Date(result.createdAt).toLocaleDateString() : ''}
									</span>
								</div>
								<div class="flex items-center gap-3">
									<span class="font-medium">{result.correctCount}/{result.totalQuestions}</span>
									<span class="text-xs text-gray-500">
										({Math.round((result.correctCount / result.totalQuestions) * 100)}%)
									</span>
									<span class="text-xs text-gray-500">
										{Math.floor(result.totalTimeMs / 1000)}s
									</span>
									<span class="text-xs font-medium text-amber-600">
										Score: {result.score?.toLocaleString()}
									</span>
								</div>
							</div>
							{#if result.streakMax > 0}
								<div class="text-xs text-orange-500">
									🔥 Best Streak: {result.streakMax}
								</div>
							{/if}
						</Card>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</PageContainer>
