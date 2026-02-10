<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
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

<PageContainer>
	<div class="container mx-auto max-w-6xl px-4 py-8">
		<!-- Breadcrumb -->
		<div class="mb-4">
			<nav class="flex items-center gap-2 text-sm text-text-muted">
				<a href={resolvePath('/quizzes/tags')} class="hover:text-indigo-600"> All Tags </a>
				<span>/</span>
				<span class="text-text-primary">#{data.tag.label}</span>
			</nav>
		</div>

		<!-- Tag Header -->
		<div class="mb-8">
			<div class="flex flex-wrap items-center gap-4">
				<Heading level={1} class="mb-0">
					<span class="text-indigo-600">#</span>{data.tag.label}
				</Heading>
				<span
					class="inline-flex items-center rounded-full bg-accent-indigo-bg px-3 py-1 text-sm font-medium text-accent-indigo-text"
				>
					{data.tag.useCount}
					{data.tag.useCount === 1 ? 'quiz' : 'quizzes'}
				</span>
			</div>
			<p class="mt-2 text-text-secondary">
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
					<Button
						href={resolvePath(`/quizzes?tags=${data.tag.slug}`)}
						variant="accent"
						size="sm"
						fullWidth
					>
						Browse with Filters →
					</Button>
				</Card>

				<!-- Related Tags -->
				{#if data.relatedTags.length > 0}
					<Card variant="flat" padding="md">
						<Heading level={2} class="mb-3 text-base">Related Tags</Heading>
						<p class="mb-4 text-sm text-text-secondary">
							Quizzes with #{data.tag.label} are also tagged with:
						</p>
						<div class="flex flex-wrap gap-2">
							{#each data.relatedTags as relatedTag (relatedTag.id)}
								<a
									href={resolvePath(`/quizzes/tag/${relatedTag.slug}`)}
									class="inline-flex items-center rounded-full bg-surface-muted px-3 py-1.5 text-sm font-medium text-text-secondary transition-colors hover:bg-accent-indigo-bg hover:text-accent-indigo-text"
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
						<div class="divide-y divide-border">
							{#each data.quizzes as quiz (quiz.id)}
								<QuizRow {quiz} showCreator={true} />
							{/each}
						</div>
					{:else}
						<div class="flex flex-col items-center justify-center px-4 py-16 text-center">
							<div class="mb-4 text-6xl">🏷️</div>
							<h3 class="mb-2 text-xl font-semibold text-text-primary">No quizzes yet</h3>
							<p class="max-w-md text-text-secondary">
								There are no public quizzes tagged with "{data.tag.label}" yet. Be the first to
								<a href={resolvePath('/create')} class="text-indigo-600 hover:underline"
									>create one</a
								>!
							</p>
						</div>
					{/if}
				</Card>

				<Pagination
					currentPage={data.currentPage}
					totalPages={data.totalPages}
					totalItems={data.totalItems}
					itemsPerPage={data.itemsPerPage}
					mode="simple"
					navigation="ssr"
					itemName="quizzes"
				/>
			</div>
		</div>
	</div></PageContainer
>
