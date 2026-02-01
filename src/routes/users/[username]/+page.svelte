<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let user = $derived(data.user);
	let quizzes = $derived(data.quizzes ?? []);
</script>

<div class="mx-auto max-w-3xl p-8">
	<div class="mb-8 flex flex-col rounded-lg bg-white p-6 shadow-md">
		{#if user.image}
			<div class="mb-4 h-32 w-32">
				<img
					src={user.image}
					alt="{user.name || 'User'}'s profile picture"
					class="h-32 w-32 rounded-full object-cover"
				/>
			</div>
		{/if}
		<h1 class="mb-2 text-3xl text-gray-700">
			{user.name || 'User Profile'}
		</h1>
		<p class="mb-4 text-gray-600">@{user.slug}</p>
		<div class="flex gap-2 rounded-md">
			<span class="font-semibold text-gray-600">Member since:</span>
			<span class="font-medium text-gray-800">
				{new Date(user.createdAt).toLocaleDateString()}
			</span>
		</div>
		<div class="mt-2 flex gap-2 rounded-md">
			<span class="font-semibold text-gray-600">Profile URL:</span>
			<span class="font-mono text-sm text-gray-800">/users/{user.slug}</span>
		</div>
	</div>

	<div class="mb-8 rounded-sm border border-gray-200 bg-white p-6">
		<h2 class="mb-6 border-b border-gray-200 pb-2 text-2xl text-gray-700">Quizzes</h2>
		{#if quizzes.length > 0}
			<div class="flex flex-col gap-3">
				{#each quizzes as quiz (quiz.id)}
					<a
						href="/quizzes/{quiz.id}"
						class="flex items-center justify-between rounded-md border-none bg-gray-50 px-3 py-2 text-white transition-colors hover:bg-gray-100"
					>
						<div class="flex flex-col">
							<h3 class="font-semibold text-gray-800">{quiz.title}</h3>
							<div class="text-sm text-gray-600">{quiz.description}</div>
						</div>
						<div class="text-xs text-gray-500">
							{new Date(quiz.createdAt).toLocaleDateString()}
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="rounded-md bg-gray-50 p-8 text-center">
				<p class="mb-4 text-gray-600">This user hasn't created any quizzes yet.</p>
			</div>
		{/if}
	</div>
</div>
