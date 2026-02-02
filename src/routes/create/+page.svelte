<script lang="ts">
	import { enhance } from '$app/forms';
	import { slugify } from '$lib/utils';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData | undefined } = $props();

	let title = $state('');
	let manualSlug = $state('');
	let description = $state('');
	let slugEdited = $state(false);
	let submitting = $state(false);
	let successMessage = $derived(form?.success ? 'Quiz created successfully.' : null);
	let errorMessage = $derived(form?.message ?? null);

	let nextSoundbiteId = $state(1);
	let soundbites = $state([{ id: 0, description: '' }]);

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
		soundbites = [...soundbites, { id: nextSoundbiteId, description: '' }];
		nextSoundbiteId += 1;
	}

	function removeSoundbite(id: number) {
		if (soundbites.length <= 1) return;
		soundbites = soundbites.filter((soundbite) => soundbite.id !== id);
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
			return async ({ update, result }) => {
				submitting = false;
				await update();
			};
		}}
	>
		<div class="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
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
		</div>

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
				{#each soundbites as soundbite (soundbite.id)}
					<div class="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium text-gray-700">SoundBite</span>
							<button
								type="button"
								class="text-xs text-gray-500 hover:text-gray-700"
								onclick={() => removeSoundbite(soundbite.id)}
								disabled={soundbites.length <= 1}
							>
								Remove
							</button>
						</div>
						<div class="grid gap-3 md:grid-cols-[1.2fr_1fr]">
							<div class="space-y-2">
								<label
									class="text-sm font-medium text-gray-700"
									for={`soundbite-desc-${soundbite.id}`}
								>
									Answer
								</label>
								<input
									id={`soundbite-desc-${soundbite.id}`}
									name="soundbiteDescription"
									type="text"
									class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
									placeholder=""
									bind:value={soundbite.description}
									required
								/>
							</div>
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
						</div>
					</div>
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
