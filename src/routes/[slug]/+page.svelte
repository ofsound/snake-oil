<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData | undefined } = $props();

	let submitting = $state(false);
	let displayName = $state('');
	let errorMessage = $derived(form?.message ?? null);
	let revealAnswers = $derived(form?.success ?? false);

	let signedInLabel = $derived(data.user?.name || data.user?.email || 'Signed-in user');
</script>

<div class="mx-auto max-w-4xl p-8">
	<header class="pb-6">
		<h1 class="mb-1 text-3xl font-semibold">{data.quiz.title}</h1>
		<div class="text-sm">
			{data.quiz.createdAt ? new Date(data.quiz.createdAt).toLocaleDateString() : ''}
			by
			<a
				href="/users/{data.quiz.owner.slug}"
				class="font-semibold text-green-600 hover:text-green-800 hover:underline"
			>
				{data.quiz.owner.name || data.quiz.owner.slug}
			</a>
		</div>
		<div class="mt-6">
			{data.quiz.description}
		</div>
	</header>

	<form
		method="POST"
		class=""
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
	>
		{#if !data.user}
			<section class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
				<div class="">
					<label class="text-sm font-medium text-gray-700" for="displayName">Display name</label>
					<input
						id="displayName"
						name="displayName"
						type="text"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
						placeholder="Anonymous listener"
						bind:value={displayName}
						required
					/>
				</div>
			</section>
		{/if}

		<section class="flex flex-col gap-4 pt-6">
			{#each data.soundbites as soundbite, index (soundbite.id)}
				<div class="flex flex-col gap-6 rounded-sm bg-neutral-50 p-4">
					<input type="hidden" name="soundbiteId" value={soundbite.id} />
					<div class="flex flex-col gap-2">
						<div class="mb-2 text-base font-medium text-gray-700">Audio #{index + 1}</div>
						<audio controls class="w-full">
							<source src={soundbite.trackUrl} type="audio/mpeg" />
							Your browser does not support the audio element.
						</audio>
					</div>
					<div class="flex flex-col gap-2">
						<label class="text-sm font-medium text-gray-700" for={`answer-${soundbite.id}`}>
							Your answer:
						</label>
						<input
							id={`answer-${soundbite.id}`}
							name={`answer-${soundbite.id}`}
							type="text"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
							placeholder=""
						/>
					</div>
					{#if revealAnswers}
						<p class="text-sm text-green-700">Answer: {soundbite.description}</p>
					{/if}
				</div>
			{/each}
		</section>

		{#if errorMessage}
			<div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{errorMessage}
			</div>
		{/if}

		<div class="mt-6 flex justify-end">
			<button
				type="submit"
				class="rounded-md bg-emerald-800 px-5 py-2 text-sm font-medium text-white"
				disabled={submitting}
			>
				{submitting ? 'Submitting...' : 'Submit answers'}
			</button>
		</div>
	</form>
</div>
