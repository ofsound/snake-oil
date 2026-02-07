<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import QuizList from '$lib/components/QuizList.svelte';
	import ModeToggle from '$lib/components/ModeToggle.svelte';

	import { resolvePath } from '$lib/utils';

	import type { PageProps } from './$types';
	let { data }: PageProps = $props();

	let mode = $derived(data.mode);

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

	let description = $derived(
		mode === 'speedrun'
			? `${data.totalCount} speed run${data.totalCount === 1 ? '' : 's'} available`
			: mode === 'quiz'
				? `${data.totalCount} quiz${data.totalCount === 1 ? '' : 'zes'} available`
				: `${data.totalCount} quiz${data.totalCount === 1 ? '' : 'zes'} and speed runs available`
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
	basePath="/quizzes"
	sortOptions={[
		{ value: 'title', label: 'Title' },
		{ value: 'username', label: 'Creator' },
		{ value: 'date', label: 'Date' }
	]}
	onSortDefaultOrder={getDefaultOrder}
	emptyState={{
		message:
			mode === 'speedrun'
				? 'No speed runs available yet. Check back soon!'
				: mode === 'quiz'
					? 'No quizzes available yet. Check back soon!'
					: 'No quizzes available yet. Check back soon!'
	}}
/>
