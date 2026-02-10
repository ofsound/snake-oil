<script lang="ts">
	import { resolve } from '$app/paths';

	import Button from '$lib/components/Button.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import QuizRow from '$lib/components/QuizRow.svelte';

	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let quizzes = $derived(data.quizzes ?? []);
</script>

<PageContainer>
	<section class="mx-auto w-full max-w-4xl">
		<div class="flex flex-col items-center text-center">
			<div class="bg-purple mt-6 w-full">
				<Button
					href={resolve('/create')}
					variant="glow"
					size="2xl"
					class="mx-auto block w-max px-18 py-12 shadow-md shadow-emerald-500/30 hover:shadow-emerald-500/50"
				>
					Create a Quiz &nbsp; ✨
				</Button>
			</div>
		</div>
	</section>

	<div class="mx-auto mt-16 max-w-4xl">
		<h2 class="my-6 mt-10 text-center text-xl font-bold text-text-primary">Recent Quizzes</h2>

		{#if quizzes.length > 0}
			<div class="flex flex-col gap-3">
				{#each quizzes as quiz (quiz.id)}
					<QuizRow {quiz} showCreator={true} />
				{/each}
			</div>
			<div class="mt-10 text-center">
				<Button href="/quizzes" variant="accent" size="lg">Browse All</Button>
			</div>
		{:else}
			<div class="rounded-xl border border-border bg-surface-muted p-8 text-center">
				<div class="mb-3 text-4xl">📝</div>
				<p class="text-text-secondary">No quizzes available yet. Check back soon!</p>
			</div>
		{/if}
	</div>
</PageContainer>
