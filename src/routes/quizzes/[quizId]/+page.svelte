<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import SoundbiteEditor from '$lib/components/SoundbiteEditor.svelte';
	import SoundbiteFormSection from '$lib/components/SoundbiteFormSection.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import FormInput from '$lib/components/FormInput.svelte';
	import FormTextarea from '$lib/components/FormTextarea.svelte';
	import type { ActionData, PageData } from './$types';
	import type {
		VariantType,
		MultipleChoiceOption,
		MultipleResponseOption,
		VariantConfig,
		AnswersPayload
	} from '$lib/variant-types';
	import { createEmptyOption, getCorrectAnswerText } from '$lib/variant-client-utils';
	import Heading from '$lib/components/Heading.svelte';

	let { data, form }: { data: PageData; form: ActionData | undefined } = $props();

	type NewSoundbiteState = {
		id: number;
		variantType: VariantType;
		simpleGuessAnswer: string;
		multipleChoiceOptions: MultipleChoiceOption[];
		multipleResponseOptions: MultipleResponseOption[];
		question: string;
	};

	type ExistingSoundbiteState = {
		variantType: VariantType;
		simpleGuessAnswer: string;
		multipleChoiceOptions: MultipleChoiceOption[];
		multipleResponseOptions: MultipleResponseOption[];
		question: string;
	};

	let nextNewSoundbiteId = $state(0);
	let newSoundbites = $state<NewSoundbiteState[]>([]);

	let submitting = $state(false);
	let activeTab = $state<'edit' | 'answers'>('edit');
	let successMessage = $derived(form?.success ? 'Quiz updated successfully.' : null);
	let errorMessage = $derived(form?.message ?? null);

	// Track the quiz ID to prevent resetting form fields when updating the same quiz
	let lastQuizId = $state<string>('');

	// Local state for form fields - initialize from data once
	let title = $state('');
	let slug = $state('');
	let description = $state('');
	let existingSoundbiteState = $state<Record<string, ExistingSoundbiteState>>({});

	// Helper to extract state from variant config
	function extractSoundbiteState(
		config: VariantConfig,
		question: string | null
	): ExistingSoundbiteState {
		if (config.type === 'simple_guess') {
			return {
				variantType: 'simple_guess',
				simpleGuessAnswer: config.correctAnswer,
				multipleChoiceOptions: [createEmptyOption(), createEmptyOption()],
				multipleResponseOptions: [createEmptyOption(), createEmptyOption()],
				question: question ?? ''
			};
		} else if (config.type === 'multiple_choice') {
			return {
				variantType: 'multiple_choice',
				simpleGuessAnswer: '',
				multipleChoiceOptions: config.options,
				multipleResponseOptions: [createEmptyOption(), createEmptyOption()],
				question: question ?? ''
			};
		} else if (config.type === 'multiple_response') {
			return {
				variantType: 'multiple_response',
				simpleGuessAnswer: '',
				multipleChoiceOptions: [createEmptyOption(), createEmptyOption()],
				multipleResponseOptions: config.options,
				question: question ?? ''
			};
		}
		return {
			variantType: 'simple_guess',
			simpleGuessAnswer: '',
			multipleChoiceOptions: [createEmptyOption(), createEmptyOption()],
			multipleResponseOptions: [createEmptyOption(), createEmptyOption()],
			question: question ?? ''
		};
	}

	// Only update when navigating to a different quiz
	// Use untrack to avoid creating reactive dependencies that cause infinite loops
	$effect(() => {
		const quizId = data.quiz.id;
		if (lastQuizId !== quizId) {
			// Navigating to a different quiz - update all fields
			untrack(() => {
				title = data.quiz.title;
				slug = data.quiz.slug;
				description = data.quiz.description;
				existingSoundbiteState = Object.fromEntries(
					data.soundbites.map((sb) => [sb.id, extractSoundbiteState(sb.variantConfig, sb.question)])
				);
				lastQuizId = quizId;
			});
		}
	});

	function handleNewSoundbitesChange(newSoundbitesList: NewSoundbiteState[]) {
		newSoundbites = newSoundbitesList;
	}

	function updateExistingVariantType(id: string, variantType: VariantType) {
		existingSoundbiteState = {
			...existingSoundbiteState,
			[id]: { ...existingSoundbiteState[id], variantType }
		};
	}

	function updateExistingSimpleGuessAnswer(id: string, answer: string) {
		existingSoundbiteState = {
			...existingSoundbiteState,
			[id]: { ...existingSoundbiteState[id], simpleGuessAnswer: answer }
		};
	}

	function updateExistingMultipleChoiceOptions(id: string, options: MultipleChoiceOption[]) {
		existingSoundbiteState = {
			...existingSoundbiteState,
			[id]: { ...existingSoundbiteState[id], multipleChoiceOptions: options }
		};
	}

	function updateExistingMultipleResponseOptions(id: string, options: MultipleResponseOption[]) {
		existingSoundbiteState = {
			...existingSoundbiteState,
			[id]: { ...existingSoundbiteState[id], multipleResponseOptions: options }
		};
	}

	function updateExistingQuestion(id: string, question: string) {
		existingSoundbiteState = {
			...existingSoundbiteState,
			[id]: { ...existingSoundbiteState[id], question }
		};
	}

	const getSubmitterLabel = (entry: PageData['answers'][number]) =>
		entry.userName || entry.userEmail || entry.displayName || 'Anonymous';

	function getAnswerDisplay(
		answers: AnswersPayload | null,
		soundbiteId: string,
		soundbite: PageData['soundbites'][number]
	): { guess: string; isCorrect: boolean } {
		const detail = answers?.[soundbiteId];
		if (!detail) return { guess: '(no answer)', isCorrect: false };

		let guessText = detail.guess;
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
		}

		return { guess: guessText || '(no answer)', isCorrect: detail.isCorrect };
	}
</script>

<header class="mb-6 flex items-baseline gap-1">
	<Heading level={1}>Manage Quiz</Heading>
	<div class="text-gray-500">
		(<a class="text-sm hover:underline" href={`/${slug}`}>view quiz</a>)
	</div>
</header>

<nav class="mb-10 flex border-b border-neutral-200">
	<button
		type="button"
		class="cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition-colors"
		class:border-indigo-600={activeTab === 'edit'}
		class:text-indigo-600={activeTab === 'edit'}
		class:border-transparent={activeTab !== 'edit'}
		class:text-gray-500={activeTab !== 'edit'}
		class:hover:text-gray-700={activeTab !== 'edit'}
		onclick={() => (activeTab = 'edit')}
	>
		Edit Quiz
	</button>
	<button
		type="button"
		class="cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition-colors"
		class:border-indigo-600={activeTab === 'answers'}
		class:text-indigo-600={activeTab === 'answers'}
		class:border-transparent={activeTab !== 'answers'}
		class:text-gray-500={activeTab !== 'answers'}
		class:hover:text-gray-700={activeTab !== 'answers'}
		onclick={() => (activeTab = 'answers')}
	>
		View Answers
	</button>
	<form
		method="POST"
		action="?/delete"
		class="flex-1 text-right"
		use:enhance={({ cancel }) => {
			if (!confirm('Are you sure you want to delete this quiz?')) {
				cancel();
				return;
			}
			return async ({ result, update }) => {
				// If redirect, navigate to the location
				if (result.type === 'redirect') {
					await goto(result.location);
					return;
				}
				// For other result types (success, failure), update the page
				await update();
			};
		}}
	>
		<Button type="submit" variant="danger" size="xs">Delete Quiz</Button>
	</form>
</nav>

{#if activeTab === 'edit'}
	<form
		method="POST"
		action="?/update"
		enctype="multipart/form-data"
		class="flex flex-col gap-6"
		use:enhance={() => {
			submitting = true;
			return async ({ result, update }) => {
				if (result.type === 'success') {
					// Store current field values before update
					const currentTitle = title;
					const currentSlug = slug;
					const currentDescription = description;
					await update({ reset: false });
					// Restore field values to preserve user input after successful save
					title = currentTitle;
					slug = currentSlug;
					description = currentDescription;
					// Clear new soundbites since they've been saved
					newSoundbites = [];
					nextNewSoundbiteId = 0;
				} else {
					await update({ reset: false });
				}
				submitting = false;
			};
		}}
	>
		<Card variant="flat" padding="md" class="flex flex-col gap-4">
			<FormField label="Title" id="title">
				<FormInput id="title" name="title" type="text" bind:value={title} required />
			</FormField>
			<FormField label="URL" id="slug">
				<FormInput id="slug" name="slug" type="text" bind:value={slug} required />
			</FormField>
			<FormField label="Description" id="description">
				<FormTextarea
					id="description"
					name="description"
					rows={4}
					bind:value={description}
					required
				/>
			</FormField>
		</Card>

		<section class="flex flex-col gap-4">
			<Heading level={2} class="mb-6">Audio Clips</Heading>
			<div class="flex flex-col gap-4">
				{#each data.soundbites as soundbite, index (soundbite.id)}
					{@const state = existingSoundbiteState[soundbite.id]}
					{#if state}
						<div class="flex">
							<div class="mt-2 w-8 text-sm font-medium text-neutral-500">{index + 1}.</div>
							<Card variant="neutral" padding="md" class="relative flex-1">
								<input type="hidden" name="existingSoundbiteId" value={soundbite.id} />
								<div class="flex items-center justify-between">
									<p class="text mb-4 font-medium">{soundbite.trackName}</p>
									<label class="flex items-center gap-2 text-xs font-medium">
										<input type="checkbox" name="existingSoundbiteRemove" value={soundbite.id} />
										Remove
									</label>
								</div>

								<SoundbiteEditor
									id={`existing-${soundbite.id}`}
									variantType={state.variantType}
									question={state.question}
									simpleGuessAnswer={state.simpleGuessAnswer}
									multipleChoiceOptions={state.multipleChoiceOptions}
									multipleResponseOptions={state.multipleResponseOptions}
									variantTypeName="existingSoundbiteVariantType"
									variantConfigName="existingSoundbiteVariantConfig"
									questionName="existingSoundbiteQuestion"
									fileInputName="existingSoundbiteFile"
									fileInputRequired={false}
									fileInputLabel="Replace MP3 (optional)"
									fileInputId={`existing-file-${soundbite.id}`}
									onVariantTypeChange={(value) => updateExistingVariantType(soundbite.id, value)}
									onQuestionChange={(value) => updateExistingQuestion(soundbite.id, value)}
									onSimpleGuessAnswerChange={(value) =>
										updateExistingSimpleGuessAnswer(soundbite.id, value)}
									onMultipleChoiceOptionsChange={(options) =>
										updateExistingMultipleChoiceOptions(soundbite.id, options)}
									onMultipleResponseOptionsChange={(options) =>
										updateExistingMultipleResponseOptions(soundbite.id, options)}
								/>
							</Card>
						</div>
					{/if}
				{/each}
			</div>
		</section>

		<SoundbiteFormSection
			bind:soundbites={newSoundbites}
			headerTitle="Add New Audio Clips"
			addButtonText="Add Audio Clip"
			cardTitle={() => 'New SoundBite'}
			variantTypeName="newSoundbiteVariantType"
			variantConfigName="newSoundbiteVariantConfig"
			questionName="newSoundbiteQuestion"
			fileInputName="newSoundbiteFile"
			fileInputRequired={true}
			onChange={handleNewSoundbitesChange}
		/>

		{#if successMessage}
			<div class="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
				{successMessage}
			</div>
		{/if}

		{#if errorMessage}
			<div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{errorMessage}
			</div>
		{/if}

		<div class="mt-6 flex justify-end border-t border-neutral-200 pt-6">
			<Button variant="primary" size="md" type="submit" disabled={submitting} loading={submitting}>
				Save changes
			</Button>
		</div>
	</form>
{/if}

{#if activeTab === 'answers'}
	<section class="flex flex-col gap-4">
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
									{submission.createdAt ? new Date(submission.createdAt).toLocaleDateString() : ''}
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
										<span class="hidden text-xs font-medium">
											{answerInfo.isCorrect ? 'Correct' : 'Incorrect'}
										</span>
									</div>
									<div class="mt-1">
										<span>Answer: <span class="font-medium">{answerInfo.guess}</span></span>
										{#if !answerInfo.isCorrect}
											<span class="ml-3">
												(Correct: <span class="font-medium"
													>{getCorrectAnswerText(soundbite.variantConfig)}</span
												>)
											</span>
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
{/if}
