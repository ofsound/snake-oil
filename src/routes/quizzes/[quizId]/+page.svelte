<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import VariantSelector from '$lib/components/VariantSelector.svelte';
	import SimpleGuessEditor from '$lib/components/SimpleGuessEditor.svelte';
	import MultipleChoiceEditor from '$lib/components/MultipleChoiceEditor.svelte';
	import MultipleResponseEditor from '$lib/components/MultipleResponseEditor.svelte';
	import type { ActionData, PageData } from './$types';
	import type {
		VariantType,
		MultipleChoiceOption,
		MultipleResponseOption,
		VariantConfig,
		AnswersPayload
	} from '$lib/variant-types';
	import { createEmptyOption, getCorrectAnswerText } from '$lib/variant-client-utils';

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

	function addNewSoundbite() {
		newSoundbites = [
			...newSoundbites,
			{
				id: nextNewSoundbiteId,
				variantType: 'simple_guess',
				simpleGuessAnswer: '',
				multipleChoiceOptions: [createEmptyOption(), createEmptyOption()],
				multipleResponseOptions: [createEmptyOption(), createEmptyOption()],
				question: ''
			}
		];
		nextNewSoundbiteId += 1;
	}

	function removeNewSoundbite(id: number) {
		newSoundbites = newSoundbites.filter((soundbite) => soundbite.id !== id);
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

	function updateNewVariantType(id: number, variantType: VariantType) {
		newSoundbites = newSoundbites.map((sb) => (sb.id === id ? { ...sb, variantType } : sb));
	}

	function updateNewSimpleGuessAnswer(id: number, answer: string) {
		newSoundbites = newSoundbites.map((sb) =>
			sb.id === id ? { ...sb, simpleGuessAnswer: answer } : sb
		);
	}

	function updateNewMultipleChoiceOptions(id: number, options: MultipleChoiceOption[]) {
		newSoundbites = newSoundbites.map((sb) =>
			sb.id === id ? { ...sb, multipleChoiceOptions: options } : sb
		);
	}

	function updateNewMultipleResponseOptions(id: number, options: MultipleResponseOption[]) {
		newSoundbites = newSoundbites.map((sb) =>
			sb.id === id ? { ...sb, multipleResponseOptions: options } : sb
		);
	}

	function updateNewQuestion(id: number, question: string) {
		newSoundbites = newSoundbites.map((sb) => (sb.id === id ? { ...sb, question } : sb));
	}

	function getVariantConfigJson(state: ExistingSoundbiteState | NewSoundbiteState): string {
		if (state.variantType === 'simple_guess') {
			return JSON.stringify({ type: 'simple_guess', correctAnswer: state.simpleGuessAnswer });
		} else if (state.variantType === 'multiple_choice') {
			return JSON.stringify({ type: 'multiple_choice', options: state.multipleChoiceOptions });
		} else if (state.variantType === 'multiple_response') {
			return JSON.stringify({ type: 'multiple_response', options: state.multipleResponseOptions });
		}
		return JSON.stringify({ type: 'simple_guess', correctAnswer: '' });
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

<div class="mx-auto max-w-5xl space-y-10 p-8">
	<header class="relative space-y-2">
		<div class="flex items-start justify-between">
			<div class="space-y-2">
				<h1 class="text-3xl font-semibold">Manage Quiz</h1>
				<a class="text-sm underline" href={`/${slug}`}>View Public Quiz</a>
			</div>
			<form
				method="POST"
				action="?/delete"
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
		</div>
	</header>

	<form
		method="POST"
		action="?/update"
		enctype="multipart/form-data"
		class="space-y-6"
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
		<Card variant="elevated" padding="md" class="space-y-4">
			<div class="space-y-3">
				<label class="text-sm font-medium text-gray-700" for="title">Title</label>
				<input
					id="title"
					name="title"
					type="text"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					bind:value={title}
					required
				/>
			</div>
			<div class="space-y-2">
				<label class="text-sm font-medium text-gray-700" for="slug">Slug</label>
				<input
					id="slug"
					name="slug"
					type="text"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					bind:value={slug}
					required
				/>
			</div>
			<div class="space-y-2">
				<label class="text-sm font-medium text-gray-700" for="description">Description</label>
				<textarea
					id="description"
					name="description"
					rows="4"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					bind:value={description}
					required
				></textarea>
			</div>
		</Card>

		<section class="space-y-4">
			<h2 class="text-lg font-semibold">Existing SoundBites</h2>
			<div class="space-y-4">
				{#each data.soundbites as soundbite (soundbite.id)}
					{@const state = existingSoundbiteState[soundbite.id]}
					{#if state}
						<Card variant="elevated" padding="sm" class="space-y-3">
							<input type="hidden" name="existingSoundbiteId" value={soundbite.id} />
							<div class="flex items-center justify-between">
								<p class="text-sm font-medium text-gray-700">{soundbite.trackName}</p>
								<label class="flex items-center gap-2 text-xs text-gray-500">
									<input type="checkbox" name="existingSoundbiteRemove" value={soundbite.id} />
									Remove
								</label>
							</div>

							<div class="grid gap-4 md:grid-cols-2">
								<div class="space-y-2">
									<label
										class="text-sm font-medium text-gray-700"
										for={`existing-file-${soundbite.id}`}
									>
										Replace MP3 (optional)
									</label>
									<input
										id={`existing-file-${soundbite.id}`}
										name="existingSoundbiteFile"
										type="file"
										accept="audio/mpeg,.mp3"
										class="w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5"
									/>
								</div>

								<VariantSelector
									id={`existing-variant-${soundbite.id}`}
									value={state.variantType}
									onchange={(value) => updateExistingVariantType(soundbite.id, value)}
								/>
							</div>

							<div class="space-y-2">
								<label
									class="text-sm font-medium text-gray-700"
									for={`existing-question-${soundbite.id}`}
								>
									Question (optional)
								</label>
								<textarea
									id={`existing-question-${soundbite.id}`}
									name="existingSoundbiteQuestion"
									rows="2"
									class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
									placeholder="e.g., What guitar is being played?"
									value={state.question}
									oninput={(e) => updateExistingQuestion(soundbite.id, e.currentTarget.value)}
								></textarea>
								<p class="text-xs text-gray-500">
									This appears below the audio player to guide quiz takers.
								</p>
							</div>

							<input type="hidden" name="existingSoundbiteVariantType" value={state.variantType} />

							{#if state.variantType === 'simple_guess'}
								<SimpleGuessEditor
									id={`existing-simple-guess-${soundbite.id}`}
									value={state.simpleGuessAnswer}
									oninput={(value) => updateExistingSimpleGuessAnswer(soundbite.id, value)}
								/>
							{:else if state.variantType === 'multiple_choice'}
								<MultipleChoiceEditor
									idPrefix={`existing-mc-${soundbite.id}`}
									options={state.multipleChoiceOptions}
									onchange={(options) => updateExistingMultipleChoiceOptions(soundbite.id, options)}
								/>
							{:else if state.variantType === 'multiple_response'}
								<MultipleResponseEditor
									idPrefix={`existing-mr-${soundbite.id}`}
									options={state.multipleResponseOptions}
									onchange={(options) =>
										updateExistingMultipleResponseOptions(soundbite.id, options)}
								/>
							{/if}

							<input
								type="hidden"
								name="existingSoundbiteVariantConfig"
								value={getVariantConfigJson(state)}
							/>
						</Card>
					{/if}
				{/each}
			</div>
		</section>

		<section class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold">Add new SoundBites</h2>
				<Button variant="outline" size="sm" onclick={addNewSoundbite}>Add SoundBite</Button>
			</div>
			{#if newSoundbites.length === 0}
				<p class="text-sm text-gray-500">No new SoundBites added yet.</p>
			{:else}
				<div class="space-y-4">
					{#each newSoundbites as soundbite (soundbite.id)}
						<Card variant="elevated" padding="sm" class="space-y-3">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium text-gray-700">New SoundBite</span>
								<button
									type="button"
									class="text-xs text-gray-500 hover:text-gray-700"
									onclick={() => removeNewSoundbite(soundbite.id)}
								>
									Remove
								</button>
							</div>

							<div class="grid gap-4 md:grid-cols-2">
								<div class="space-y-2">
									<label class="text-sm font-medium text-gray-700" for={`new-file-${soundbite.id}`}>
										MP3 file
									</label>
									<input
										id={`new-file-${soundbite.id}`}
										name="newSoundbiteFile"
										type="file"
										accept="audio/mpeg,.mp3"
										class="w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5"
										required
									/>
								</div>

								<VariantSelector
									id={`new-variant-${soundbite.id}`}
									value={soundbite.variantType}
									onchange={(value) => updateNewVariantType(soundbite.id, value)}
								/>
							</div>

							<div class="space-y-2">
								<label
									class="text-sm font-medium text-gray-700"
									for={`new-question-${soundbite.id}`}
								>
									Question (optional)
								</label>
								<textarea
									id={`new-question-${soundbite.id}`}
									name="newSoundbiteQuestion"
									rows="2"
									class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
									placeholder="e.g., What guitar is being played?"
									value={soundbite.question}
									oninput={(e) => updateNewQuestion(soundbite.id, e.currentTarget.value)}
								></textarea>
								<p class="text-xs text-gray-500">
									This appears below the audio player to guide quiz takers.
								</p>
							</div>

							<input type="hidden" name="newSoundbiteVariantType" value={soundbite.variantType} />

							{#if soundbite.variantType === 'simple_guess'}
								<SimpleGuessEditor
									id={`new-simple-guess-${soundbite.id}`}
									value={soundbite.simpleGuessAnswer}
									oninput={(value) => updateNewSimpleGuessAnswer(soundbite.id, value)}
								/>
							{:else if soundbite.variantType === 'multiple_choice'}
								<MultipleChoiceEditor
									idPrefix={`new-mc-${soundbite.id}`}
									options={soundbite.multipleChoiceOptions}
									onchange={(options) => updateNewMultipleChoiceOptions(soundbite.id, options)}
								/>
							{:else if soundbite.variantType === 'multiple_response'}
								<MultipleResponseEditor
									idPrefix={`new-mr-${soundbite.id}`}
									options={soundbite.multipleResponseOptions}
									onchange={(options) => updateNewMultipleResponseOptions(soundbite.id, options)}
								/>
							{/if}

							<input
								type="hidden"
								name="newSoundbiteVariantConfig"
								value={getVariantConfigJson(soundbite)}
							/>
						</Card>
					{/each}
				</div>
			{/if}
		</section>

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

		<div class="flex justify-end">
			<Button variant="accent" size="md" type="submit" disabled={submitting} loading={submitting}>
				Save changes
			</Button>
		</div>
	</form>

	<section class="space-y-4 border-t border-gray-200 pt-4">
		<h2 class="text-xl font-semibold">Submitted answers</h2>
		{#if data.answers.length === 0}
			<p class="text-sm text-gray-500">No submissions yet.</p>
		{:else}
			<div class="space-y-4">
				{#each data.answers as submission (submission.id)}
					<Card variant="elevated" padding="sm" class="space-y-3">
						<div class="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
							<span>From: {getSubmitterLabel(submission)}</span>
							<div class="flex items-center gap-3">
								<span class="font-semibold text-emerald-700">
									Score: {submission.totalCorrect}/{submission.totalQuestions} ({submission.score}%)
								</span>
								<span>
									{submission.createdAt ? new Date(submission.createdAt).toLocaleString() : ''}
								</span>
							</div>
						</div>
						<div class="space-y-2">
							{#each data.soundbites as soundbite (soundbite.id)}
								{@const answerInfo = getAnswerDisplay(
									submission.answers as AnswersPayload,
									soundbite.id,
									soundbite
								)}
								<div
									class="rounded-md border px-3 py-2 text-sm"
									class:border-green-200={answerInfo.isCorrect}
									class:bg-green-50={answerInfo.isCorrect}
									class:border-red-200={!answerInfo.isCorrect}
									class:bg-red-50={!answerInfo.isCorrect}
								>
									<div class="flex items-center justify-between">
										<span class="font-medium">{soundbite.trackName}:</span>
										<span
											class="text-xs font-semibold"
											class:text-green-700={answerInfo.isCorrect}
											class:text-red-700={!answerInfo.isCorrect}
										>
											{answerInfo.isCorrect ? 'Correct' : 'Incorrect'}
										</span>
									</div>
									<div class="mt-1 text-gray-700">
										<span>Answer: {answerInfo.guess}</span>
										{#if !answerInfo.isCorrect}
											<span class="ml-3 text-green-700">
												(Correct: {getCorrectAnswerText(soundbite.variantConfig)})
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
</div>
