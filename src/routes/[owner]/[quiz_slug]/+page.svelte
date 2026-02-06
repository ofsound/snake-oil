<script lang="ts">
	import { enhance } from '$app/forms';

	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import SimpleGuessInput from '$lib/components/SimpleGuessInput.svelte';
	import MultipleChoiceInput from '$lib/components/MultipleChoiceInput.svelte';
	import AnswerResultCard from '$lib/components/AnswerResultCard.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import MultipleResponseInput from '$lib/components/MultipleResponseInput.svelte';
	import ImageChoiceInput from '$lib/components/ImageChoiceInput.svelte';
	import SequenceAudioPlayer from '$lib/components/SequenceAudioPlayer.svelte';
	import SequenceInput from '$lib/components/SequenceInput.svelte';
	import RankAudioPlayer from '$lib/components/RankAudioPlayer.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import QuizAudioPlayer from '$lib/components/audio/QuizAudioPlayer.svelte';
	import SpeedRunGame from './components/SpeedRunGame.svelte';

	import {
		type AnswersPayload,
		type MultipleChoiceConfig,
		type MultipleResponseConfig,
		type ImageChoiceConfig,
		type SequenceConfig,
		type RankConfig,
		isRankConfig,
		isImageChoiceConfig,
		isMultipleResponseConfig,
		isMultipleChoiceConfig
	} from '$lib/variant-types';

	import type { ActionData, PageData } from './$types';
	let { data, form }: { data: PageData; form: ActionData | undefined } = $props();

	let submitting = $state(false);
	let displayName = $state('');
	let errorMessage = $derived(form?.message ?? null);
	let hasResults = $derived(form?.success === true && form?.results != null);

	// Track user answers for each soundbite
	let userAnswers = $state<Record<string, string>>({});
	let multipleResponseSelections = $state<Record<string, string[]>>({});
	let sequenceBuzzed = $state<Record<string, boolean>>({});
	let rankOrders = $state<Record<string, number[]>>({});

	let signedInLabel = $derived(data.user?.name || data.user?.email || 'Signed-in user');
	let isOwner = $derived(data.user?.id === data.quiz.owner.id);
	let isSpeedRun = $derived(!!data.quiz.speedRun);
	let speedRunConfig = $derived(isSpeedRun ? data.quiz.speedRun : null);

	function updateAnswer(soundbiteId: string, value: string) {
		userAnswers = { ...userAnswers, [soundbiteId]: value };
	}

	function updateMultipleResponseSelections(soundbiteId: string, optionIds: string[]) {
		multipleResponseSelections = { ...multipleResponseSelections, [soundbiteId]: optionIds };
		userAnswers = { ...userAnswers, [soundbiteId]: optionIds.join(',') };
	}

	function handleSequenceBuzz(soundbiteId: string, trackIndex: number) {
		sequenceBuzzed = { ...sequenceBuzzed, [soundbiteId]: true };
		userAnswers = { ...userAnswers, [soundbiteId]: String(trackIndex) };
	}

	function handleRankOrderChange(soundbiteId: string, order: number[]) {
		rankOrders = { ...rankOrders, [soundbiteId]: order };
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

<svelte:head>
	<title>{data.quiz.title}</title>
	<meta name="description" content={data.quiz.description} />
</svelte:head>

{#if isSpeedRun && data.speedRunQuestions}
	<!-- Speed Run Mode -->
	<div class="min-h-screen bg-linear-to-br from-slate-900 via-purple-900 to-slate-900">
		{#if isOwner}
			<div class="border-b border-white/10 bg-slate-800/50 px-4 py-3">
				<div class="mx-auto flex max-w-4xl items-center gap-4 text-sm">
					<span class="text-white/60">Owner:</span>
					<a
						href="/{data.quiz.owner.slug}/{data.quiz.slug}/edit"
						class="text-indigo-400 hover:text-indigo-300 hover:underline"
					>
						edit quiz
					</a>
					<span class="text-white/30">|</span>
					<a
						href="/{data.quiz.owner.slug}/{data.quiz.slug}/submissions"
						class="text-indigo-400 hover:text-indigo-300 hover:underline"
					>
						view submissions
					</a>
				</div>
			</div>
		{/if}
		<SpeedRunGame
			quiz={data.quiz}
			speedRun={speedRunConfig!}
			questions={data.speedRunQuestions}
			initialLeaderboard={data.leaderboard}
			user={data.user}
		/>
	</div>
{:else}
	<!-- Regular Quiz Mode -->
	<header class="pb-6">
		<Heading level={1} class="mb-1.5">{data.quiz.title}</Heading>
		<div class="text-sm">
			{data.quiz.createdAt ? new Date(data.quiz.createdAt).toLocaleDateString() : ''}
			by
			<a href="/user/{data.quiz.owner.slug}" class="font-semibold text-indigo-700 hover:underline">
				{data.quiz.owner.name || data.quiz.owner.slug}
			</a>
			{#if isOwner}
				<span class="text-sm text-gray-500">
					(<a href="/{data.quiz.owner.slug}/{data.quiz.slug}/edit" class="hover:underline"
						>edit quiz</a
					>) (<a href="/{data.quiz.owner.slug}/{data.quiz.slug}/submissions" class="hover:underline"
						>view submissions</a
					>)
				</span>
			{/if}
		</div>

		<div class="mt-10">
			{data.quiz.description}
		</div>
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
						{@const parsedConfig = correctAnswer ? JSON.parse(correctAnswer) : null}
						{@const rankConfig =
							soundbite.variantType === 'rank' && parsedConfig && isRankConfig(parsedConfig)
								? parsedConfig
								: null}
						{@const imageChoiceConfig =
							soundbite.variantType === 'image_choice' &&
							parsedConfig &&
							isImageChoiceConfig(parsedConfig)
								? parsedConfig
								: null}
						{@const multipleResponseConfig =
							soundbite.variantType === 'multiple_response' &&
							parsedConfig &&
							isMultipleResponseConfig(parsedConfig)
								? parsedConfig
								: null}
						{@const multipleChoiceConfig =
							soundbite.variantType === 'multiple_choice' &&
							parsedConfig &&
							isMultipleChoiceConfig(parsedConfig)
								? parsedConfig
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
					href="/{data.quiz.owner.slug}/{data.quiz.slug}"
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
			action="?/submitQuiz"
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
									onselect={(optionIds) =>
										updateMultipleResponseSelections(soundbite.id, optionIds)}
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
					<strong>Error:</strong>
					{errorMessage}
				</div>
			{/if}

			{#if form && !form.success && !errorMessage}
				<div class="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					<strong>An error occurred.</strong> Please check the console for details.
				</div>
			{/if}

			<div class="mt-6 flex justify-end">
				<Button type="submit" variant="primary" size="md" disabled={submitting}>
					{submitting ? 'Submitting...' : 'Submit answers'}
				</Button>
			</div>
		</form>
	{/if}
{/if}
