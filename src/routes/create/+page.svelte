<script lang="ts">
	import { enhance } from '$app/forms';
	import { slugify } from '$lib/utils';
	import Card from '$lib/components/Card.svelte';
	import SoundbiteFormSection from '$lib/components/SoundbiteFormSection.svelte';
	import Button from '$lib/components/Button.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import FormInput from '$lib/components/FormInput.svelte';
	import FormTextarea from '$lib/components/FormTextarea.svelte';
	import type { ActionData } from './$types';
	import type {
		VariantType,
		MultipleChoiceOption,
		MultipleResponseOption,
		ImageChoiceOption,
		SequenceTrack,
		RankItem
	} from '$lib/variant-types';
	import { createEmptyOption } from '$lib/variant-client-utils';
	import Heading from '$lib/components/Heading.svelte';

	let { form }: { form: ActionData | undefined } = $props();

	let title = $state('');
	let manualSlug = $state('');
	let description = $state('');
	let slugEdited = $state(false);
	let submitting = $state(false);
	let successMessage = $derived(form?.success ? 'Quiz created successfully.' : null);
	let errorMessage = $derived(form?.message ?? null);

	// Quiz mode selection
	let quizMode = $state<'standard' | 'speed_run'>('standard');

	// Speed run configuration
	let speedRunConfig = $state({
		defaultQuestionTimeLimit: 10, // seconds per question
		revealDelayMs: 3000, // ms to show answer before advancing
		audioLoopGapMs: 2000, // ms gap between loops for short audio
		enableStreakBonus: true
	});

	type SoundbiteState = {
		id: number;
		variantType: VariantType;
		simpleGuessAnswer: string;
		multipleChoiceOptions: MultipleChoiceOption[];
		multipleResponseOptions: MultipleResponseOption[];
		imageChoiceOptions: ImageChoiceOption[];
		imageChoiceFiles: (File | null)[];
		sequenceTracks: SequenceTrack[];
		sequenceCorrectTrackIndex: number;
		sequencePrompt: string;
		sequenceFiles: File[];
		rankItems: RankItem[];
		rankCorrectOrder: number[];
		rankPrompt: string;
		rankFiles: File[];
		question: string;
		questionTimeLimit?: number; // Optional per-question override
	};

	let nextSoundbiteId = $state(1);
	let soundbites = $state<SoundbiteState[]>([
		{
			id: 0,
			variantType: 'simple_guess',
			simpleGuessAnswer: '',
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
			question: ''
		}
	]);

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

	// Update mode and convert soundbites if needed
	function handleModeChange(newMode: 'standard' | 'speed_run') {
		quizMode = newMode;

		// Convert all soundbites to multiple_choice when switching to speed run
		if (newMode === 'speed_run') {
			soundbites = soundbites.map((sb) => {
				if (sb.variantType !== 'multiple_choice') {
					return {
						...sb,
						variantType: 'multiple_choice' as VariantType,
						multipleChoiceOptions:
							sb.multipleChoiceOptions.length >= 2
								? sb.multipleChoiceOptions
								: [createEmptyOption(), createEmptyOption()]
					};
				}
				return sb;
			});
		}
	}

	// Check if any soundbites are not multiple_choice in speed run mode
	let nonMultipleChoiceCount = $derived(
		quizMode === 'speed_run'
			? soundbites.filter((sb) => sb.variantType !== 'multiple_choice').length
			: 0
	);
</script>

<Heading level={1} class="mb-6">Create Quiz</Heading>

<form
	method="POST"
	enctype="multipart/form-data"
	class="flex flex-col gap-8"
	use:enhance={({ formData }) => {
		submitting = true;

		// Add quiz mode
		formData.append('quizMode', quizMode);

		// Add speed run config if applicable
		if (quizMode === 'speed_run') {
			formData.append('speedRunConfig', JSON.stringify(speedRunConfig));
		}

		// Debug: Log what's in the form data before modifications
		console.log('[Create Quiz] Form data before modifications:');
		for (const [key, value] of formData.entries()) {
			console.log(`  ${key}: ${value instanceof File ? `File(${value.name})` : value}`);
		}

		// Add sequence files to form data
		soundbites.forEach((sb, index) => {
			if (sb.variantType === 'sequence') {
				console.log(
					`[Create Quiz] Adding ${sb.sequenceFiles.length} sequence files for soundbite ${index}`
				);
				sb.sequenceFiles.forEach((file) => {
					formData.append(`sequenceFiles-${index}`, file);
				});
			}
		});

		// Add rank files to form data
		soundbites.forEach((sb, index) => {
			if (sb.variantType === 'rank') {
				console.log(
					`[Create Quiz] Adding ${sb.rankFiles.length} rank files for soundbite ${index}`
				);
				sb.rankFiles.forEach((file) => {
					formData.append(`rankFiles-${index}`, file);
				});
			}
		});

		// Add image choice files to form data
		// Send files in order matching the options array, with empty Blob for placeholders
		soundbites.forEach((sb, index) => {
			if (sb.variantType === 'image_choice') {
				const filesToSend = sb.imageChoiceFiles || [];
				console.log(
					`[Create Quiz] Soundbite ${index}: ${sb.imageChoiceOptions.length} options, ${filesToSend.length} files in imageChoiceFiles`
				);

				// Log the options and files for debugging
				sb.imageChoiceOptions.forEach((opt, i) => {
					const file = filesToSend[i];
					console.log(
						`[Create Quiz] Option ${i}: id=${opt.id}, hasFile=${!!file}, fileName=${file?.name}, fileSize=${file?.size}`
					);
				});

				// Send one file per option
				for (let optionIndex = 0; optionIndex < sb.imageChoiceOptions.length; optionIndex++) {
					const file = filesToSend[optionIndex];
					if (file && file.size > 0) {
						// New file to upload
						formData.append(`imageChoiceFiles-${index}`, file);
						console.log(
							`[Create Quiz] Appending file for soundbite ${index}, option ${optionIndex}: ${file.name} (${file.size} bytes)`
						);
					} else {
						// No new file - send empty blob as placeholder
						const placeholder = new Blob([], { type: 'application/octet-stream' });
						formData.append(`imageChoiceFiles-${index}`, placeholder);
						console.log(
							`[Create Quiz] Appending placeholder for soundbite ${index}, option ${optionIndex}`
						);
					}
				}
			}
		});

		// Debug: Log what's in the form data after modifications
		console.log('[Create Quiz] Form data after modifications:');
		for (const [key, value] of formData.entries()) {
			console.log(`  ${key}: ${value instanceof File ? `File(${value.name})` : value}`);
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
					class:border-emerald-500={quizMode === 'standard'}
					class:bg-emerald-50={quizMode === 'standard'}
					class:border-gray-200={quizMode !== 'standard'}
					class:bg-white={quizMode !== 'standard'}
					onclick={() => handleModeChange('standard')}
				>
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
						>
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
						</div>
						<div>
							<div class="font-semibold text-gray-900">Standard Quiz</div>
							<div class="text-sm text-gray-600">Answer all questions, then submit</div>
						</div>
					</div>
					{#if quizMode === 'standard'}
						<div class="absolute top-4 right-4">
							<svg class="h-6 w-6 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
					{/if}
				</button>

				<button
					type="button"
					class="relative rounded-xl border-2 p-6 text-left transition-all"
					class:border-amber-500={quizMode === 'speed_run'}
					class:bg-amber-50={quizMode === 'speed_run'}
					class:border-gray-200={quizMode !== 'speed_run'}
					class:bg-white={quizMode !== 'speed_run'}
					onclick={() => handleModeChange('speed_run')}
				>
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600"
						>
							<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 10V3L4 14h7v7l9-11h-7z"
								/>
							</svg>
						</div>
						<div>
							<div class="font-semibold text-gray-900">Speed Run ⚡</div>
							<div class="text-sm text-gray-600">
								Race against the clock! One question at a time.
							</div>
						</div>
					</div>
					{#if quizMode === 'speed_run'}
						<div class="absolute top-4 right-4">
							<svg class="h-6 w-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
									clip-rule="evenodd"
								/>
							</svg>
						</div>
					{/if}
				</button>
			</div>
		</FormField>

		{#if quizMode === 'speed_run'}
			<div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
				<h3 class="mb-3 font-semibold text-amber-900">Speed Run Settings</h3>
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
						class="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
					/>
					<label for="enableStreakBonus" class="text-sm text-amber-900">
						Enable streak bonuses and notifications
					</label>
				</div>

				{#if nonMultipleChoiceCount > 0}
					<div class="mt-3 rounded-md border border-red-300 bg-red-50 p-3">
						<p class="text-sm text-red-700">
							<strong>Warning:</strong> You have {nonMultipleChoiceCount} question(s) that are not Multiple
							Choice. Please remove them or the server will reject the submission.
						</p>
					</div>
				{/if}

				<p class="mt-3 text-sm text-amber-700">
					<strong>Note:</strong> Speed Run mode only supports Multiple Choice questions. New questions
					will default to Multiple Choice.
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
	</Card>

	<p class="hidden text-sm text-gray-500">Upload Audio files and add answers for each one.</p>

	<SoundbiteFormSection
		bind:soundbites
		variantTypeName="soundbiteVariantType"
		variantConfigName="soundbiteVariantConfig"
		questionName="soundbiteQuestion"
		fileInputName="soundbiteFile"
		fileInputRequired={true}
		onChange={handleSoundbitesChange}
		forceVariantType={quizMode === 'speed_run' ? 'multiple_choice' : undefined}
	/>

	{#if successMessage}
		<div class="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
			{successMessage}
			{#if form?.slug}
				<a class="ml-2 underline" href={`/${form.slug}`}>View quiz</a>
			{/if}
			{#if form?.quizId}
				<a class="ml-2 underline" href={`/quizzes/${form.quizId}`}>Manage quiz</a>
			{/if}
			{#if form?.speedRunSlug}
				<a class="ml-2 underline" href={`/speed-run/${form.speedRunSlug}`}>Play Speed Run</a>
			{/if}
		</div>
	{/if}

	{#if errorMessage}
		<div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{errorMessage}
		</div>
	{/if}

	<div class="mt-6 flex justify-end border-t border-neutral-200 pt-6">
		<Button type="submit" variant="primary" size="md" loading={submitting}>
			{submitting ? 'Creating...' : quizMode === 'speed_run' ? 'Create Speed Run' : 'Create Quiz'}
		</Button>
	</div>
</form>
