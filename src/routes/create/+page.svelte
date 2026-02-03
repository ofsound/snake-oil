<script lang="ts">
	import { enhance } from '$app/forms';
	import { slugify } from '$lib/utils';
	import Card from '$lib/components/Card.svelte';
	import VariantSelector from '$lib/components/VariantSelector.svelte';
	import SimpleGuessEditor from '$lib/components/SimpleGuessEditor.svelte';
	import MultipleChoiceEditor from '$lib/components/MultipleChoiceEditor.svelte';
	import MultipleResponseEditor from '$lib/components/MultipleResponseEditor.svelte';
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

	function addSoundbite() {
		soundbites = [
			...soundbites,
			{
				id: nextSoundbiteId,
				variantType: 'simple_guess',
				simpleGuessAnswer: '',
				multipleChoiceOptions: [createEmptyOption(), createEmptyOption()],
				multipleResponseOptions: [createEmptyOption(), createEmptyOption()],
				question: ''
			}
		];
		nextSoundbiteId += 1;
	}

	function removeSoundbite(id: number) {
		if (soundbites.length <= 1) return;
		soundbites = soundbites.filter((soundbite) => soundbite.id !== id);
	}

	function updateVariantType(id: number, variantType: VariantType) {
		soundbites = soundbites.map((sb) => (sb.id === id ? { ...sb, variantType } : sb));
	}

	function updateSimpleGuessAnswer(id: number, answer: string) {
		soundbites = soundbites.map((sb) => (sb.id === id ? { ...sb, simpleGuessAnswer: answer } : sb));
	}

	function updateMultipleChoiceOptions(id: number, options: MultipleChoiceOption[]) {
		soundbites = soundbites.map((sb) =>
			sb.id === id ? { ...sb, multipleChoiceOptions: options } : sb
		);
	}

	function updateMultipleResponseOptions(id: number, options: MultipleResponseOption[]) {
		soundbites = soundbites.map((sb) =>
			sb.id === id ? { ...sb, multipleResponseOptions: options } : sb
		);
	}

	function updateQuestion(id: number, question: string) {
		soundbites = soundbites.map((sb) => (sb.id === id ? { ...sb, question } : sb));
	}
</script>

<div class="mx-auto max-w-3xl space-y-6 p-8">
	<header class="space-y-2">
		<h1 class="text-3xl font-semibold">Create Quiz</h1>
		<p class="text-sm text-gray-500">Upload Audio files and add answers for each one.</p>
	</header>

	<form
		method="POST"
		enctype="multipart/form-data"
		class="space-y-6"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
	>
		<Card variant="elevated" padding="md">
			<div class="space-y-2">
				<label class="mb-1 text-sm font-medium text-gray-700" for="title">Quiz title</label>
				<input
					id="title"
					name="title"
					type="text"
					placeholder="e.g. Mystery Intros"
					class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					bind:value={title}
					required
				/>
			</div>

			<div class="space-y-2">
				<label class="mb-1 text-sm font-medium text-gray-700" for="slug">URL</label>
				<input
					id="slug"
					name="slug"
					type="text"
					placeholder="mystery-intros"
					class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					bind:value={manualSlug}
					oninput={() => {
						slugEdited = true;
					}}
				/>
				<p class="hidden text-xs text-gray-500">
					This becomes the public URL: /{slug || 'your-quiz'}.
				</p>
			</div>

			<div class="space-y-2">
				<label class="mb-1 text-sm font-medium text-gray-700" for="description">Description</label>
				<textarea
					id="description"
					name="description"
					rows="4"
					class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					placeholder=""
					bind:value={description}
					required
				></textarea>
			</div>
		</Card>

		<section class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold">SoundBites</h2>
				<button
					type="button"
					class="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
					onclick={addSoundbite}
				>
					Add SoundBite
				</button>
			</div>

			<div class="space-y-4">
				{#each soundbites as soundbite, index (soundbite.id)}
					<Card variant="elevated" padding="sm">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-gray-700">SoundBite #{index + 1}</span>
							<button
								type="button"
								class="text-xs text-gray-500 hover:text-gray-700"
								onclick={() => removeSoundbite(soundbite.id)}
								disabled={soundbites.length <= 1}
							>
								Remove
							</button>
						</div>

						<div class="grid gap-4 md:grid-cols-2">
							<div class="space-y-2">
								<label
									class="text-sm font-medium text-gray-700"
									for={`soundbite-file-${soundbite.id}`}
								>
									MP3 file
								</label>
								<input
									id={`soundbite-file-${soundbite.id}`}
									name="soundbiteFile"
									type="file"
									accept="audio/mpeg,.mp3"
									class="w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5"
									required
								/>
							</div>

							<VariantSelector
								id={`variant-type-${soundbite.id}`}
								value={soundbite.variantType}
								onchange={(value) => updateVariantType(soundbite.id, value)}
							/>
						</div>

						<div class="space-y-2">
							<label class="text-sm font-medium text-gray-700" for={`question-${soundbite.id}`}>
								Question (optional)
							</label>
							<textarea
								id={`question-${soundbite.id}`}
								name="soundbiteQuestion"
								rows="2"
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
								placeholder="e.g., What guitar is being played?"
								value={soundbite.question}
								oninput={(e) => updateQuestion(soundbite.id, e.currentTarget.value)}
							></textarea>
							<p class="text-xs text-gray-500">
								Appears below the audio player to guide quiz takers.
							</p>
						</div>

						<!-- Hidden inputs to send variant data to server -->
						<input type="hidden" name="soundbiteVariantType" value={soundbite.variantType} />

						{#if soundbite.variantType === 'simple_guess'}
							<SimpleGuessEditor
								id={`simple-guess-${soundbite.id}`}
								value={soundbite.simpleGuessAnswer}
								oninput={(value) => updateSimpleGuessAnswer(soundbite.id, value)}
							/>
							<input
								type="hidden"
								name="soundbiteVariantConfig"
								value={JSON.stringify({
									type: 'simple_guess',
									correctAnswer: soundbite.simpleGuessAnswer
								})}
							/>
						{:else if soundbite.variantType === 'multiple_choice'}
							<MultipleChoiceEditor
								idPrefix={`mc-${soundbite.id}`}
								options={soundbite.multipleChoiceOptions}
								onchange={(options) => updateMultipleChoiceOptions(soundbite.id, options)}
							/>
							<input
								type="hidden"
								name="soundbiteVariantConfig"
								value={JSON.stringify({
									type: 'multiple_choice',
									options: soundbite.multipleChoiceOptions
								})}
							/>
						{:else if soundbite.variantType === 'multiple_response'}
							<MultipleResponseEditor
								idPrefix={`mr-${soundbite.id}`}
								options={soundbite.multipleResponseOptions}
								onchange={(options) => updateMultipleResponseOptions(soundbite.id, options)}
							/>
							<input
								type="hidden"
								name="soundbiteVariantConfig"
								value={JSON.stringify({
									type: 'multiple_response',
									options: soundbite.multipleResponseOptions
								})}
							/>
						{/if}
					</Card>
				{/each}
			</div>
		</section>

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
			<button
				type="submit"
				class="rounded-md bg-emerald-800 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
				disabled={submitting}
			>
				{submitting ? 'Creating...' : 'Create quiz'}
			</button>
		</div>
	</form>
</div>
