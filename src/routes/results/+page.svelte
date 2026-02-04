<script lang="ts">
	import QuizList from '$lib/components/QuizList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function getDefaultOrder(column: string): 'asc' | 'desc' {
		return column === 'date' || column === 'relevance' ? 'desc' : 'asc';
	}
</script>

<QuizList
	quizzes={data.quizzes}
	totalCount={data.totalCount}
	currentPage={data.currentPage}
	totalPages={data.totalPages}
	sort={data.sort}
	order={data.order}
	title="Search Results"
	description="{data.totalCount} result{data.totalCount === 1
		? ''
		: 's'} for &quot;{data.query}&quot;"
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
		message: 'No quizzes found matching your search.',
		link: { text: 'View all quizzes', href: '/quizzes' }
	}}
/>
