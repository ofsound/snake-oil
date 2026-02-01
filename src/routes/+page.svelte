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

	<div class="mb-8">
		{#if quizzes.length > 0}
			<div class="flex flex-col gap-2">
				{#each quizzes as quiz (quiz.id)}
					<a
						href="/{quiz.slug}"
						class="block rounded-md bg-gray-50 p-4 transition-colors hover:bg-gray-100"
					>
						<div class="flex flex-col">
							<h3 class="font-semibold text-gray-800">{quiz.title}</h3>
							<p class="mt-2 text-sm text-gray-600">{quiz.description}</p>
							<p class="mt-2 text-xs text-gray-500">
								Created by: {quiz.owner.name} on {new Date(quiz.createdAt).toLocaleDateString()}
							</p>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div class="rounded-md bg-gray-50 p-8 text-center">
				<p class="text-gray-600">No quizzes available yet. Check back soon!</p>
			</div>
		{/if}
	</div>
</div>
