<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import { resolvePath } from '$lib/utils';

	import QuizList from '$lib/components/QuizList.svelte';
	import ModeToggle from '$lib/components/ModeToggle.svelte';

	import type { PageProps } from './$types';
	let { data }: PageProps = $props();

	let mode = $derived(data.mode);

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

	let description = $derived(
		mode === 'speedrun'
			? `${data.totalCount} speed run${data.totalCount === 1 ? '' : 's'} for "${data.query}"`
			: mode === 'quiz'
				? `${data.totalCount} quiz${data.totalCount === 1 ? '' : 'zes'} for "${data.query}"`
				: `${data.totalCount} result${data.totalCount === 1 ? '' : 's'} for "${data.query}"`
	);
</script>

<div class="mb-6">
	<ModeToggle value={mode} onChange={handleModeChange} />
</div>

<QuizList
	quizzes={data.quizzes}
	currentPage={data.currentPage}
	totalPages={data.totalPages}
	sort={data.sort}
	order={data.order}
	{description}
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
		message:
			mode === 'speedrun'
				? 'No speed runs found matching your search.'
				: mode === 'quiz'
					? 'No quizzes found matching your search.'
					: 'No quizzes found matching your search.',
		link: { text: 'View all quizzes', href: '/quizzes' }
	}}
/>
