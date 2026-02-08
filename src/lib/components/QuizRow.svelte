<script lang="ts">
	import { resolve } from '$app/paths';

	import Button from './Button.svelte';

	interface Tag {
		id: string;
		label: string;
		slug: string;
	}

	interface Quiz {
		slug: string;
		title: string;
		description: string;
		createdAt: Date;
		owner?: {
			name: string | null;
			slug: string;
		};
		speedRun?: {
			id: string;
		} | null;
		tags?: Tag[];
	}

	interface Props {
		quiz: Quiz;
		showOwner?: boolean;
		linkToManage?: boolean;
	}

	let { quiz, showOwner = false, linkToManage = false }: Props = $props();

	// New URL format: /[owner]/[quiz_slug]
	// Owner slug is required for the new URL structure
	const ownerSlug = $derived(quiz.owner?.slug ?? '');

	const rowHref = $derived(resolve(`/${ownerSlug}/${quiz.slug}`));

	function handleClick(event: MouseEvent): void {
		const target = event.target as HTMLElement;
		if (target.closest('[data-owner-link]')) return;
		if (target.closest('[data-view-link]')) return;
		if (target.closest('[data-manage-link]')) return;
		if (event.metaKey || event.ctrlKey) {
			window.open(rowHref, '_blank');
		} else {
			window.location.href = rowHref;
		}
	}

	function handleOwnerClick(event: MouseEvent): void {
		event.stopPropagation();
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		const target = event.target as HTMLElement;
		if (target.closest('[data-owner-link]')) return;
		if (target.closest('[data-view-link]')) return;
		if (target.closest('[data-manage-link]')) return;
		if (event.metaKey || event.ctrlKey) {
			window.open(rowHref, '_blank');
		} else {
			window.location.href = rowHref;
		}
	}

	// Compute row styling based on speed run status
	const rowClasses = $derived(
		quiz.speedRun
			? 'flex cursor-pointer items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-800 dark:hover:bg-amber-700'
			: 'flex cursor-pointer items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 transition-colors hover:bg-neutral-200 dark:border-neutral-700/50 dark:bg-neutral-800 dark:hover:bg-neutral-700'
	);
</script>

<div role="button" tabindex="0" onclick={handleClick} onkeydown={handleKeydown} class={rowClasses}>
	<div class="flex flex-col">
		<div class="flex items-center gap-2">
			<div class="font-semibold tracking-wide">{quiz.title}</div>
			{#if quiz.speedRun}
				<span
					class="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-gray-800"
				>
					⚡ Speed Run
				</span>
			{/if}
		</div>
		<div class="text-sm text-gray-600 dark:text-gray-200">{quiz.description}</div>
		{#if quiz.tags && quiz.tags.length > 0}
			<div class="mt-2 flex flex-wrap gap-1.5">
				{#each quiz.tags.slice(0, 3) as tag (tag.slug)}
					<a
						href="/quizzes/tag/{tag.slug}"
						class="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300"
						onclick={(e) => e.stopPropagation()}
					>
						#{tag.label}
					</a>
				{/each}
				{#if quiz.tags.length > 3}
					<span class="text-xs text-gray-500">+{quiz.tags.length - 3} more</span>
				{/if}
			</div>
		{/if}
	</div>
	<div class="flex flex-col items-end gap-1">
		<div class="flex items-center gap-2">
			{#if linkToManage}
				<Button
					href={resolve(`/${ownerSlug}/${quiz.slug}/submissions`)}
					variant="primary"
					size="xs"
					onclick={(e) => e.stopPropagation()}
				>
					Submissions
				</Button>
				<Button
					href={resolve(`/${ownerSlug}/${quiz.slug}/edit`)}
					variant="primary"
					size="xs"
					onclick={(e) => e.stopPropagation()}
				>
					Edit
				</Button>
			{/if}
			<div class="text-xs">
				{new Date(quiz.createdAt).toLocaleDateString()}
			</div>
		</div>
		{#if showOwner && quiz.owner && quiz.owner.name}
			<a
				data-owner-link
				href={resolve(`/user/${quiz.owner.slug}`)}
				onclick={handleOwnerClick}
				class="text-sm font-medium hover:text-indigo-800"
			>
				{quiz.owner.name}
			</a>
		{/if}
	</div>
</div>
