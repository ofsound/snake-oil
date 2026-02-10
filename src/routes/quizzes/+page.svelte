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
		return column === 'date' ? 'desc' : 'asc';
	}

	function handleModeChange(newMode: 'all' | 'quiz' | 'speedrun') {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (newMode === 'all') {
			params.delete('mode');
		} else {
			params.set('mode', newMode);
		}
		params.set('page', '1');
		goto(resolvePath(`/quizzes?${params.toString()}`));
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
		goto(resolvePath(`/quizzes?${params.toString()}`));
	}

	function clearAllTags() {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		params.delete('tags');
		params.set('page', '1');
		goto(resolvePath(`/quizzes?${params.toString()}`));
	}

	let description = $derived(() => {
		if (data.activeTags.length > 0) {
			return `${data.totalCount} result${data.totalCount === 1 ? '' : 's'}`;
		}
		if (mode === 'speedrun') {
			return `${data.totalCount} speed run${data.totalCount === 1 ? '' : 's'} available`;
		}
		if (mode === 'quiz') {
			return `${data.totalCount} quiz${data.totalCount === 1 ? '' : 'zes'} available`;
		}
		return `${data.totalCount} quiz${data.totalCount === 1 ? '' : 'zes'} and speed runs available`;
	});

	let emptyMessage = $derived(() => {
		if (data.activeTags.length > 0) {
			const tagNames = data.activeTags.map((t) => `#${t.label}`).join(', ');
			return `No quizzes found with ${tagNames}`;
		}
		if (mode === 'speedrun') {
			return 'No speed runs available yet. Check back soon!';
		}
		if (mode === 'quiz') {
			return 'No quizzes available yet. Check back soon!';
		}
		return 'No quizzes available yet. Check back soon!';
	});
</script>

<PageContainer>
	<!-- Mobile Tag Filter Toggle (shown on small screens) -->
	<div class="mb-4 lg:hidden">
		<details class="group">
			<summary
				class="flex cursor-pointer items-center justify-between rounded-md border border-border bg-surface px-4 py-3"
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
			<div class="mt-2 border-t border-border bg-surface px-4 py-3">
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
					class="mb-6 rounded-md border border-accent-indigo-border bg-accent-indigo-bg px-4 py-3"
				>
					<div class="flex flex-wrap items-center gap-2">
						<span class="text-sm font-medium text-accent-indigo-text"> Filtered by: </span>
						{#each data.activeTags as tag (tag.slug)}
							<button
								type="button"
								class="inline-flex items-center gap-1 rounded-full bg-accent-indigo-bg px-2.5 py-1 text-xs font-medium text-accent-indigo-text transition-colors hover:opacity-80"
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
							class="ml-2 text-xs text-accent-indigo-text hover:opacity-80"
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
				itemsPerPage={data.itemsPerPage ?? 15}
				sort={data.sort}
				order={data.order}
				description={description()}
				basePath="/quizzes"
				sortOptions={[
					{ value: 'title', label: 'Title' },
					{ value: 'username', label: 'Creator' },
					{ value: 'date', label: 'Date' }
				]}
				onSortDefaultOrder={getDefaultOrder}
				emptyState={{
					message: emptyMessage(),
					link: data.activeTags.length > 0 ? { text: 'Clear filters', href: '/quizzes' } : undefined
				}}
			/>
		</div>
	</div>
</PageContainer>
