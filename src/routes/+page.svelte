<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let quizzes = $derived(data.quizzes ?? []);
</script>

<div class="mx-auto max-w-4xl p-8">
	<a
		href="/create"
		class="mx-auto my-12 mb-20 block w-max cursor-pointer rounded-md bg-emerald-500 p-14 px-20 text-xl font-semibold text-white text-shadow-sm"
		>Create a Quiz</a
	>

	<div class="my-8">
		{#if quizzes.length > 0}
			<div class="flex flex-col gap-2">
				{#each quizzes as quiz (quiz.id)}
					<div class="block rounded-md bg-gray-50 p-4 transition-colors hover:bg-gray-100">
						<div class="flex flex-col">
							<a href="/{quiz.slug}" class="flex justify-between">
								<div>
									<div class="text-lg font-semibold">{quiz.title}</div>
									<div>{quiz.description}</div>
								</div>
								<div class="mt-2 justify-end text-xs">
									<div>{new Date(quiz.createdAt).toLocaleDateString()}</div>
									<div>{quiz.owner.name}</div>
								</div>
							</a>
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

	<a
		href="/quizzes"
		class="mx-auto block w-max rounded-sm bg-slate-400 px-1.5 py-1 text-center text-sm text-white"
		>Browse All Quizzes</a
	>
</div>
