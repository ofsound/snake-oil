<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let quizzes = $derived(data.quizzes ?? []);
</script>

<div class="mx-auto max-w-4xl p-8">
	<div class="mb-8 text-center">
		<h1 class="mb-2 text-4xl font-bold text-gray-800">Welcome to Snake Oil</h1>
		<p class="text-lg text-gray-600">Test your knowledge with our latest quizzes</p>
	</div>

	<h2 class="mb-2 text-center text-2xl font-bold">Most Recent Quizzes</h2>
	<a
		href="/quizzes"
		class="mx-auto block w-max rounded-sm bg-slate-400 px-1.5 py-1 text-center text-sm text-white"
		>View All</a
	>

	<div class="my-8">
		{#if quizzes.length > 0}
			<div class="flex flex-col gap-2">
				{#each quizzes as quiz (quiz.id)}
					<div class="block rounded-md bg-gray-50 p-4 transition-colors hover:bg-gray-100">
						<div class="flex flex-col">
							<a
								href="/{quiz.slug}"
								class="font-semibold text-gray-800 hover:text-blue-600 hover:underline"
							>
								{quiz.title}
							</a>
							<p class="mt-2 text-sm text-gray-600">{quiz.description}</p>
							<div class="mt-2 flex justify-end text-xs text-gray-500">
								<a
									href="/users/{quiz.owner.slug}"
									class="text-blue-600 hover:text-blue-800 hover:underline"
								>
									{new Date(quiz.createdAt).toLocaleDateString()}&nbsp;by&nbsp;{quiz.owner.name}
								</a>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="rounded-md bg-gray-50 p-8 text-center">
				<p class="text-gray-600">No quizzes available yet. Check back soon!</p>
			</div>
		{/if}
	</div>
</div>
