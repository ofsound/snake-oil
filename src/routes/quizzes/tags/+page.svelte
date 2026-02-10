<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import Card from '$lib/components/Card.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import Pagination from '$lib/components/Pagination.svelte';

	import { resolvePath } from '$lib/utils';

	import type { PageProps } from './$types';
	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	let searchInput = $state(data.searchQuery ?? '');

	function handleSearch() {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (searchInput.trim()) {
			params.set('q', searchInput.trim());
		} else {
			params.delete('q');
		}
		params.set('page', '1');
		goto(resolvePath(`/quizzes/tags?${params.toString()}`));
	}

	function handleSortChange(newSort: 'popularity' | 'name') {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (newSort === 'popularity') {
			params.delete('sort');
		} else {
			params.set('sort', newSort);
		}
		// Reset to page 1
		params.set('page', '1');
		goto(resolvePath(`/quizzes/tags?${params.toString()}`));
	}

	function handleOrderChange(newOrder: 'asc' | 'desc') {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (newOrder === 'desc') {
			params.delete('order');
		} else {
			params.set('order', newOrder);
		}
		params.set('page', '1');
		goto(resolvePath(`/quizzes/tags?${params.toString()}`));
	}

	function getSortButtonClasses(isActive: boolean): string {
		return isActive
			? 'bg-indigo-600 text-white hover:bg-indigo-700'
			: 'bg-surface text-text-secondary hover:bg-interactive-bg border border-border';
	}
</script>

<svelte:head>
	<title>Browse All Tags | snakeoil.app</title>
	<meta name="description" content="Browse all {data.totalItems} tags to discover quizzes" />
</svelte:head>

<PageContainer>
	<div class="container mx-auto max-w-6xl px-4 py-8">
		<Heading level={1} class="mb-2">All Tags</Heading>
		<p class="mb-8 text-text-secondary">
			Browse {data.totalItems} tags to discover quizzes by topic
		</p>

		<!-- Search and Sort Controls -->
		<div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
			<!-- Search -->
			<form
				class="flex gap-2"
				onsubmit={(e) => {
					e.preventDefault();
					handleSearch();
				}}
			>
				<input
					type="search"
					placeholder="Search tags..."
					bind:value={searchInput}
					class="flex-1 rounded-md border border-border-muted bg-surface px-4 py-2 text-sm text-text-primary focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
				/>
				<button
					type="submit"
					class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
				>
					Search
				</button>
			</form>

			<!-- Sort Options -->
			<div class="flex items-center gap-2">
				<span class="text-sm text-text-secondary">Sort by:</span>
				<div class="flex gap-1">
					<button
						type="button"
						class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {getSortButtonClasses(
							data.sort === 'popularity'
						)}"
						onclick={() => handleSortChange('popularity')}
					>
						Popularity
					</button>
					<button
						type="button"
						class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors {getSortButtonClasses(
							data.sort === 'name'
						)}"
						onclick={() => handleSortChange('name')}
					>
						Name
					</button>
				</div>

				<!-- Order Toggle -->
				<button
					type="button"
					class="rounded-md border border-border bg-surface p-1.5 text-text-muted hover:bg-interactive-bg"
					onclick={() => handleOrderChange(data.order === 'asc' ? 'desc' : 'asc')}
					title={data.order === 'asc' ? 'Ascending' : 'Descending'}
				>
					{#if data.order === 'asc'}
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
							/>
						</svg>
					{:else}
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
							/>
						</svg>
					{/if}
				</button>
			</div>
		</div>

		<!-- Tags Grid -->
		{#if data.tags.length > 0}
			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each data.tags as tag (tag.id)}
					<Card variant="flat" padding="md" class="flex flex-col">
						<!-- Tag Header -->
						<a href={resolvePath(`/quizzes/tag/${tag.slug}`)} class="group mb-4 block">
							<div class="flex items-center justify-between">
								<h3 class="text-lg font-semibold text-text-primary group-hover:text-indigo-600">
									#{tag.label}
								</h3>
								<span
									class="rounded-full bg-surface-muted px-2 py-1 text-xs font-medium text-text-secondary"
								>
									{tag.useCount}
									{tag.useCount === 1 ? 'quiz' : 'quizzes'}
								</span>
							</div>
						</a>

						<!-- Preview Quizzes -->
						{#if tag.previews.length > 0}
							<div class="flex-1 space-y-2">
								<p class="text-xs text-text-muted">Recent quizzes:</p>
								<div class="space-y-2">
									{#each tag.previews as quiz (quiz.id)}
										<a
											href={resolvePath(`/${quiz.creator.slug}/${quiz.slug}`)}
											class="block rounded-md bg-surface-muted p-2 text-sm transition-colors hover:bg-interactive-bg"
										>
											<div class="truncate font-medium text-text-primary">
												{quiz.title}
											</div>
											<div class="mt-0.5 truncate text-xs text-text-muted">
												by {quiz.creator.name}
											</div>
										</a>
									{/each}
								</div>
							</div>
						{:else}
							<p class="flex-1 text-sm text-text-muted italic">No public quizzes yet</p>
						{/if}

						<!-- View All Link -->
						<a
							href={resolvePath(`/quizzes/tag/${tag.slug}`)}
							class="mt-4 block text-center text-sm font-medium text-accent-indigo-text hover:opacity-80"
						>
							View all {tag.useCount}
							{tag.useCount === 1 ? 'quiz' : 'quizzes'} →
						</a>
					</Card>
				{/each}
			</div>
		{:else}
			<div
				class="flex flex-col items-center justify-center rounded-lg border border-border bg-surface px-4 py-16 text-center"
			>
				<div class="mb-4 text-6xl">🏷️</div>
				<h3 class="mb-2 text-xl font-semibold text-text-primary">No tags found</h3>
				<p class="max-w-md text-text-secondary">
					{data.searchQuery
						? `No tags matching "${data.searchQuery}" found. Try a different search.`
						: 'No tags available yet. Create a quiz and add some tags!'}
				</p>
			</div>
		{/if}

		<Pagination
			currentPage={data.currentPage}
			totalPages={data.totalPages}
			totalItems={data.totalItems}
			itemsPerPage={data.itemsPerPage}
			mode="simple"
			navigation="ssr"
			basePath="/quizzes/tags"
			itemName="tags"
		/>
	</div>
</PageContainer>
