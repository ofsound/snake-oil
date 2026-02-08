<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';

	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import SoundbiteEditor from '$lib/components/SoundbiteEditor.svelte';
	import SoundbiteFormSection from '$lib/components/SoundbiteFormSection.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import FormInput from '$lib/components/FormInput.svelte';
	import FormTextarea from '$lib/components/FormTextarea.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import TagInput from '$lib/components/TagInput.svelte';
	import Toggle from '$lib/components/Toggle.svelte';

	import { buildQuizFormData } from '$lib/form-builder';
	import { resolvePath } from '$lib/utils';
	import { createEmptyOption } from '$lib/variant-client-utils';

	import type { ActionData, PageData } from './$types';
	import type { SoundbiteState } from '$lib/types/soundbite';
	import type { VariantConfig } from '$lib/variant-types';
	let { data, form }: { data: PageData; form: ActionData | undefined } = $props();

	let newSoundbites = $state<SoundbiteState[]>([]);

	let submitting = $state(false);
	let successMessage = $derived(form?.success ? 'Quiz updated successfully.' : null);
	let errorMessage = $derived(form?.message ?? null);

	// Track the quiz ID to prevent resetting form fields when updating the same quiz
	let lastQuizId = $state<string>('');

	// Local state for form fields - initialize from data immediately to prevent flash
	// svelte-ignore state_referenced_locally
	let title = $state(data.quiz.title);
	// svelte-ignore state_referenced_locally
	let slug = $state(data.quiz.slug);
	// svelte-ignore state_referenced_locally
	let description = $state(data.quiz.description);
	// svelte-ignore state_referenced_locally
	let isPublic = $state(data.quiz.visibility === 'public');
	// svelte-ignore state_referenced_locally
	let existingSoundbiteState = $state<Record<string, SoundbiteState>>(
		Object.fromEntries(
			data.soundbites.map((sb) => [sb.id, extractSoundbiteState(sb.variantConfig, sb.question)])
		)
	);

	// Tags state - initialize from existing quiz tags
	// svelte-ignore state_referenced_locally
	let selectedTags = $state<Array<{ id: string; label: string; slug: string }>>(data.tags || []);

	// Speed run configuration state - initialize from server data immediately to prevent flash
	// svelte-ignore state_referenced_locally
	let speedRunConfig = $state(
		data.isSpeedRun && data.speedRunConfig
			? {
					defaultQuestionTimeLimit: data.speedRunConfig.defaultQuestionTimeLimit,
					revealDelayMs: data.speedRunConfig.revealDelayMs,
					audioLoopGapMs: data.speedRunConfig.audioLoopGapMs,
					enableStreakBonus: data.speedRunConfig.enableStreakBonus
				}
			: {
					defaultQuestionTimeLimit: '10',
					revealDelayMs: '3000',
					audioLoopGapMs: '2000',
					enableStreakBonus: true
				}
	);

	// Check if any soundbites use unsupported variant types in speed run mode
	let unsupportedVariantCount = $derived(
		data.isSpeedRun
			? Object.values(existingSoundbiteState).filter(
					(sb) =>
						sb.variantType !== 'multiple_choice' &&
						sb.variantType !== 'simple_guess' &&
						sb.variantType !== 'image_choice'
				).length
			: 0
	);

	// Helper to extract state from variant config
	function extractSoundbiteState(config: VariantConfig, question: string | null): SoundbiteState {
		const defaultState: SoundbiteState = {
			id: 0, // Placeholder - actual ID comes from the database record key
			variantType: 'simple_guess',
			simpleGuessAnswers: [],
			multipleChoiceOptions: [createEmptyOption(), createEmptyOption()],
			multipleResponseOptions: [createEmptyOption(), createEmptyOption()],
			imageChoiceOptions: [],
			imageChoiceFiles: [],
			sequenceTracks: [],
			sequenceCorrectTrackIndex: 0,
			sequencePrompt: '',
			sequenceFiles: [],
			rankItems: [],
			rankCorrectOrder: [],
			rankPrompt: '',
			rankFiles: [],
			question: question ?? ''
		};

		if (config.type === 'simple_guess') {
			return {
				...defaultState,
				variantType: 'simple_guess',
				simpleGuessAnswers: config.correctAnswers
			};
		} else if (config.type === 'multiple_choice') {
			return {
				...defaultState,
				variantType: 'multiple_choice',
				multipleChoiceOptions: config.options
			};
		} else if (config.type === 'multiple_response') {
			return {
				...defaultState,
				variantType: 'multiple_response',
				multipleResponseOptions: config.options
			};
		} else if (config.type === 'sequence') {
			return {
				...defaultState,
				variantType: 'sequence',
				sequenceTracks: config.tracks,
				sequenceCorrectTrackIndex: config.correctTrackIndex,
				sequencePrompt: config.prompt
			};
		} else if (config.type === 'rank') {
			return {
				...defaultState,
				variantType: 'rank',
				rankItems: config.items,
				rankCorrectOrder: config.correctOrder,
				rankPrompt: config.prompt
			};
		} else if (config.type === 'image_choice') {
			return {
				...defaultState,
				variantType: 'image_choice',
				imageChoiceOptions: config.options
			};
		}
		return defaultState;
	}

	// Only update when navigating to a different quiz via client-side navigation
	// Initial values are set above to prevent flash on page load
	$effect(() => {
		const quizId = data.quiz.id;
		const _soundbiteCount = data.soundbites.length;

		if (lastQuizId && lastQuizId !== quizId) {
			// Navigating to a different quiz - update all fields
			untrack(() => {
				title = data.quiz.title;
				slug = data.quiz.slug;
				description = data.quiz.description;
				isPublic = data.quiz.visibility === 'public';
				existingSoundbiteState = Object.fromEntries(
					data.soundbites.map((sb) => [sb.id, extractSoundbiteState(sb.variantConfig, sb.question)])
				);
				// Update speed run config from data
				if (data.isSpeedRun && data.speedRunConfig) {
					speedRunConfig = {
						defaultQuestionTimeLimit: data.speedRunConfig.defaultQuestionTimeLimit,
						revealDelayMs: data.speedRunConfig.revealDelayMs,
						audioLoopGapMs: data.speedRunConfig.audioLoopGapMs,
						enableStreakBonus: data.speedRunConfig.enableStreakBonus
					};
				}
				lastQuizId = quizId;
			});
		} else if (!lastQuizId) {
			// First load - just set the quiz ID without updating fields
			// Fields are already initialized correctly above
			lastQuizId = quizId;
		} else if (lastQuizId === quizId && newSoundbites.length === 0) {
			// Same quiz, but new soundbites were just saved - refresh existingSoundbiteState
			// This happens after successful form submission when newSoundbites is cleared
			untrack(() => {
				existingSoundbiteState = Object.fromEntries(
					data.soundbites.map((sb) => [sb.id, extractSoundbiteState(sb.variantConfig, sb.question)])
				);
			});
		}
	});

	function handleNewSoundbitesChange(newSoundbitesList: SoundbiteState[]) {
		newSoundbites = newSoundbitesList;
	}

	function updateExistingSoundbite(id: string, updates: Partial<SoundbiteState>) {
		existingSoundbiteState = {
			...existingSoundbiteState,
			[id]: { ...existingSoundbiteState[id], ...updates }
		};
	}
</script>

<PageContainer>
	<nav class="mb-7 flex">
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
						await goto(resolvePath(result.location));
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

	<form
		method="POST"
		action="?/update"
		enctype="multipart/form-data"
		class="flex flex-col gap-6"
		use:enhance={({ formData }) => {
			submitting = true;

			// Use centralized form builder for new soundbites
			// Existing soundbites are already in the form via SoundbiteEditor's hidden inputs
			const newSoundbitesFormData = buildQuizFormData({
				title,
				description,
				slug,
				quizMode: data.isSpeedRun ? 'speed_run' : 'standard',
				speedRunConfig: data.isSpeedRun ? speedRunConfig : undefined,
				soundbites: newSoundbites.map((sb) => ({
					id: sb.id,
					state: sb,
					type: 'new' as const
				}))
			});

			// Merge new soundbite data into the main formData
			// Skip basic fields that are already in the form HTML
			const skipKeys = [
				'title',
				'description',
				'slug',
				'visibility',
				'quizMode',
				'speedRunConfig',
				'tags'
			];
			newSoundbitesFormData.forEach((value, key) => {
				if (!skipKeys.includes(key)) {
					// Adjust indices to account for existing soundbites
					const adjustedKey = key.replace(/soundbite\[(\d+)\]/, (_, index) => {
						const newIdx = parseInt(index, 10) + data.soundbites.length;
						return `soundbite[${newIdx}]`;
					});
					formData.append(adjustedKey, value);
				}
			});

			// Add tags
			if (selectedTags.length > 0) {
				formData.append('tags', JSON.stringify(selectedTags.map((t) => t.id)));
			}

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
				} else {
					await update({ reset: false });
				}
				submitting = false;
			};
		}}
	>
		{#if data.isSpeedRun}
			<Card variant="flat" padding="md" class="mb-6 border-amber-200 bg-amber-50!">
				<h3 class="mb-3 font-semibold text-amber-900">Speed Run Settings</h3>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<FormField label="Time Per Question (seconds)" id="questionTimeLimit">
						<FormInput
							id="questionTimeLimit"
							name="questionTimeLimit"
							type="number"
							min="3"
							max="60"
							bind:value={speedRunConfig.defaultQuestionTimeLimit}
						/>
					</FormField>

					<FormField label="Reveal Delay (ms)" id="revealDelayMs">
						<FormInput
							id="revealDelayMs"
							name="revealDelayMs"
							type="number"
							min="1000"
							max="10000"
							step="500"
							bind:value={speedRunConfig.revealDelayMs}
						/>
					</FormField>

					<FormField label="Audio Loop Gap (ms)" id="audioLoopGapMs">
						<FormInput
							id="audioLoopGapMs"
							name="audioLoopGapMs"
							type="number"
							min="0"
							max="5000"
							step="500"
							bind:value={speedRunConfig.audioLoopGapMs}
						/>
					</FormField>
				</div>

				<div class="mt-4 flex items-center gap-2">
					<input
						type="checkbox"
						id="enableStreakBonus"
						name="enableStreakBonus"
						bind:checked={speedRunConfig.enableStreakBonus}
						class="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
					/>
					<label for="enableStreakBonus" class="text-sm text-amber-900">
						Enable streak bonuses and notifications
					</label>
				</div>

				{#if unsupportedVariantCount > 0}
					<div class="mt-3 rounded-md border border-red-300 bg-red-50 p-3">
						<p class="text-sm text-red-700">
							<strong>Warning:</strong> You have {unsupportedVariantCount} question(s) that use unsupported
							variant types. Speed Run mode only supports Multiple Choice, Simple Guess, and Image Choice.
							Please change them to continue.
						</p>
					</div>
				{/if}

				<p class="mt-3 text-sm text-amber-700">
					<strong>Note:</strong> Speed Run mode supports Multiple Choice, Simple Guess, and Image Choice
					questions. Simple Guess allows unlimited attempts until time runs out!
				</p>

				{@const speedRunConfigNumeric = {
					defaultQuestionTimeLimit: speedRunConfig.defaultQuestionTimeLimit
						? parseInt(String(speedRunConfig.defaultQuestionTimeLimit), 10)
						: null,
					revealDelayMs: parseInt(String(speedRunConfig.revealDelayMs), 10),
					audioLoopGapMs: parseInt(String(speedRunConfig.audioLoopGapMs), 10),
					enableStreakBonus: speedRunConfig.enableStreakBonus
				}}
				<input type="hidden" name="speedRunConfig" value={JSON.stringify(speedRunConfigNumeric)} />
			</Card>
		{/if}

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

			<input type="hidden" name="visibility" value={isPublic ? 'public' : 'unlisted'} />
			<Toggle bind:checked={isPublic} label="Visibility" leftLabel="Unlisted" rightLabel="Public" />
		</Card>

		<!-- Tags Section -->
		<Card variant="flat" padding="md">
			<FormField label="Tags" id="tags">
				<TagInput
					bind:tags={selectedTags}
					placeholder="Add tags to help people find your quiz..."
				/>
				<p class="mt-2 text-xs text-gray-500">
					Type to search existing tags or press Enter to create new ones. Tags help users discover
					your quiz.
				</p>
			</FormField>
		</Card>

		<section class="flex flex-col gap-4">
			<Heading level={2} class="mb-6">Questions</Heading>
			<div class="flex flex-col gap-4">
				{#each data.soundbites as soundbite, index (soundbite.id)}
					{@const state = existingSoundbiteState[soundbite.id]}
					{#if state}
						<div class="flex">
							<div class="mt-2 w-8 text-sm font-medium text-neutral-500">{index + 1}.</div>
							<Card variant="neutral" padding="md" class="relative flex-1">
								<div class="flex items-center justify-between">
									<p class="text mb-4 font-medium">{soundbite.trackName}</p>
									<label class="flex items-center gap-2 text-xs font-medium">
										<input type="checkbox" name={`soundbite[${index}].removed`} value="true" />
										Remove
									</label>
								</div>

								<SoundbiteEditor
									soundbite={{ ...state, id: soundbite.id }}
									{index}
									id={soundbite.id}
									fileInputRequired={false}
									fileInputLabel="Replace MP3 (optional)"
									onChange={(updates) => updateExistingSoundbite(soundbite.id, updates)}
								/>
							</Card>
						</div>
					{/if}
				{/each}
			</div>
		</section>

		<SoundbiteFormSection
			bind:soundbites={newSoundbites}
			headerTitle="Add New Questions"
			addButtonText="Add Question"
			startIndex={data.soundbites.length}
			onChange={handleNewSoundbitesChange}
			allowedVariantTypes={data.isSpeedRun
				? ['multiple_choice', 'simple_guess', 'image_choice']
				: undefined}
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
</PageContainer>
