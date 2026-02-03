<script lang="ts">
	import QuizList from '$lib/components/QuizList.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function getDefaultOrder(column: string): 'asc' | 'desc' {
		return column === 'date' ? 'desc' : 'asc';
	}
</script>

<QuizList
	quizzes={data.quizzes}
	totalCount={data.totalCount}
	currentPage={data.currentPage}
	totalPages={data.totalPages}
	sort={data.sort}
	order={data.order}
	title="All Quizzes"
	description="{data.totalCount} quiz{data.totalCount === 1 ? '' : 'zes'} available"
	basePath="/quizzes"
	sortOptions={['title', 'username', 'date']}
	onSortDefaultOrder={getDefaultOrder}
	emptyState={{ message: 'No quizzes available yet. Check back soon!' }}
/>
