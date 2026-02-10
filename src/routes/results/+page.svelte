<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import ModeToggle from '$lib/components/ModeToggle.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import QuizList from '$lib/components/QuizList.svelte';
	import TagFilterSidebar from '$lib/components/TagFilterSidebar.svelte';

	import { resolvePath } from '$lib/utils';

	import type { PageProps } from './$types';
	let { data }: PageProps = $props();

	let mode = $derived(data.mode);
	let activeTags = $derived(data.activeTags.map((t) => t.slug));

	function getDefaultOrder(column: string): 'asc' | 'desc' {
		return column === 'date' || column === 'relevance' ? 'desc' : 'asc';
	}

	function handleModeChange(newMode: 'all' | 'quiz' | 'speedrun') {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (newMode === 'all') {
			params.delete('mode');
		} else {
			params.set('mode', newMode);
		}
		params.set('page', '1');
		goto(resolvePath(`/results?${params.toString()}`));
	}

	function removeTag(tagSlug: string) {
		const currentTags = data.activeTags.map((t) => t.slug);
		const newTags = currentTags.filter((t) => t !== tagSlug);

		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (newTags.length > 0) {
			params.set('tags', newTags.join(','));
		} else {
			params.delete('tags');
		}
		params.set('page', '1');
		goto(resolvePath(`/results?${params.toString()}`));
	}

	function clearAllTags() {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.delete('tags');
		params.set('page', '1');
		goto(resolvePath(`/results?${params.toString()}`));
	}

	let description = $derived(() => {
		const parts: string[] = [];
		if (data.query) {
			parts.push(`Search: "${data.query}"`);
		}
		if (data.activeTags.length > 0) {
			const tagNames = data.activeTags.map((t) => `#${t.label}`).join(', ');
			parts.push(`Tags: ${tagNames}`);
		}
		if (parts.length === 0) {
			return `${data.totalCount} result${data.totalCount === 1 ? '' : 's'}`;
		}
		return `${parts.join(' + ')} — ${data.totalCount} result${data.totalCount === 1 ? '' : 's'}`;
	});

	let emptyMessage = $derived(() => {
		if (data.activeTags.length > 0 && data.query) {
			return 'No quizzes found matching your search and selected tags.';
		}
		if (data.activeTags.length > 0) {
			return 'No quizzes found with the selected tags.';
		}
		if (mode === 'speedrun') {
			return 'No speed runs found matching your search.';
		}
		if (mode === 'quiz') {
			return 'No quizzes found matching your search.';
		}
		return 'No quizzes found matching your search.';
	});
</script>

<PageContainer>
	<!-- Mobile Tag Filter Toggle (shown on small screens) -->
	<div class="mb-4 lg:hidden">
		<details class="group">
			<summary
				class="flex cursor-pointer items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
			>
				<span class="font-medium">Filter by Tags</span>
				<span class="transition-transform group-open:rotate-180">
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 9l-7 7-7-7"
						/>
					</svg>
				</span>
			</summary>
			<div
				class="mt-2 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
			>
				<TagFilterSidebar
					tags={data.popularTags}
					{activeTags}
					totalTagsCount={data.totalTagsCount}
				/>
			</div>
		</details>
	</div>

	<div class="flex gap-6">
		<!-- Sidebar (desktop only) -->
		<div class="hidden lg:block">
			<TagFilterSidebar tags={data.popularTags} {activeTags} totalTagsCount={data.totalTagsCount} />
		</div>

		<!-- Main Content -->
		<div class="min-w-0 flex-1">
			<div class="mb-6">
				<ModeToggle value={mode} onChange={handleModeChange} />
			</div>

			<!-- Active Filters Banner -->
			{#if data.activeTags.length > 0}
				<div
					class="mb-6 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-800 dark:bg-indigo-900/20"
				>
					<div class="flex flex-wrap items-center gap-2">
						<span class="text-sm font-medium text-indigo-900 dark:text-indigo-300">
							Filtered by:
						</span>
						{#each data.activeTags as tag (tag.slug)}
							<button
								type="button"
								class="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-700"
								onclick={() => removeTag(tag.slug)}
							>
								#{tag.label}
								<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						{/each}
						<button
							type="button"
							class="ml-2 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
							onclick={clearAllTags}
						>
							Clear all
						</button>
					</div>
				</div>
			{/if}

			<QuizList
				quizzes={data.quizzes}
				currentPage={data.currentPage}
				totalPages={data.totalPages}
				totalItems={data.totalItems ?? 0}
				itemsPerPage={data.itemsPerPage ?? 50}
				sort={data.sort}
				order={data.order}
				description={description()}
				basePath="/results"
				searchValue={data.query}
				sortOptions={[
					{ value: 'relevance', label: 'Relevance' },
					{ value: 'title', label: 'Title' },
					{ value: 'username', label: 'Creator' },
					{ value: 'date', label: 'Date' }
				]}
				onSortDefaultOrder={getDefaultOrder}
				emptyState={{
					message: emptyMessage(),
					link: { text: 'View all quizzes', href: '/quizzes' }
				}}
			/>
		</div>
	</div>
</PageContainer>
