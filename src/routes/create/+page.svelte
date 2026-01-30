<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData | undefined } = $props();

	let title = $state('');
	let slug = $state('');
	let description = $state('');
	let slugEdited = $state(false);
	let submitting = $state(false);
	let successMessage = $derived.by(() => (form?.success ? 'Quiz created successfully.' : null));
	let errorMessage = $derived.by(() => form?.message ?? null);

	let nextSoundbiteId = $state(1);
	let soundbites = $state([{ id: 0, description: '' }]);

	const slugify = (value: string) =>
		value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');

	function handleTitleInput(event: Event) {
		title = (event.target as HTMLInputElement).value;
		if (!slugEdited) {
			slug = slugify(title);
		}
	}

	function handleSlugInput(event: Event) {
		slugEdited = true;
		slug = (event.target as HTMLInputElement).value;
	}

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
		<p class="text-sm text-gray-500">Upload SoundBites and add descriptions for each one.</p>
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
				<label class="text-sm font-medium text-gray-700" for="title">Quiz title</label>
				<input
					id="title"
					name="title"
					type="text"
					placeholder="e.g. Mystery Intros"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					oninput={handleTitleInput}
					required
				/>
			</div>

			<div class="space-y-2">
				<label class="text-sm font-medium text-gray-700" for="slug">Slug</label>
				<input
					id="slug"
					name="slug"
					type="text"
					placeholder="mystery-intros"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					oninput={handleSlugInput}
					bind:value={slug}
					required
				/>
				<p class="text-xs text-gray-500">This becomes the public URL: /{slug || 'your-quiz'}.</p>
			</div>

			<div class="space-y-2">
				<label class="text-sm font-medium text-gray-700" for="description">Description</label>
				<textarea
					id="description"
					name="description"
					rows="4"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
					placeholder="Tell listeners what to expect from this quiz."
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
									Description
								</label>
								<input
									id={`soundbite-desc-${soundbite.id}`}
									name="soundbiteDescription"
									type="text"
									class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
									placeholder="Short hint for this audio clip"
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
				class="rounded-md bg-black px-5 py-2 text-sm font-medium text-white"
				disabled={submitting}
			>
				{submitting ? 'Creating...' : 'Create quiz'}
			</button>
		</div>
	</form>
</div>
