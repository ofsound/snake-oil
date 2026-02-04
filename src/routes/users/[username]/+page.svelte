<script lang="ts">
	import Heading from '$lib/components/Heading.svelte';
	import QuizRow from '$lib/components/QuizRow.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let user = $derived(data.user);
	let quizzes = $derived(data.quizzes ?? []);
</script>

<div class="mb-8 flex flex-col">
	{#if user.image}
		<div class="mb-4 h-32 w-32">
			<img
				src={user.image}
				alt="{user.name || 'User'}'s profile picture"
				class="h-32 w-32 rounded-full object-cover"
			/>
		</div>
	{/if}
	<Heading level={1} class="mb-2">
		{user.name || 'User Profile'}
	</Heading>
	<div class="">
		<span class=" text-gray-600">Joined:</span>
		<span class=" text-gray-800">
			{new Date(user.createdAt).toLocaleDateString()}
		</span>
	</div>
</div>

<div class="mb-8">
	<Heading level={2} class="mb-6">Quizzes</Heading>

	{#if quizzes.length > 0}
		<div class="flex flex-col gap-3">
			{#each quizzes as quiz (quiz.id)}
				<QuizRow {quiz} showOwner={false} />
			{/each}
		</div>
	{:else}
		<div class="rounded-md bg-gray-50 p-8 text-center">
			<p class="mb-4 text-gray-600">This user hasn't created any quizzes yet.</p>
		</div>
	{/if}
</div>
