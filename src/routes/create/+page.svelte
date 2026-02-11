<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import FormInput from '$lib/components/FormInput.svelte';
	import FormTextarea from '$lib/components/FormTextarea.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import SoundbiteFormSection from '$lib/components/SoundbiteFormSection.svelte';
	import TagInput from '$lib/components/TagInput.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import Icon from '$lib/components/Icon.svelte';

	import { buildQuizFormData } from '$lib/form-builder';
	import { slugify } from '$lib/utils';
	import { createEmptyOption } from '$lib/variant-client-utils';

	import type { ActionData, PageData } from './$types';
	import type { SoundbiteState } from '$lib/types/soundbite';
	let { data, form }: { data: PageData; form: ActionData | undefined } = $props();

	let title = $state('');
	let manualSlug = $state('');
	let description = $state('');
	let isPublic = $state(true); // Default to public
	let slugEdited = $state(false);
	let submitting = $state(false);

	// Quiz mode selection (must be defined before successMessage)
	let quizMode = $state<'standard' | 'speed_run'>('standard');

	let successMessage = $derived(
		form?.success
			? quizMode === 'speed_run'
				? 'Speed run created successfully!'
				: 'Quiz created successfully.'
			: null
	);
	let errorMessage = $derived(form?.message ?? null);

	// Speed run configuration (stored as strings for HTML form inputs)
	let speedRunConfig = $state({
		defaultQuestionTimeLimit: '10', // seconds per question
		revealDelayMs: '3000', // ms to show answer before advancing
		audioLoopGapMs: '2000', // ms gap between loops for short audio
		enableStreakBonus: true
	});

	let soundbites = $state<SoundbiteState[]>([
		{
			id: 0,
			variantType: 'simple_guess',
			simpleGuessAnswers: [],
			multipleChoiceOptions: [createEmptyOption(), createEmptyOption()],
			multipleResponseOptions: [createEmptyOption(), createEmptyOption()],
			imageChoiceOptions: [],
			imageChoiceFiles: [],
			sequenceTracks: [],
			sequenceCorrectTrackIndex: 0,
			sequenceFiles: [],
			rankItems: [],
			rankCorrectOrder: [],
			rankFiles: [],
			multipleMatchItems: [],
			multipleMatchFiles: [],
			prompt: ''
		}
	]);

	// Tags state
	let selectedTags = $state<Array<{ id: string; label: string; slug: string }>>([]);

	// Derived reactive calculation (no side effects)
	const autoSlug = $derived(slugify(title));

	// When title changes and slug hasn't been edited, update manualSlug to match
	$effect(() => {
		if (!slugEdited) {
			manualSlug = autoSlug;
		}
	});

	// Reactive slug that auto-updates from title unless manually edited
	let slug = $derived(slugEdited ? manualSlug : autoSlug);

	function handleSoundbitesChange(newSoundbites: typeof soundbites) {
		soundbites = newSoundbites;
	}

	// Update mode - no conversion needed, both multiple_choice and simple_guess are supported
	function handleModeChange(newMode: 'standard' | 'speed_run') {
		quizMode = newMode;
		// Both multiple_choice and simple_guess are now supported in speed runs
		// No conversion needed
	}

	// Check if any soundbites are unsupported in speed run mode (MC, SG, and IC are allowed)
	let unsupportedVariantCount = $derived(
		quizMode === 'speed_run'
			? soundbites.filter(
					(sb) =>
						sb.variantType !== 'multiple_choice' &&
						sb.variantType !== 'simple_guess' &&
						sb.variantType !== 'image_choice'
				).length
			: 0
	);
</script>

<PageContainer>
	<Heading level={1} class="mb-6">Create Quiz</Heading>

	<form
		method="POST"
		enctype="multipart/form-data"
		class="flex flex-col gap-8"
		use:enhance={({ formData }) => {
			submitting = true;

			// Build complete form data using centralized utility
			const completeFormData = buildQuizFormData({
				title,
				description,
				slug,
				quizMode,
				speedRunConfig: quizMode === 'speed_run' ? speedRunConfig : undefined,
				soundbites: soundbites.map((sb) => ({
					id: sb.id,
					state: sb,
					type: 'new' as const
				})),
				tags: selectedTags
			});

			// Merge into the formData that enhance provides
			// Only skip basic fields that are already in the form HTML
			const skipKeys = [
				'title',
				'description',
				'slug',
				'visibility',
				'quizMode',
				'speedRunConfig',
				'tags'
			];
			completeFormData.forEach((value, key) => {
				if (!skipKeys.includes(key)) {
					formData.append(key, value);
				}
			});

			// Add tags as JSON
			if (selectedTags.length > 0) {
				formData.append('tags', JSON.stringify(selectedTags.map((t) => t.id)));
			}

			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
	>
		<!-- Quiz Mode Selection -->
		<Card variant="flat" padding="md" class="flex flex-col gap-4">
			<FormField label="Quiz Type" id="quizMode">
				<div class="grid grid-cols-2 gap-4">
					<button
						type="button"
						class="relative rounded-xl border-2 p-6 text-left transition-all"
						class:border-accent-emerald-border={quizMode === 'standard'}
						class:bg-accent-emerald-bg={quizMode === 'standard'}
						class:border-border={quizMode !== 'standard'}
						class:bg-surface-elevated={quizMode !== 'standard'}
						onclick={() => handleModeChange('standard')}
					>
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-emerald-bg text-accent-emerald-text"
							>
								<Icon name="quiz" size="lg" />
							</div>
							<div>
								<div class="font-semibold text-text-primary">Standard Quiz</div>
								<div class="text-sm text-text-secondary">Answer all questions, then submit.</div>
							</div>
						</div>
						{#if quizMode === 'standard'}
							<div class="absolute top-4 right-4">
								<Icon name="check-circle" size="lg" class="text-accent-emerald-text" />
							</div>
						{/if}
					</button>

					<button
						type="button"
						class="relative rounded-xl border-2 p-6 text-left transition-all"
						class:border-accent-amber-border={quizMode === 'speed_run'}
						class:bg-accent-amber-bg={quizMode === 'speed_run'}
						class:border-border={quizMode !== 'speed_run'}
						class:bg-surface-elevated={quizMode !== 'speed_run'}
						onclick={() => handleModeChange('speed_run')}
					>
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-accent-amber-bg text-accent-amber-text"
							>
								<Icon name="lightning" size="lg" />
							</div>
							<div>
								<div class="font-semibold text-text-primary">Speed Run</div>
								<div class="text-sm text-text-secondary">
									Race against the clock! One question at a time.
								</div>
							</div>
						</div>
						{#if quizMode === 'speed_run'}
							<div class="absolute top-4 right-4">
								<Icon name="check-circle" size="lg" class="text-accent-amber-text" />
							</div>
						{/if}
					</button>
				</div>
			</FormField>

			{#if quizMode === 'speed_run'}
				<div class="border-accent-amber-border mt-4 rounded-xl border bg-accent-amber-bg p-4">
					<h3 class="mb-3 flex items-center gap-2 font-semibold text-accent-amber-text">
						<Icon name="settings" size="sm" />
						Speed Run Settings
					</h3>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<FormField label="Time Per Question (seconds)" id="questionTimeLimit">
							<FormInput
								id="questionTimeLimit"
								type="number"
								min="3"
								max="60"
								bind:value={speedRunConfig.defaultQuestionTimeLimit}
							/>
						</FormField>

						<FormField label="Reveal Delay (ms)" id="revealDelayMs">
							<FormInput
								id="revealDelayMs"
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
							bind:checked={speedRunConfig.enableStreakBonus}
							class="h-4 w-4 rounded border-border text-accent-amber-text focus:ring-amber-500"
						/>
						<label for="enableStreakBonus" class="text-sm text-accent-amber-text">
							Enable streak bonuses and notifications
						</label>
					</div>

					{#if unsupportedVariantCount > 0}
						<div
							class="mt-3 flex items-start gap-2 rounded-md border border-border bg-accent-red-bg p-3"
						>
							<Icon
								name="alert-circle"
								size="sm"
								class="mt-0.5 flex-shrink-0 text-accent-red-text"
							/>
							<p class="text-sm text-accent-red-text">
								<strong>Warning:</strong> You have {unsupportedVariantCount} question(s) that use unsupported
								variant types. Speed Run mode only supports Multiple Choice, Simple Guess, and Image Choice.
								Please change them to continue.
							</p>
						</div>
					{/if}

					<p class="mt-3 flex items-center gap-2 text-sm text-accent-amber-text">
						<Icon name="info" size="sm" />
						<strong>Note:</strong> Speed Run mode supports Multiple Choice, Simple Guess, and Image Choice
						questions. Simple Guess allows unlimited attempts until time runs out!
					</p>
				</div>
			{/if}
		</Card>

		<Card variant="flat" padding="md" class="flex flex-col gap-4">
			<FormField label="Title" id="title">
				<FormInput
					id="title"
					name="title"
					type="text"
					placeholder="e.g. Mystery Intros"
					bind:value={title}
					required
				/>
			</FormField>

			<FormField label="URL" id="slug">
				<FormInput
					id="slug"
					name="slug"
					type="text"
					placeholder="mystery-intros"
					bind:value={manualSlug}
					oninput={() => {
						slugEdited = true;
					}}
				/>
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
			<input type="hidden" name="quizMode" value={quizMode} />
			{#if quizMode === 'speed_run'}
				{@const speedRunConfigNumeric = {
					defaultQuestionTimeLimit: speedRunConfig.defaultQuestionTimeLimit
						? parseInt(speedRunConfig.defaultQuestionTimeLimit, 10)
						: null,
					revealDelayMs: parseInt(speedRunConfig.revealDelayMs, 10),
					audioLoopGapMs: parseInt(speedRunConfig.audioLoopGapMs, 10),
					enableStreakBonus: speedRunConfig.enableStreakBonus
				}}
				<input type="hidden" name="speedRunConfig" value={JSON.stringify(speedRunConfigNumeric)} />
			{/if}
			<Toggle bind:checked={isPublic} label="Visibility" leftLabel="Unlisted" rightLabel="Public" />
		</Card>

		<!-- Tags Section -->
		<Card variant="flat" padding="md">
			<FormField label="Tags" id="tags">
				<TagInput
					bind:tags={selectedTags}
					placeholder="Add tags to help people find your quiz..."
				/>
				<p class="mt-2 text-xs text-text-muted">
					Type to search existing tags or press Enter to create new ones. Tags help users discover
					your quiz.
				</p>
			</FormField>
		</Card>

		<p class="hidden text-sm text-text-muted">Upload Audio files and add answers for each one.</p>

		<SoundbiteFormSection
			bind:soundbites
			onChange={handleSoundbitesChange}
			startIndex={0}
			allowedVariantTypes={quizMode === 'speed_run'
				? ['multiple_choice', 'simple_guess', 'image_choice']
				: undefined}
		/>

		{#if successMessage}
			{@const isSpeedRun = quizMode === 'speed_run'}
			<div
				class="rounded-md border border-border px-4 py-3 text-sm"
				class:bg-accent-emerald-bg={!isSpeedRun}
				class:text-accent-emerald-text={!isSpeedRun}
				class:bg-accent-amber-bg={isSpeedRun}
				class:text-accent-amber-text={isSpeedRun}
			>
				<div class="flex items-center gap-2">
					<Icon name={isSpeedRun ? 'lightning' : 'check-circle'} size="sm" />
					{successMessage}
				</div>
				{#if form?.slug && data.user?.slug}
					<a class="ml-6 underline" href={resolve(`/${data.user.slug}/${form.slug}`)}>
						{isSpeedRun ? 'View speed run' : 'View quiz'}
					</a>
					<a class="ml-2 underline" href={resolve(`/${data.user.slug}/${form.slug}/edit`)}
						>{isSpeedRun ? 'Edit speed run' : 'Edit quiz'}</a
					>
				{/if}
			</div>
		{/if}

		{#if errorMessage}
			<div
				class="flex items-center gap-2 rounded-md border border-border bg-accent-red-bg px-4 py-3 text-sm text-accent-red-text"
			>
				<Icon name="error" size="sm" />
				{errorMessage}
			</div>
		{/if}

		<div class="mt-6 flex justify-end border-t border-border pt-6">
			<Button
				type="submit"
				variant="primary"
				size="md"
				loading={submitting}
				icon={quizMode === 'speed_run' ? 'lightning' : 'plus'}
			>
				{submitting ? 'Creating...' : quizMode === 'speed_run' ? 'Create Speed Run' : 'Create Quiz'}
			</Button>
		</div>
	</form>
</PageContainer>
