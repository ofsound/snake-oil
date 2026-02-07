<script lang="ts">
	import { resolve } from '$app/paths';

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

	const rowHref = $derived(
		resolve(linkToManage ? `/${ownerSlug}/${quiz.slug}/edit` : `/${ownerSlug}/${quiz.slug}`)
	);
	const viewLabel = $derived(quiz.speedRun ? 'View Speed Run' : 'View Quiz');

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
			? 'flex cursor-pointer items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 transition-colors hover:bg-amber-100'
			: 'flex cursor-pointer items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 transition-colors hover:bg-neutral-200'
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
		<div class="text-sm text-gray-600">{quiz.description}</div>
		{#if quiz.tags && quiz.tags.length > 0}
			<div class="mt-2 flex flex-wrap gap-1.5">
				{#each quiz.tags.slice(0, 3) as tag}
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
				<a
					data-view-link
					href={resolve(`/${ownerSlug}/${quiz.slug}`)}
					class="rounded-md bg-emerald-500 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-600"
					onclick={(e) => e.stopPropagation()}
				>
					{viewLabel}
				</a>
				<a
					data-manage-link
					href={resolve(`/${ownerSlug}/${quiz.slug}/edit`)}
					class="rounded-md bg-indigo-500 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-600"
					onclick={(e) => e.stopPropagation()}
				>
					Edit
				</a>
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
