<script lang="ts">
	import { enhance } from '$app/forms';
	import { slugify } from '$lib/utils';
	import Card from '$lib/components/Card.svelte';
	import SoundbiteFormSection from '$lib/components/SoundbiteFormSection.svelte';
	import Button from '$lib/components/Button.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import type { ActionData } from './$types';
	import type {
		VariantType,
		MultipleChoiceOption,
		MultipleResponseOption
	} from '$lib/variant-types';
	import { createEmptyOption } from '$lib/variant-client-utils';

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

<h1 class="mb-6 text-3xl font-bold">Create Quiz</h1>

<form
	method="POST"
	enctype="multipart/form-data"
	class="flex flex-col gap-8"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update();
		};
	}}
>
	<Card variant="flat" padding="md" class="flex flex-col gap-4">
		<FormField label="Title" id="title">
			<input
				id="title"
				name="title"
				type="text"
				placeholder="e.g. Mystery Intros"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
				bind:value={title}
				required
			/>
		</FormField>

		<FormField label="URL" id="slug">
			<input
				id="slug"
				name="slug"
				type="text"
				placeholder="mystery-intros"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
				bind:value={manualSlug}
				oninput={() => {
					slugEdited = true;
				}}
			/>
		</FormField>

		<FormField label="Description" id="description">
			<textarea
				id="description"
				name="description"
				rows="4"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
				placeholder=""
				bind:value={description}
				required
			></textarea>
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

	<div class="flex justify-end">
		<Button type="submit" variant="primary" size="md" loading={submitting}>
			{submitting ? 'Creating...' : 'Create quiz'}
		</Button>
	</div>
</form>
