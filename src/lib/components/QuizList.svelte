<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import { resolvePath } from '$lib/utils';

	import Button from '$lib/components/Button.svelte';
	import QuizRow from '$lib/components/QuizRow.svelte';
	interface Quiz {
		id: string;
		title: string;
		description: string;
		slug: string;
		createdAt: Date;
		owner: { name: string | null; slug: string };
	}

	interface Props {
		quizzes: Quiz[];
		currentPage: number;
		totalPages: number;
		sort: string;
		order: 'asc' | 'desc';
		description: string;
		basePath: string;
		searchValue?: string;
		sortOptions: Array<{ value: string; label: string }>;
		onSortDefaultOrder?: (column: string) => 'asc' | 'desc';
		emptyState: { message: string; link?: { text: string; href: string } };
	}

	let {
		quizzes,
		currentPage,
		totalPages,
		sort,
		order,
		description,
		basePath,
		searchValue = '',
		sortOptions,
		onSortDefaultOrder = () => 'asc',
		emptyState
	}: Props = $props();

	function getSortIcon(column: string): string {
		if (sort !== column) return '';
		return order === 'asc' ? ' ↑' : ' ↓';
	}

	function handleSort(column: string): void {
		const params = new SvelteURLSearchParams(page.url.searchParams);

		if (sort === column) {
			params.set('order', order === 'asc' ? 'desc' : 'asc');
		} else {
			params.set('sort', column);
			params.set('order', onSortDefaultOrder(column));
		}

		params.set('page', '1');
		goto(resolvePath(`${basePath}?${params.toString()}`));
	}

	function handlePageChange(newPage: number): void {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('page', String(newPage));
		goto(resolvePath(`${basePath}?${params.toString()}`));
	}

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

<div class="mb-8">
	<!-- <Heading level={1}>{title}</Heading> -->
	<div class="text-center text-sm text-gray-600">{description}</div>
</div>

<form method="get" action="/results" class="mb-6">
	<div class="flex gap-3">
		<input
			type="search"
			name="q"
			value={searchValue}
			placeholder="Search title, description, or creator"
			class="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			required
		/>
		<Button variant="accent" size="md" type="submit">Search</Button>
	</div>
</form>

{#if quizzes.length > 0}
	<div
		class="mb-4 ml-auto flex w-max justify-end gap-4 rounded-md border border-neutral-100 px-4 py-2"
	>
		<div class="text-sm">Sort by:</div>
		{#each sortOptions as option (option.value)}
			<button
				type="button"
				onclick={() => handleSort(option.value)}
				class="cursor-pointer text-sm font-medium"
			>
				{option.label}{getSortIcon(option.value)}
			</button>
		{/each}
	</div>

	<div class="flex flex-col gap-3">
		{#each quizzes as quiz (quiz.id)}
			<QuizRow {quiz} showOwner={true} />
		{/each}
	</div>

	{#if totalPages > 1}
		<nav class="mt-6 flex items-center justify-between" aria-label="Pagination">
			<div class="text-sm text-gray-600">
				Page {currentPage} of {totalPages}
			</div>

			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage === 1}
				>
					Previous
				</Button>

				{#each getPageNumbers(currentPage, totalPages) as pageNum, idx (idx)}
					{#if pageNum === '...'}
						<span class="px-2 text-gray-500">...</span>
					{:else}
						<Button
							variant="outline"
							size="sm"
							onclick={() => handlePageChange(pageNum)}
							active={pageNum === currentPage}
						>
							{pageNum}
						</Button>
					{/if}
				{/each}

				<Button
					variant="outline"
					size="sm"
					onclick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
				>
					Next
				</Button>
			</div>
		</nav>
	{/if}
{:else}
	<div class="rounded-md bg-gray-50 p-8 text-center">
		<p class="text-gray-600">{emptyState.message}</p>
		{#if emptyState.link}
			<a
				href={resolvePath(emptyState.link.href)}
				class="mt-4 inline-block text-blue-600 hover:text-blue-800 hover:underline"
			>
				{emptyState.link.text}
			</a>
		{/if}
	</div>
{/if}
