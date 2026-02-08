<script lang="ts">
	import { resolve } from '$app/paths';

	import Button from '$lib/components/Button.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import QuizRow from '$lib/components/QuizRow.svelte';

	import type { PageProps } from './$types';
	let { data }: PageProps = $props();

	let quizzes = $derived(data.quizzes ?? []);
</script>

<PageContainer>
	<div class="mx-auto my-12 mb-20 block w-max">
		<Button href={resolve('/create')} variant="primary" size="lg">Create a Quiz</Button>
	</div>

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
</PageContainer>
