<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import Card from '$lib/components/Card.svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData | undefined } = $props();

	let nextNewSoundbiteId = $state(0);
	let newSoundbites = $state<{ id: number; description: string }[]>([]);

	let submitting = $state(false);
	let successMessage = $derived(form?.success ? 'Quiz updated successfully.' : null);
	let errorMessage = $derived(form?.message ?? null);

	// Track the quiz ID to prevent resetting form fields when updating the same quiz
	let lastQuizId = $state<string>('');

	// Local state for form fields - initialize from data once
	let title = $state('');
	let slug = $state('');
	let description = $state('');
	let existingSoundbiteDescriptions = $state<Record<string, string>>({});

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
				existingSoundbiteDescriptions = Object.fromEntries(
					data.soundbites.map((sb) => [sb.id, sb.description])
				);
				lastQuizId = quizId;
			});
		}
	});

	function addNewSoundbite() {
		newSoundbites = [...newSoundbites, { id: nextNewSoundbiteId, description: '' }];
		nextNewSoundbiteId += 1;
	}

	function removeNewSoundbite(id: number) {
		newSoundbites = newSoundbites.filter((soundbite) => soundbite.id !== id);
	}

	const getSubmitterLabel = (entry: PageData['answers'][number]) =>
		entry.userName || entry.userEmail || entry.displayName || 'Anonymous';

	const getAnswer = (answers: Record<string, string> | null, soundbiteId: string) =>
		answers?.[soundbiteId] ?? '';
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
				<button
					type="submit"
					class="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
				>
					Delete Quiz
				</button>
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
					<Card variant="elevated" padding="sm" class="space-y-3">
						<input type="hidden" name="existingSoundbiteId" value={soundbite.id} />
						<div class="flex items-center justify-between">
							<p class="text-sm font-medium text-gray-700">{soundbite.trackName}</p>
							<label class="flex items-center gap-2 text-xs text-gray-500">
								<input type="checkbox" name="existingSoundbiteRemove" value={soundbite.id} />
								Remove
							</label>
						</div>
						<div class="grid gap-3 md:grid-cols-[1.2fr_1fr]">
							<div class="space-y-2">
								<label
									class="text-sm font-medium text-gray-700"
									for={`existing-desc-${soundbite.id}`}
								>
									Description
								</label>
								<input
									id={`existing-desc-${soundbite.id}`}
									name="existingSoundbiteDescription"
									type="text"
									class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
									bind:value={existingSoundbiteDescriptions[soundbite.id]}
									required
								/>
							</div>
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
						</div>
					</Card>
				{/each}
			</div>
		</section>

		<section class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold">Add new SoundBites</h2>
				<button
					type="button"
					class="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
					onclick={addNewSoundbite}
				>
					Add SoundBite
				</button>
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
							<div class="grid gap-3 md:grid-cols-[1.2fr_1fr]">
								<div class="space-y-2">
									<label class="text-sm font-medium text-gray-700" for={`new-desc-${soundbite.id}`}>
										Description
									</label>
									<input
										id={`new-desc-${soundbite.id}`}
										name="newSoundbiteDescription"
										type="text"
										class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
										placeholder="Short hint"
										bind:value={soundbite.description}
										required
									/>
								</div>
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
							</div>
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
			<button
				type="submit"
				class="rounded-md bg-black px-5 py-2 text-sm font-medium text-white"
				disabled={submitting}
			>
				{submitting ? 'Saving...' : 'Save changes'}
			</button>
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
							<span>
								{submission.createdAt ? new Date(submission.createdAt).toLocaleString() : ''}
							</span>
						</div>
						<div class="space-y-2">
							{#each data.soundbites as soundbite (soundbite.id)}
								<div class="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
									<span class="font-medium">{soundbite.trackName}:</span>
									<span class="ml-2 text-gray-700">
										{getAnswer(submission.answers as Record<string, string>, soundbite.id)}
									</span>
								</div>
							{/each}
						</div>
					</Card>
				{/each}
			</div>
		{/if}
	</section>
</div>
