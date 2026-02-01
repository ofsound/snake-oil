<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
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

	function formatDate(date: Date): string {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
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

	{#if data.quizzes.length > 0}
		<div class="overflow-x-auto rounded-lg border border-gray-200">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left">
							<button
								type="button"
								onclick={() => handleSort('title')}
								class="flex items-center gap-1 text-xs font-medium tracking-wider text-gray-500 uppercase hover:text-gray-700"
							>
								Title{getSortIcon('title')}
							</button>
						</th>
						<th class="px-6 py-3 text-left">
							<button
								type="button"
								onclick={() => handleSort('username')}
								class="flex items-center gap-1 text-xs font-medium tracking-wider text-gray-500 uppercase hover:text-gray-700"
							>
								Creator{getSortIcon('username')}
							</button>
						</th>
						<th class="px-6 py-3 text-left">
							<button
								type="button"
								onclick={() => handleSort('date')}
								class="flex items-center gap-1 text-xs font-medium tracking-wider text-gray-500 uppercase hover:text-gray-700"
							>
								Created{getSortIcon('date')}
							</button>
						</th>
						<th class="px-6 py-3 text-left">
							<span class="text-xs font-medium tracking-wider text-gray-500 uppercase">
								Actions
							</span>
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each data.quizzes as quiz (quiz.id)}
						<tr class="transition-colors hover:bg-gray-50">
							<td class="px-6 py-4">
								<a
									href="/{quiz.slug}"
									class="font-medium text-blue-600 hover:text-blue-800 hover:underline"
								>
									{quiz.title}
								</a>
								<p class="mt-1 text-sm text-gray-500">{quiz.description}</p>
							</td>
							<td class="px-6 py-4">
								<a
									href="/users/{quiz.owner.slug}"
									class="text-gray-700 hover:text-blue-600 hover:underline"
								>
									{quiz.owner.name}
								</a>
							</td>
							<td class="px-6 py-4 text-sm text-gray-500">
								{formatDate(quiz.createdAt)}
							</td>
							<td class="px-6 py-4">
								<a
									href="/{quiz.slug}"
									class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
								>
									View
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if data.totalPages > 1}
			<nav class="mt-6 flex items-center justify-between" aria-label="Pagination">
				<div class="text-sm text-gray-600">
					Page {data.currentPage} of {data.totalPages}
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={() => handlePageChange(data.currentPage - 1)}
						disabled={data.currentPage === 1}
						class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Previous
					</button>

					{#each getPageNumbers(data.currentPage, data.totalPages) as pageNum, idx (idx)}
						{#if pageNum === '...'}
							<span class="px-2 text-gray-500">...</span>
						{:else}
							<button
								type="button"
								onclick={() => handlePageChange(pageNum)}
								class="rounded-md px-3 py-2 text-sm font-medium transition-colors {pageNum ===
								data.currentPage
									? 'bg-blue-600 text-white'
									: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'}"
							>
								{pageNum}
							</button>
						{/if}
					{/each}

					<button
						type="button"
						onclick={() => handlePageChange(data.currentPage + 1)}
						disabled={data.currentPage === data.totalPages}
						class="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Next
					</button>
				</div>
			</nav>
		{/if}
	{:else}
		<div class="rounded-md bg-gray-50 p-8 text-center">
			<p class="text-gray-600">No quizzes available yet. Check back soon!</p>
		</div>
	{/if}
</div>
