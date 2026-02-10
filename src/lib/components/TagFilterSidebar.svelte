<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import { resolvePath } from '$lib/utils';

	interface Tag {
		id: string;
		label: string;
		slug: string;
		useCount: number;
	}

	interface Props {
		tags: Tag[];
		activeTags: string[];
		totalTagsCount: number;
		maxTags?: number;
		onChange?: (activeTags: string[]) => void;
	}

	let { tags, activeTags = $bindable([]), totalTagsCount, maxTags = 5, onChange }: Props = $props();

	let _isExpanded = $state(false);

	function toggleTag(tagSlug: string) {
		if (activeTags.includes(tagSlug)) {
			activeTags = activeTags.filter((t) => t !== tagSlug);
		} else if (activeTags.length < maxTags) {
			activeTags = [...activeTags, tagSlug];
		}
		onChange?.(activeTags);
		updateUrl();
	}

	function clearAll() {
		activeTags = [];
		onChange?.(activeTags);
		updateUrl();
	}

	function updateUrl() {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (activeTags.length > 0) {
			params.set('tags', activeTags.join(','));
		} else {
			params.delete('tags');
		}
		params.set('page', '1');
		goto(resolvePath(`${page.url.pathname}?${params.toString()}`));
	}

	function getTagClasses(tag: Tag, isActive: boolean): string {
		if (isActive) {
			return 'bg-accent-indigo-bg text-accent-indigo-text hover:opacity-80';
		}
		if (activeTags.length >= maxTags) {
			return 'bg-surface-muted text-text-muted cursor-not-allowed';
		}
		return 'bg-surface-muted text-text-secondary hover:bg-interactive-bg';
	}

	// Calculate relative sizes for tag cloud effect (min 100%, max 150%)
	const maxUseCount = $derived(tags.length > 0 ? Math.max(...tags.map((t) => t.useCount)) : 1);
	const minUseCount = $derived(tags.length > 0 ? Math.min(...tags.map((t) => t.useCount)) : 1);

	function getTagSize(useCount: number): string {
		if (maxUseCount === minUseCount) return 'text-sm';
		const ratio = (useCount - minUseCount) / (maxUseCount - minUseCount);
		if (ratio > 0.75) return 'text-base font-medium';
		if (ratio > 0.5) return 'text-sm';
		if (ratio > 0.25) return 'text-xs';
		return 'text-xs';
	}
</script>

<div class="w-[250px] shrink-0">
	<div class="sticky top-4 space-y-4">
		<!-- Header -->
		<div class="flex items-center justify-between">
			<h3 class="font-semibold text-text-primary">Filter by Tags</h3>
			{#if activeTags.length > 0}
				<button
					type="button"
					class="text-xs text-accent-indigo-text hover:opacity-80"
					onclick={clearAll}
				>
					Clear all
				</button>
			{/if}
		</div>

		<!-- Active Filters -->
		{#if activeTags.length > 0}
			<div class="flex flex-wrap gap-1.5">
				{#each activeTags as tagSlug (tagSlug)}
					{@const tag = tags.find((t) => t.slug === tagSlug)}
					{#if tag}
						<button
							type="button"
							class="inline-flex items-center gap-1 rounded-full bg-accent-indigo-bg px-2.5 py-1 text-xs font-medium text-accent-indigo-text transition-colors hover:opacity-80"
							onclick={() => toggleTag(tagSlug)}
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
					{/if}
				{/each}
			</div>

			{#if activeTags.length >= maxTags}
				<p class="text-xs text-accent-amber-text">
					Maximum {maxTags} tags selected
				</p>
			{/if}
		{/if}

		<!-- Tag Cloud -->
		<div class="flex flex-wrap gap-2">
			{#each tags as tag (tag.id)}
				{@const isActive = activeTags.includes(tag.slug)}
				{@const isDisabled = !isActive && activeTags.length >= maxTags}
				<button
					type="button"
					class="inline-flex items-center rounded-full px-3 py-1.5 transition-colors {getTagClasses(
						tag,
						isActive
					)} {getTagSize(tag.useCount)}"
					disabled={isDisabled}
					onclick={() => toggleTag(tag.slug)}
					title={isDisabled ? `Maximum ${maxTags} tags allowed` : undefined}
				>
					#{tag.label}
					<span class="ml-1 opacity-60">({tag.useCount})</span>
				</button>
			{/each}
		</div>

		<!-- View All Tags Link -->
		{#if totalTagsCount > tags.length}
			<a
				href={resolvePath('/quizzes/tags')}
				class="inline-flex items-center text-sm text-accent-indigo-text hover:opacity-80"
			>
				View all {totalTagsCount} tags
				<svg class="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</a>
		{/if}
	</div>
</div>
