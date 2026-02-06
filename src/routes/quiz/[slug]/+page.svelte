<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import SimpleGuessInput from '$lib/components/SimpleGuessInput.svelte';
	import MultipleChoiceInput from '$lib/components/MultipleChoiceInput.svelte';
	import AnswerResultCard from '$lib/components/AnswerResultCard.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import type { ActionData, PageData } from './$types';
	import MultipleResponseInput from '$lib/components/MultipleResponseInput.svelte';
	import ImageChoiceInput from '$lib/components/ImageChoiceInput.svelte';
	import SequenceAudioPlayer from '$lib/components/SequenceAudioPlayer.svelte';
	import SequenceInput from '$lib/components/SequenceInput.svelte';
	import RankAudioPlayer from '$lib/components/RankAudioPlayer.svelte';
	import type {
		AnswersPayload,
		MultipleChoiceConfig,
		MultipleResponseConfig,
		ImageChoiceConfig,
		SequenceConfig,
		RankConfig
	} from '$lib/variant-types';
	import Heading from '$lib/components/Heading.svelte';
	import QuizAudioPlayer from '$lib/components/audio/QuizAudioPlayer.svelte';

	let { data, form }: { data: PageData; form: ActionData | undefined } = $props();

	let submitting = $state(false);
	let displayName = $state('');
	let errorMessage = $derived(form?.message ?? null);
	let hasResults = $derived(form?.success && form?.results);

	// Track user answers for each soundbite
	// For simple_guess and multiple_choice: string
	// For multiple_response: comma-separated string (parsed on submit)
	// For sequence: track index as string
	let userAnswers = $state<Record<string, string>>({});
	// Track multiple response selections separately (id -> array of option ids)
	let multipleResponseSelections = $state<Record<string, string[]>>({});
	// Track sequence buzzer state (id -> has buzzed)
	let sequenceBuzzed = $state<Record<string, boolean>>({});
	// Track rank order state (id -> array of item indices)
	let rankOrders = $state<Record<string, number[]>>({});

	let signedInLabel = $derived(data.user?.name || data.user?.email || 'Signed-in user');
	let isOwner = $derived(data.user?.id === data.quiz.owner.id);

	function updateAnswer(soundbiteId: string, value: string) {
		userAnswers = { ...userAnswers, [soundbiteId]: value };
	}

	function updateMultipleResponseSelections(soundbiteId: string, optionIds: string[]) {
		multipleResponseSelections = { ...multipleResponseSelections, [soundbiteId]: optionIds };
		// Also update userAnswers with comma-separated values for form submission
		userAnswers = { ...userAnswers, [soundbiteId]: optionIds.join(',') };
	}

	function handleSequenceBuzz(soundbiteId: string, trackIndex: number) {
		sequenceBuzzed = { ...sequenceBuzzed, [soundbiteId]: true };
		// Store track index as string for form submission
		userAnswers = { ...userAnswers, [soundbiteId]: String(trackIndex) };
	}

	function handleRankOrderChange(soundbiteId: string, order: number[]) {
		rankOrders = { ...rankOrders, [soundbiteId]: order };
		// Store order as JSON string for form submission
		userAnswers = { ...userAnswers, [soundbiteId]: JSON.stringify(order) };
	}

	// Get results from form action
	let results = $derived(
		form?.results as
			| {
					answers: AnswersPayload;
					score: number;
					totalCorrect: number;
					totalQuestions: number;
					correctAnswers: Record<string, string>;
			  }
			| undefined
	);
</script>

<header class="pb-6">
	<Heading level={1} class="mb-1.5">{data.quiz.title}</Heading>
	<div class="text-sm">
		{data.quiz.createdAt ? new Date(data.quiz.createdAt).toLocaleDateString() : ''}
		by
		<a href="/users/{data.quiz.owner.slug}" class="font-semibold text-indigo-700 hover:underline">
			{data.quiz.owner.name || data.quiz.owner.slug}
		</a>
		{#if isOwner}
			<span class="text-sm text-gray-500">
				(<a href="/quiz/edit/{data.quiz.slug}" class="hover:underline">manage quiz</a>)
			</span>
		{/if}
	</div>

	<div class="mt-10">
		{data.quiz.description}
	</div>

	{#if data.quiz.hasSpeedRun}
		<div class="mt-6">
			<a
				href="/speed-run/{data.quiz.slug}"
				class="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-105 hover:shadow-amber-500/40"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
				Play Speed Run Mode
			</a>
			<p class="mt-2 text-sm text-gray-600">
				⚡ Race against the clock! Answer questions as fast as you can.
			</p>
		</div>
	{/if}
</header>

{#if hasResults && results}
	<!-- Results Display -->
	<div class="flex flex-col gap-6">
		<Card variant="elevated" padding="md">
			<div class="text-center">
				<Heading level={2} class="text-emerald-700">
					Your Score: {results.totalCorrect}/{results.totalQuestions}
				</Heading>
				<p class="mt-1 text-lg text-gray-600">{results.score}% correct</p>
			</div>
		</Card>

		<section class="flex flex-col gap-4">
			<Heading level={3}>Your Answers</Heading>
			{#each data.soundbites as soundbite, index (soundbite.id)}
				{@const answerDetail = results.answers[soundbite.id]}
				{@const correctAnswer = results.correctAnswers[soundbite.id]}
				{#if answerDetail}
					{@const rankConfig =
						soundbite.variantType === 'rank' && correctAnswer
							? (JSON.parse(correctAnswer) as RankConfig)
							: null}
					{@const imageChoiceConfig =
						soundbite.variantType === 'image_choice' && correctAnswer
							? (JSON.parse(correctAnswer) as ImageChoiceConfig)
							: null}
					{@const multipleResponseConfig =
						soundbite.variantType === 'multiple_response' && correctAnswer
							? (JSON.parse(correctAnswer) as MultipleResponseConfig)
							: null}
					{@const multipleChoiceConfig =
						soundbite.variantType === 'multiple_choice' && correctAnswer
							? (JSON.parse(correctAnswer) as MultipleChoiceConfig)
							: null}
					<div class="rounded-sm bg-neutral-50 p-4">
						<div class="mb-3">
							<div class="mb-2 text-base font-medium text-gray-700">{index + 1}.</div>
							{#if soundbite.variantType !== 'sequence' && soundbite.variantType !== 'rank'}
								<QuizAudioPlayer soundbiteId={soundbite.id} url={soundbite.trackUrl} />
							{/if}
							{#if soundbite.question}
								<p class="mt-2 text-sm text-gray-600 italic">{soundbite.question}</p>
							{/if}
						</div>
						<AnswerResultCard
							{answerDetail}
							variantConfig={rankConfig ??
								imageChoiceConfig ??
								multipleResponseConfig ??
								multipleChoiceConfig ?? {
									...soundbite.variantConfig,
									...(soundbite.variantConfig.type === 'simple_guess' ? { correctAnswer } : {})
								}}
							{index}
						/>
					</div>
				{/if}
			{/each}
		</section>

		<div class="flex justify-center">
			<Button
				href={`/quiz/${data.quiz.slug}`}
				variant="outline"
				size="sm"
				onclick={() => {
					userAnswers = {};
				}}
			>
				Take Quiz Again
			</Button>
		</div>
	</div>
{:else}
	<!-- Quiz Form -->
	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
	>
		<section class="mt-6 flex flex-col gap-8">
			{#each data.soundbites as soundbite, index (soundbite.id)}
				<div class="flex">
					<div class="mt-2 w-8 text-sm font-medium text-neutral-500">{index + 1}.</div>
					<Card variant="neutral" padding="md" class="flex flex-1 flex-col gap-5 ">
						<input type="hidden" name="soundbiteId" value={soundbite.id} />
						<div class="flex flex-col gap-2">
							<div
								class="mb-2 hidden w-max rounded-sm bg-neutral-600 px-2 py-1 text-sm font-medium text-white"
							>
								{index + 1}
							</div>
							{#if soundbite.variantType !== 'sequence' && soundbite.variantType !== 'rank'}
								<QuizAudioPlayer soundbiteId={soundbite.id} url={soundbite.trackUrl} />
							{/if}
							{#if soundbite.question}
								<p class="mt-5 font-medium">{soundbite.question}</p>
							{/if}
						</div>

						{#if soundbite.variantType === 'simple_guess'}
							<SimpleGuessInput
								soundbiteId={soundbite.id}
								value={userAnswers[soundbite.id] ?? ''}
								oninput={(value) => updateAnswer(soundbite.id, value)}
							/>
						{:else if soundbite.variantType === 'multiple_choice'}
							{@const config = soundbite.variantConfig as MultipleChoiceConfig}
							<MultipleChoiceInput
								soundbiteId={soundbite.id}
								options={config.options}
								selectedOptionId={userAnswers[soundbite.id] ?? ''}
								onselect={(optionId) => updateAnswer(soundbite.id, optionId)}
							/>
						{:else if soundbite.variantType === 'multiple_response'}
							{@const config = soundbite.variantConfig as MultipleResponseConfig}
							<MultipleResponseInput
								soundbiteId={soundbite.id}
								options={config.options}
								selectedOptionIds={multipleResponseSelections[soundbite.id] ?? []}
								onselect={(optionIds) => updateMultipleResponseSelections(soundbite.id, optionIds)}
							/>
						{:else if soundbite.variantType === 'image_choice'}
							{@const config = soundbite.variantConfig as ImageChoiceConfig}
							<ImageChoiceInput
								soundbiteId={soundbite.id}
								options={config.options}
								selectedOptionId={userAnswers[soundbite.id] ?? ''}
								onselect={(optionId) => updateAnswer(soundbite.id, optionId)}
							/>
						{:else if soundbite.variantType === 'sequence'}
							{@const config = soundbite.variantConfig as SequenceConfig}
							<div class="flex flex-col gap-4">
								<SequenceAudioPlayer
									tracks={config.tracks}
									onBuzzer={(trackIndex) => handleSequenceBuzz(soundbite.id, trackIndex)}
									disabled={sequenceBuzzed[soundbite.id] ?? false}
								/>
								<p class="text-center font-medium text-gray-700">{config.prompt}</p>
								<SequenceInput
									soundbiteId={soundbite.id}
									answer={userAnswers[soundbite.id] ?? ''}
									onBuzzer={() => {}}
									disabled={sequenceBuzzed[soundbite.id] ?? false}
								/>
							</div>
						{:else if soundbite.variantType === 'rank'}
							{@const config = soundbite.variantConfig as unknown as RankConfig}
							<div class="flex flex-col gap-4">
								<RankAudioPlayer
									items={config.items}
									soundbiteId={soundbite.id}
									onOrderChange={(order) => handleRankOrderChange(soundbite.id, order)}
									disabled={submitting}
								/>
								<p class="text-center font-medium text-gray-700">{config.prompt}</p>
								<input
									type="hidden"
									name="answer-{soundbite.id}"
									value={userAnswers[soundbite.id] ?? '[]'}
								/>
							</div>
						{/if}
					</Card>
				</div>
			{/each}
		</section>

		{#if !data.user}
			<input
				id="displayName"
				name="displayName"
				type="text"
				class="mt-6 ml-auto block w-full max-w-60 rounded-sm border border-neutral-200 bg-white px-2 py-2 text-sm"
				placeholder="Include your name (optional)"
				bind:value={displayName}
				required
			/>
		{/if}

		{#if errorMessage}
			<div class="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{errorMessage}
			</div>
		{/if}

		<div class="mt-6 flex justify-end">
			<Button type="submit" variant="primary" size="md" disabled={submitting}>
				{submitting ? 'Submitting...' : 'Submit answers'}
			</Button>
		</div>
	</form>
{/if}
