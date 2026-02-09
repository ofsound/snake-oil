<script lang="ts">
	import { page } from '$app/state';

	import { resolvePath } from '$lib/utils';

	let { data, children } = $props();

	// Determine current page from URL
	let currentPath = $derived(page.url.pathname);
	let isQuizPage = $derived(
		currentPath === `/${data.quiz.creator.slug}/${data.quiz.slug}` ||
			currentPath === `/${data.quiz.creator.slug}/${data.quiz.slug}/`
	);
	let isSubmissionsPage = $derived(currentPath.includes('/submissions'));
	let isEditPage = $derived(currentPath.includes('/edit'));

	const basePath = $derived(`/${data.quiz.creator.slug}/${data.quiz.slug}`);
</script>

{#if data.showCreatorNav}
	<nav class="border-b border-gray-200 bg-gray-50 py-3 dark:border-gray-700 dark:bg-gray-800/50">
		<div class="mx-auto flex max-w-5xl items-center gap-2 px-8">
			{#if isQuizPage}
				<span
					class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 px-2.5 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
				>
					<!-- {data.quiz.hasSpeedRun ? 'Speed Run' : 'Quiz'} -->
					View
				</span>
			{:else}
				<a
					href={resolvePath(basePath)}
					class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-indigo-400"
				>
					<!-- {data.quiz.hasSpeedRun ? 'Speed Run' : 'Quiz'} -->
					View
				</a>
			{/if}

			{#if isEditPage}
				<span
					class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 px-2.5 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
				>
					Edit
				</span>
			{:else}
				<a
					href={resolvePath(`${basePath}/edit`)}
					class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-indigo-400"
				>
					Edit
				</a>
			{/if}
			{#if isSubmissionsPage}
				<span
					class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-100 px-2.5 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
				>
					Submissions
				</span>
			{:else}
				<a
					href={resolvePath(`${basePath}/submissions`)}
					class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-indigo-400"
				>
					Submissions
				</a>
			{/if}
		</div>
	</nav>
{/if}

{@render children()}
