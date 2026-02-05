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
		SequenceTrack
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

	type SoundbiteState = {
		id: number;
		variantType: VariantType;
		simpleGuessAnswer: string;
		multipleChoiceOptions: MultipleChoiceOption[];
		multipleResponseOptions: MultipleResponseOption[];
		sequenceTracks: SequenceTrack[];
		sequenceCorrectTrackIndex: number;
		sequencePrompt: string;
		sequenceFiles: File[];
		question: string;
	};

	let nextSoundbiteId = $state(1);
	let soundbites = $state<SoundbiteState[]>([
		{
			id: 0,
			variantType: 'simple_guess',
			simpleGuessAnswer: '',
			multipleChoiceOptions: [createEmptyOption(), createEmptyOption()],
			multipleResponseOptions: [createEmptyOption(), createEmptyOption()],
			sequenceTracks: [],
			sequenceCorrectTrackIndex: 0,
			sequencePrompt: '',
			sequenceFiles: [],
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
</script>

<Heading level={1} class="mb-6">Create Quiz</Heading>

<form
	method="POST"
	enctype="multipart/form-data"
	class="flex flex-col gap-8"
	use:enhance={({ formData }) => {
		submitting = true;

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
		</div>
	{/if}

	{#if errorMessage}
		<div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{errorMessage}
		</div>
	{/if}

	<div class="mt-6 flex justify-end border-t border-neutral-200 pt-6">
		<Button type="submit" variant="primary" size="md" loading={submitting}>
			{submitting ? 'Creating...' : 'Create quiz'}
		</Button>
	</div>
</form>
