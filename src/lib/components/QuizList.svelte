<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import Button from '$lib/components/Button.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import QuizRow from '$lib/components/QuizRow.svelte';

	import { resolvePath } from '$lib/utils';

	interface Quiz {
		id: string;
		title: string;
		description: string;
		slug: string;
		createdAt: Date;
		creator: { name: string | null; slug: string };
	}

	interface Props {
		quizzes: Quiz[];
		currentPage: number;
		totalPages: number;
		totalItems: number;
		itemsPerPage: number;
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
		totalItems,
		itemsPerPage,
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
</script>

<div class="mb-8">
	<!-- <Heading level={1}>{title}</Heading> -->
	<div class="text-center text-sm text-text-secondary">{description}</div>
</div>

<form method="get" action="/results" class="mb-6">
	<div class="flex gap-3">
		<input
			type="search"
			name="q"
			value={searchValue}
			placeholder="Search title, description, or creator"
			class="focus:border-accent-indigo focus:ring-accent-indigo flex-1 rounded-md border border-border px-4 py-2 focus:ring-1 focus:outline-none"
			required
		/>
		<Button variant="accent" size="md" type="submit">Search</Button>
	</div>
</form>

{#if quizzes.length > 0}
	<div class="mb-4 ml-auto flex w-max justify-end gap-4 rounded-md border border-border px-4 py-2">
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
			<QuizRow {quiz} showCreator={true} />
		{/each}
	</div>

	<Pagination
		{currentPage}
		{totalPages}
		{totalItems}
		{itemsPerPage}
		mode="full"
		navigation="client"
		itemName="quizzes"
	/>
{:else}
	<div class="rounded-md bg-surface-muted p-8 text-center">
		<p class="text-text-secondary">{emptyState.message}</p>
		{#if emptyState.link}
			<a
				href={resolvePath(emptyState.link.href)}
				class="mt-4 inline-block text-accent-indigo-text hover:underline"
			>
				{emptyState.link.text}
			</a>
		{/if}
	</div>
{/if}
