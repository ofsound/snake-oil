<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import QuizRow from '$lib/components/QuizRow.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type SortOption = 'date' | 'title' | 'username';
	type OrderOption = 'asc' | 'desc';

	function getSortIcon(column: SortOption): string {
		if (data.sort !== column) return '';
		return data.order === 'asc' ? ' ↑' : ' ↓';
	}

	function handleSort(column: SortOption): void {
		const params = new URLSearchParams(page.url.searchParams);

		if (data.sort === column) {
			// Toggle order if same column
			params.set('order', data.order === 'asc' ? 'desc' : 'asc');
		} else {
			// New column, default to desc for date, asc for others
			params.set('sort', column);
			params.set('order', column === 'date' ? 'desc' : 'asc');
		}

		// Reset to page 1 when sorting changes
		params.set('page', '1');

		goto(`/quizzes?${params.toString()}`);
	}

	function handlePageChange(newPage: number): void {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(newPage));
		goto(`/quizzes?${params.toString()}`);
	}

	// Generate page numbers for pagination
	function getPageNumbers(current: number, total: number): (number | '...')[] {
		const pages: (number | '...')[] = [];
		const delta = 2;

		for (let i = 1; i <= total; i++) {
			if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
				pages.push(i);
			} else if (pages[pages.length - 1] !== '...') {
				pages.push('...');
			}
		}

		return pages;
	}
</script>

<div class="mx-auto max-w-6xl p-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-800">All Quizzes</h1>
		<p class="mt-2 text-gray-600">
			{data.totalCount} quiz{data.totalCount === 1 ? '' : 'zes'} available
		</p>
	</div>

	<form method="get" action="/results" class="mb-6">
		<div class="flex gap-3">
			<input
				type="search"
				name="q"
				placeholder="Search title, description, or creator"
				class="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				required
			/>
			<Button variant="accent" size="md" type="submit">Search</Button>
		</div>
	</form>

	{#if data.quizzes.length > 0}
		<div class="mb-6 flex items-center gap-4 rounded-md bg-gray-50 px-4 py-3">
			<span class="text-sm font-medium text-gray-600">Sort by:</span>
			<button
				type="button"
				onclick={() => handleSort('title')}
				class="text-sm text-gray-700 hover:text-blue-600 hover:underline"
			>
				Title{getSortIcon('title')}
			</button>
			<button
				type="button"
				onclick={() => handleSort('username')}
				class="text-sm text-gray-700 hover:text-blue-600 hover:underline"
			>
				Creator{getSortIcon('username')}
			</button>
			<button
				type="button"
				onclick={() => handleSort('date')}
				class="text-sm text-gray-700 hover:text-blue-600 hover:underline"
			>
				Created{getSortIcon('date')}
			</button>
		</div>

		<div class="flex flex-col gap-3">
			{#each data.quizzes as quiz (quiz.id)}
				<QuizRow {quiz} showOwner={true} />
			{/each}
		</div>

		{#if data.totalPages > 1}
			<nav class="mt-6 flex items-center justify-between" aria-label="Pagination">
				<div class="text-sm text-gray-600">
					Page {data.currentPage} of {data.totalPages}
				</div>

				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onclick={() => handlePageChange(data.currentPage - 1)}
						disabled={data.currentPage === 1}
					>
						Previous
					</Button>

					{#each getPageNumbers(data.currentPage, data.totalPages) as pageNum, idx (idx)}
						{#if pageNum === '...'}
							<span class="px-2 text-gray-500">...</span>
						{:else}
							<Button
								variant="outline"
								size="sm"
								onclick={() => handlePageChange(pageNum)}
								active={pageNum === data.currentPage}
							>
								{pageNum}
							</Button>
						{/if}
					{/each}

					<Button
						variant="outline"
						size="sm"
						onclick={() => handlePageChange(data.currentPage + 1)}
						disabled={data.currentPage === data.totalPages}
					>
						Next
					</Button>
				</div>
			</nav>
		{/if}
	{:else}
		<div class="rounded-md bg-gray-50 p-8 text-center">
			<p class="text-gray-600">No quizzes available yet. Check back soon!</p>
		</div>
	{/if}
</div>
