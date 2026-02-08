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

<!-- Clean, minimal hero for logged-in users -->
<section class="w-full bg-white py-8 dark:bg-gray-900">
	<div class="mx-auto max-w-4xl px-6">
		<div class="flex flex-col items-center text-center">
			<!-- Welcome badge -->

			<!-- Mini Stats -->
			<div
				class="rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800"
			>
				{#if (user?.quizCount ?? 0) > 0}
					<p class="text-sm text-gray-600 dark:text-gray-400">
						<span>✨</span>
						<span>Welcome back, {user?.name}</span>

						You've created
						<span class="font-bold text-emerald-600 dark:text-emerald-400">{user?.quizCount}</span>
						quiz{(user?.quizCount ?? 0) === 1 ? '' : 'zes'} so far
					</p>
				{:else}
					<p class="text-sm text-gray-600 dark:text-gray-400">Ready to create your first quiz?</p>
					<div class="flex justify-center gap-3">
						<Button href="/quizzes" variant="outline" size="sm">Browse Examples</Button>
						<Button href={resolve('/create')} variant="primary" size="sm">Create Now</Button>
					</div>
				{/if}
			</div>

			<!-- Big CTA Button -->
			<div class="mt-10">
				<Button
					href={resolve('/create')}
					variant="glow"
					size="2xl"
					class="shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50"
				>
					✨ Create a Quiz ✨
				</Button>
			</div>
		</div>
	</div>
</section>

<!-- Recent Quizzes Section -->
<PageContainer class="py-12">
	<div class="mx-auto max-w-4xl">
		<div class="mb-6 flex items-center justify-between">
			<h2 class="text-xl font-bold text-gray-900 dark:text-white">Recent Quizzes</h2>
			<Button href="/quizzes" variant="accent" size="sm">View All</Button>
		</div>

		{#if quizzes.length > 0}
			<div class="flex flex-col gap-3">
				{#each quizzes as quiz (quiz.id)}
					<QuizRow {quiz} showOwner={true} />
				{/each}
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
