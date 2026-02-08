<script lang="ts">
	import { resolve } from '$app/paths';

	import Button from '$lib/components/Button.svelte';
	import QuizRow from '$lib/components/QuizRow.svelte';

	import type { PageProps } from './$types';
	let { data }: PageProps = $props();

	let quizzes = $derived(data.quizzes ?? []);
</script>

<Button
	href={resolve('/create')}
	variant="primary"
	size="lg"
	class="mx-auto my-12 mb-20 block w-max p-14 px-20 text-xl font-semibold text-shadow-sm"
	>Create a Quiz</Button
>

<div class="my-8">
	{#if quizzes.length > 0}
		<div class="flex flex-col gap-3">
			{#each quizzes as quiz (quiz.id)}
				<QuizRow {quiz} showOwner={true} />
			{/each}
		</div>
	{:else}
		<div class="rounded-md bg-gray-50 p-8 text-center">
			<p class="text-gray-600">No quizzes available yet. Check back soon!</p>
		</div>
	{/if}
</div>

<div class="flex justify-center">
	<Button variant="accent" size="md" href="/quizzes">Browse All</Button>
</div>
