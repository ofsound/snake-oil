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

<div class="mx-auto max-w-4xl space-y-8 p-8">
	<header class="space-y-2">
		<h1 class="text-3xl font-semibold">{data.quiz.title}</h1>
		<p class="text-sm text-gray-500">
			{data.quiz.createdAt ? new Date(data.quiz.createdAt).toLocaleDateString() : ''}
			by
			<a
				href="/users/{data.quiz.owner.slug}"
				class="text-blue-600 hover:text-blue-800 hover:underline"
			>
				{data.quiz.owner.name || data.quiz.owner.slug}
			</a>
		</p>
		<p class="rounded-sm border border-stone-200 bg-stone-100 p-4 text-base text-gray-700">
			{data.quiz.description}
		</p>
	</header>

	<form
		method="POST"
		class="space-y-6"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
	>
		{#if !data.user}
			<section class="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
				<h2 class="text-lg font-semibold">Your details</h2>
				<div class="space-y-2">
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

		<section class="space-y-4">
			<h2 class="text-lg font-semibold">Audio Samples</h2>
			<div class="space-y-5">
				{#each data.soundbites as soundbite (soundbite.id)}
					<div class="space-y-3 rounded-lg bg-white p-4">
						<input type="hidden" name="soundbiteId" value={soundbite.id} />
						<div class="space-y-2">
							<p class="text-sm font-medium text-gray-700">{soundbite.trackName}</p>
							<audio controls class="w-full">
								<source src={soundbite.trackUrl} type="audio/mpeg" />
								Your browser does not support the audio element.
							</audio>
						</div>
						<div class="space-y-2">
							<label class="text-sm font-medium text-gray-700" for={`answer-${soundbite.id}`}>
								Your answer
							</label>
							<input
								id={`answer-${soundbite.id}`}
								name={`answer-${soundbite.id}`}
								type="text"
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
								placeholder="Guess the description"
							/>
						</div>
						{#if revealAnswers}
							<p class="text-sm text-green-700">Answer: {soundbite.description}</p>
						{/if}
					</div>
				{/each}
			</div>
		</section>

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
				{submitting ? 'Submitting...' : 'Submit answers'}
			</button>
		</div>
	</form>
</div>
