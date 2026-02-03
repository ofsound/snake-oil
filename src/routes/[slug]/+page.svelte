<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import SimpleGuessInput from '$lib/components/SimpleGuessInput.svelte';
	import MultipleChoiceInput from '$lib/components/MultipleChoiceInput.svelte';
	import AnswerResultCard from '$lib/components/AnswerResultCard.svelte';
	import type { ActionData, PageData } from './$types';
	import MultipleResponseInput from '$lib/components/MultipleResponseInput.svelte';
	import type {
		AnswersPayload,
		MultipleChoiceConfig,
		MultipleResponseConfig
	} from '$lib/variant-types';

	let { data, form }: { data: PageData; form: ActionData | undefined } = $props();

	let submitting = $state(false);
	let displayName = $state('');
	let errorMessage = $derived(form?.message ?? null);
	let hasResults = $derived(form?.success && form?.results);

	// Track user answers for each soundbite
	// For simple_guess and multiple_choice: string
	// For multiple_response: comma-separated string (parsed on submit)
	let userAnswers = $state<Record<string, string>>({});
	// Track multiple response selections separately (id -> array of option ids)
	let multipleResponseSelections = $state<Record<string, string[]>>({});

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

<div class="mx-auto max-w-4xl p-8">
	<header class="pb-6">
		<h1 class="mb-1 text-3xl font-semibold">{data.quiz.title}</h1>
		<div class="text-sm">
			{data.quiz.createdAt ? new Date(data.quiz.createdAt).toLocaleDateString() : ''}
			by
			<a
				href="/users/{data.quiz.owner.slug}"
				class="font-semibold text-green-600 hover:text-green-800 hover:underline"
			>
				{data.quiz.owner.name || data.quiz.owner.slug}
			</a>
			{#if isOwner}
				<span class="text-sm text-gray-500">
					(<a href="/quizzes/{data.quiz.id}" class="hover:underline">Manage Quiz</a>)
				</span>
			{/if}
		</div>

		<div class="mt-6">
			{data.quiz.description}
		</div>
	</header>

	{#if hasResults && results}
		<!-- Results Display -->
		<div class="space-y-6">
			<Card variant="elevated" padding="md">
				<div class="text-center">
					<h2 class="text-2xl font-bold text-emerald-700">
						Your Score: {results.totalCorrect}/{results.totalQuestions}
					</h2>
					<p class="mt-1 text-lg text-gray-600">{results.score}% correct</p>
				</div>
			</Card>

			<section class="space-y-4">
				<h3 class="text-lg font-semibold">Your Answers</h3>
				{#each data.soundbites as soundbite, index (soundbite.id)}
					{@const answerDetail = results.answers[soundbite.id]}
					{@const correctAnswer = results.correctAnswers[soundbite.id]}
					{#if answerDetail}
						<div class="rounded-sm bg-neutral-50 p-4">
							<div class="mb-3">
								<div class="mb-2 text-base font-medium text-gray-700">Audio #{index + 1}</div>
								<audio controls class="w-full">
									<source src={soundbite.trackUrl} type="audio/mpeg" />
									Your browser does not support the audio element.
								</audio>
								{#if soundbite.question}
									<p class="mt-2 text-sm text-gray-600 italic">{soundbite.question}</p>
								{/if}
							</div>
							<AnswerResultCard
								{answerDetail}
								variantConfig={{
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
					href={`/${data.quiz.slug}`}
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
			{#if !data.user}
				<Card variant="elevated" padding="md">
					<label class="text-sm font-medium text-gray-700" for="displayName">Display name</label>
					<input
						id="displayName"
						name="displayName"
						type="text"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
						placeholder="Anonymous listener"
						bind:value={displayName}
						required
					/>
				</Card>
			{/if}

			<section class="flex flex-col gap-4 pt-6">
				{#each data.soundbites as soundbite, index (soundbite.id)}
					<Card variant="neutral" padding="sm" class="flex flex-col gap-6 bg-neutral-50">
						<input type="hidden" name="soundbiteId" value={soundbite.id} />
						<div class="flex flex-col gap-2">
							<div
								class="mb-2 w-max rounded-sm bg-neutral-600 px-2 py-1 text-sm font-medium text-white"
							>
								{index + 1}
							</div>
							<audio controls class="w-full">
								<source src={soundbite.trackUrl} type="audio/mpeg" />
								Your browser does not support the audio element.
							</audio>
							{#if soundbite.question}
								<p class="mt-6 font-semibold">{soundbite.question}</p>
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
						{/if}
					</Card>
				{/each}
			</section>

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
</div>
