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
	<nav class="border-b border-border bg-surface-muted py-3">
		<div class="mx-auto flex max-w-5xl items-center gap-2 px-8">
			{#if isQuizPage}
				<span
					class="inline-flex items-center gap-1.5 rounded-lg bg-accent-indigo-bg px-2.5 py-1 text-sm font-medium text-accent-indigo-text"
				>
					<!-- {data.quiz.hasSpeedRun ? 'Speed Run' : 'Quiz'} -->
					View
				</span>
			{:else}
				<a
					href={resolvePath(basePath)}
					class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium text-text-muted transition-colors hover:bg-interactive-bg hover:text-indigo-600"
				>
					<!-- {data.quiz.hasSpeedRun ? 'Speed Run' : 'Quiz'} -->
					View
				</a>
			{/if}

			{#if isEditPage}
				<span
					class="inline-flex items-center gap-1.5 rounded-lg bg-accent-indigo-bg px-2.5 py-1 text-sm font-medium text-accent-indigo-text"
				>
					Edit
				</span>
			{:else}
				<a
					href={resolvePath(`${basePath}/edit`)}
					class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium text-text-muted transition-colors hover:bg-interactive-bg hover:text-indigo-600"
				>
					Edit
				</a>
			{/if}
			{#if isSubmissionsPage}
				<span
					class="inline-flex items-center gap-1.5 rounded-lg bg-accent-indigo-bg px-2.5 py-1 text-sm font-medium text-accent-indigo-text"
				>
					Submissions
				</span>
			{:else}
				<a
					href={resolvePath(`${basePath}/submissions`)}
					class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium text-text-muted transition-colors hover:bg-interactive-bg hover:text-indigo-600"
				>
					Submissions
				</a>
			{/if}
		</div>
	</nav>
{/if}

{@render children()}
