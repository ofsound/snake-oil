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
	let user = $derived(data.user);
</script>

<PageContainer>
	<section class="mx-auto w-full max-w-4xl dark:bg-gray-900">
		<div class="flex flex-col items-center text-center">
			<div
				class="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-3 dark:border-gray-700 dark:bg-gray-800"
			>
				{#if (user?.quizCount ?? 0) > 0}
					<p class="text-sm text-gray-600 dark:text-gray-400">
						<span>✨</span>
						<span>Welcome back, <span class="font-bold">{user?.name}</span>!</span>
						You've created
						<span class="font-bold text-emerald-600 dark:text-emerald-400">{user?.quizCount}</span>
						quiz{(user?.quizCount ?? 0) === 1 ? '' : 'zes'} so far.
					</p>
				{:else}
					<p class="text-sm text-gray-600 dark:text-gray-400">Ready to create your first quiz?</p>
					<div class="flex justify-center gap-3">
						<Button href="/quizzes" variant="outline" size="sm">Browse Examples</Button>
						<Button href={resolve('/create')} variant="primary" size="sm">Create Now</Button>
					</div>
				{/if}
			</div>
			<div class="bg-purple mt-10 w-full">
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
		<h2 class="my-6 mt-10 text-center text-xl font-bold text-gray-900 dark:text-white">
			Recent Quizzes
		</h2>

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
			<div
				class="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800"
			>
				<div class="mb-3 text-4xl">📝</div>
				<p class="text-gray-600 dark:text-gray-400">No quizzes available yet. Check back soon!</p>
			</div>
		{/if}
	</div>
</PageContainer>
