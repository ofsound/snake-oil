<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import Card from '$lib/components/Card.svelte';
	import Heading from '$lib/components/Heading.svelte';

	import { resolvePath } from '$lib/utils';

	import type { PageProps } from './$types';
	let { data }: PageProps = $props();

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
			: 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:border-gray-700';
	}
</script>

<svelte:head>
	<title>Browse All Tags | snakeoil.app</title>
	<meta name="description" content="Browse all {data.totalCount} tags to discover quizzes" />
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<Heading level={1} class="mb-2">All Tags</Heading>
	<p class="mb-8 text-gray-600 dark:text-gray-400">
		Browse {data.totalCount} tags to discover quizzes by topic
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
				class="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
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
			<span class="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
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
				class="rounded-md border border-gray-200 bg-white p-1.5 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
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
							<h3
								class="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400"
							>
								#{tag.label}
							</h3>
							<span
								class="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
							>
								{tag.useCount}
								{tag.useCount === 1 ? 'quiz' : 'quizzes'}
							</span>
						</div>
					</a>

					<!-- Preview Quizzes -->
					{#if tag.previews.length > 0}
						<div class="flex-1 space-y-2">
							<p class="text-xs text-gray-500 dark:text-gray-400">Recent quizzes:</p>
							<div class="space-y-2">
								{#each tag.previews as quiz (quiz.id)}
									<a
										href={resolvePath(`/${quiz.owner.slug}/${quiz.slug}`)}
										class="block rounded-md bg-gray-50 p-2 text-sm transition-colors hover:bg-gray-100 dark:bg-gray-800/50 dark:hover:bg-gray-800"
									>
										<div class="truncate font-medium text-gray-900 dark:text-gray-100">
											{quiz.title}
										</div>
										<div class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
											by {quiz.owner.name}
										</div>
									</a>
								{/each}
							</div>
						</div>
					{:else}
						<p class="flex-1 text-sm text-gray-500 italic dark:text-gray-400">
							No public quizzes yet
						</p>
					{/if}

					<!-- View All Link -->
					<a
						href={resolvePath(`/quizzes/tag/${tag.slug}`)}
						class="mt-4 block text-center text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
					>
						View all {tag.useCount}
						{tag.useCount === 1 ? 'quiz' : 'quizzes'} →
					</a>
				</Card>
			{/each}
		</div>
	{:else}
		<div
			class="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-16 text-center dark:border-gray-700 dark:bg-gray-800"
		>
			<div class="mb-4 text-6xl">🏷️</div>
			<h3 class="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">No tags found</h3>
			<p class="max-w-md text-gray-600 dark:text-gray-400">
				{data.searchQuery
					? `No tags matching "${data.searchQuery}" found. Try a different search.`
					: 'No tags available yet. Create a quiz and add some tags!'}
			</p>
		</div>
	{/if}

	<!-- Pagination -->
	{#if data.totalPages > 1}
		<div class="mt-8 flex items-center justify-between">
			<div class="text-sm text-gray-600 dark:text-gray-400">
				Page {data.currentPage} of {data.totalPages}
				({data.totalCount} total tags)
			</div>
			<div class="flex gap-2">
				{#if data.currentPage > 1}
					<a
						href={(() => {
							const params = new URLSearchParams(page.url.searchParams);
							params.set('page', String(data.currentPage - 1));
							return resolvePath(`/quizzes/tags?${params.toString()}`);
						})()}
						class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						← Previous
					</a>
				{/if}
				{#if data.currentPage < data.totalPages}
					<a
						href={(() => {
							const params = new URLSearchParams(page.url.searchParams);
							params.set('page', String(data.currentPage + 1));
							return resolvePath(`/quizzes/tags?${params.toString()}`);
						})()}
						class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						Next →
					</a>
				{/if}
			</div>
		</div>
	{/if}
</div>
