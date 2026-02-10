<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import Button from './Button.svelte';

	interface Props {
		currentPage: number;
		totalPages: number;
		totalItems: number;
		itemsPerPage: number;
		mode?: 'full' | 'simple';
		variant?: 'default' | 'compact' | 'admin';
		navigation?: 'client' | 'ssr';
		itemName?: string;
		showItemCount?: boolean;
		basePath?: string;
		class?: string;
	}

	let {
		currentPage,
		totalPages,
		totalItems,
		itemsPerPage,
		mode = 'full',
		variant = 'default',
		navigation = 'client',
		itemName = 'items',
		showItemCount = true,
		basePath,
		class: className = ''
	}: Props = $props();

	function getPageUrl(targetPage: number): string {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('page', String(targetPage));
		const queryString = params.toString();
		return basePath ? `${basePath}?${queryString}` : `?${queryString}`;
	}

	function handlePageChange(newPage: number): void {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.set('page', String(newPage));
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	function getPageNumbers(current: number, total: number): (number | '...')[] {
		if (mode === 'simple') return [];

		const pages: (number | '...')[] = [];
		const delta = variant === 'compact' ? 1 : 2;

		for (let i = 1; i <= total; i++) {
			if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
				pages.push(i);
			} else if (pages[pages.length - 1] !== '...') {
				pages.push('...');
			}
		}

		return pages;
	}

	let startItem = $derived((currentPage - 1) * itemsPerPage + 1);
	let endItem = $derived(Math.min(currentPage * itemsPerPage, totalItems));

	let variantClasses = $derived.by(() => {
		switch (variant) {
			case 'compact':
				return {
					container: 'mt-4',
					itemCount: 'text-xs',
					buttons: 'gap-1'
				};
			case 'admin':
				return {
					container: 'mt-6',
					itemCount: 'text-sm text-text-secondary',
					buttons: 'gap-2'
				};
			default:
				return {
					container: 'mt-6',
					itemCount: 'text-sm text-text-secondary',
					buttons: 'gap-2'
				};
		}
	});
</script>

{#if totalPages > 1}
	<nav
		class="flex items-center justify-between {variantClasses.container} {className}"
		aria-label="Pagination"
	>
		{#if showItemCount}
			<div class={variantClasses.itemCount}>
				Showing {startItem}-{endItem} of {totalItems}
				{itemName}
			</div>
		{:else}
			<div></div>
		{/if}

		<div class="flex items-center {variantClasses.buttons}">
			{#if navigation === 'ssr'}
				<!-- SSR Mode: Use anchor tags -->
				<a
					href={getPageUrl(currentPage - 1)}
					class="rounded-lg border border-border-muted bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-interactive-bg disabled:cursor-not-allowed disabled:opacity-50"
					class:pointer-events-none={currentPage === 1}
					class:opacity-50={currentPage === 1}
					aria-disabled={currentPage === 1}
				>
					← Previous
				</a>

				{#if mode === 'full'}
					{#each getPageNumbers(currentPage, totalPages) as pageNum, idx (idx)}
						{#if pageNum === '...'}
							<span class="px-2 text-gray-500">...</span>
						{:else}
							<a
								href={getPageUrl(pageNum)}
								class="rounded-lg border px-4 py-2 text-sm font-medium transition-colors {pageNum ===
								currentPage
									? 'border-indigo-500 bg-indigo-600 text-white'
									: 'border-border-muted bg-surface text-text-secondary hover:bg-interactive-bg'}"
							>
								{pageNum}
							</a>
						{/if}
					{/each}
				{/if}

				<a
					href={getPageUrl(currentPage + 1)}
					class="rounded-lg border border-border-muted bg-surface px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-interactive-bg disabled:cursor-not-allowed disabled:opacity-50"
					class:pointer-events-none={currentPage === totalPages}
					class:opacity-50={currentPage === totalPages}
					aria-disabled={currentPage === totalPages}
				>
					Next →
				</a>
			{:else}
				<!-- Client Mode: Use Button component with goto() -->
				<Button
					variant="outline"
					size={variant === 'compact' ? 'xs' : 'sm'}
					onclick={() => handlePageChange(currentPage - 1)}
					disabled={currentPage === 1}
				>
					← Previous
				</Button>

				{#if mode === 'full'}
					{#each getPageNumbers(currentPage, totalPages) as pageNum, idx (idx)}
						{#if pageNum === '...'}
							<span class="px-2 text-gray-500">...</span>
						{:else}
							<Button
								variant="outline"
								size={variant === 'compact' ? 'xs' : 'sm'}
								onclick={() => handlePageChange(pageNum)}
								active={pageNum === currentPage}
							>
								{pageNum}
							</Button>
						{/if}
					{/each}
				{/if}

				<Button
					variant="outline"
					size={variant === 'compact' ? 'xs' : 'sm'}
					onclick={() => handlePageChange(currentPage + 1)}
					disabled={currentPage === totalPages}
				>
					Next →
				</Button>
			{/if}
		</div>
	</nav>
{/if}
