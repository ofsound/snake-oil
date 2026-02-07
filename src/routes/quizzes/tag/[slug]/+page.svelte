<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import QuizRow from '$lib/components/QuizRow.svelte';

	import { resolvePath } from '$lib/utils';

	let { data } = $props();
</script>

<svelte:head>
	<title>#{data.tag.label} Quizzes | snakeoil.app</title>
	<meta
		name="description"
		content="Browse {data.tag.useCount} quizzes tagged with '{data.tag.label}'"
	/>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<!-- Breadcrumb -->
	<div class="mb-4">
		<nav class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
			<a
				href={resolvePath('/quizzes/tags')}
				class="hover:text-indigo-600 dark:hover:text-indigo-400"
			>
				All Tags
			</a>
			<span>/</span>
			<span class="text-gray-900 dark:text-gray-100">#{data.tag.label}</span>
		</nav>
	</div>

	<!-- Tag Header -->
	<div class="mb-8">
		<div class="flex flex-wrap items-center gap-4">
			<Heading level={1} class="mb-0">
				<span class="text-indigo-600">#</span>{data.tag.label}
			</Heading>
			<span
				class="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
			>
				{data.tag.useCount}
				{data.tag.useCount === 1 ? 'quiz' : 'quizzes'}
			</span>
		</div>
		<p class="mt-2 text-gray-600 dark:text-gray-400">
			Explore quizzes tagged with #{data.tag.label}
		</p>
	</div>

	<!-- Two Column Layout -->
	<div class="grid gap-8 lg:grid-cols-3">
		<!-- Sidebar -->
		<div class="space-y-6">
			<!-- Browse with Filters -->
			<Card variant="flat" padding="md">
				<Heading level={2} class="mb-3 text-base">Browse with Filters</Heading>
				<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
					Use advanced filtering and sorting to find the perfect quiz.
				</p>
				<a
					href={resolvePath(`/quizzes?tags=${data.tag.slug}`)}
					class="inline-flex w-full items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
				>
					Browse with Filters →
				</a>
			</Card>

			<!-- Related Tags -->
			{#if data.relatedTags.length > 0}
				<Card variant="flat" padding="md">
					<Heading level={2} class="mb-3 text-base">Related Tags</Heading>
					<p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
						Quizzes with #{data.tag.label} are also tagged with:
					</p>
					<div class="flex flex-wrap gap-2">
						{#each data.relatedTags as relatedTag (relatedTag.id)}
							<a
								href={resolvePath(`/quizzes/tag/${relatedTag.slug}`)}
								class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-indigo-100 hover:text-indigo-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-indigo-900 dark:hover:text-indigo-300"
							>
								{relatedTag.label}
								<span class="ml-1.5 text-xs opacity-60">({relatedTag.cooccurrenceCount})</span>
							</a>
						{/each}
					</div>
				</Card>
			{/if}
		</div>

		<!-- Quizzes List -->
		<div class="lg:col-span-2">
			<Card variant="flat" padding="none" class="overflow-hidden">
				{#if data.quizzes.length > 0}
					<div class="divide-y divide-gray-200 dark:divide-gray-700">
						{#each data.quizzes as quiz (quiz.id)}
							<QuizRow {quiz} showOwner={true} />
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center px-4 py-16 text-center">
						<div class="mb-4 text-6xl">🏷️</div>
						<h3 class="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
							No quizzes yet
						</h3>
						<p class="max-w-md text-gray-600 dark:text-gray-400">
							There are no public quizzes tagged with "{data.tag.label}" yet. Be the first to
							<a
								href={resolvePath('/create')}
								class="text-indigo-600 hover:underline dark:text-indigo-400">create one</a
							>!
						</p>
					</div>
				{/if}
			</Card>

			<!-- Pagination -->
			{#if data.totalPages > 1}
				<div class="mt-6 flex items-center justify-between">
					<div class="text-sm text-gray-600 dark:text-gray-400">
						Page {data.currentPage} of {data.totalPages}
						({data.totalCount} total {data.totalCount === 1 ? 'quiz' : 'quizzes'})
					</div>
					<div class="flex gap-2">
						{#if data.currentPage > 1}
							<a
								href={resolvePath(`?page=${data.currentPage - 1}`)}
								class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
							>
								← Previous
							</a>
						{/if}
						{#if data.currentPage < data.totalPages}
							<a
								href={resolvePath(`?page=${data.currentPage + 1}`)}
								class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
							>
								Next →
							</a>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
