<script lang="ts">
	interface Quiz {
		id: string;
		slug: string;
		title: string;
		description: string;
		createdAt: Date;
		owner?: {
			name: string | null;
			slug: string;
		};
	}

	interface Props {
		quiz: Quiz;
		showOwner?: boolean;
		linkToManage?: boolean;
	}

	let { quiz, showOwner = false, linkToManage = false }: Props = $props();

	const rowHref = $derived(linkToManage ? `/quizzes/${quiz.id}` : `/${quiz.slug}`);

	function handleClick(event: MouseEvent): void {
		const target = event.target as HTMLElement;
		if (target.closest('[data-owner-link]')) return;
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
		if (event.metaKey || event.ctrlKey) {
			window.open(rowHref, '_blank');
		} else {
			window.location.href = rowHref;
		}
	}
</script>

<div
	role="button"
	tabindex="0"
	onclick={handleClick}
	onkeydown={handleKeydown}
	class="flex cursor-pointer items-center justify-between rounded-md border border-neutral-200/80 bg-neutral-50 px-3 py-2 transition-colors hover:bg-neutral-200/80"
>
	<div class="flex flex-col">
		<h3 class="font-semibold text-gray-800">{quiz.title}</h3>
		<div class="text-sm text-gray-600">{quiz.description}</div>
	</div>
	<div class="flex flex-col items-end gap-1">
		<div class="text-xs">
			{new Date(quiz.createdAt).toLocaleDateString()}
		</div>
		{#if showOwner && quiz.owner && quiz.owner.name}
			<a
				data-owner-link
				href="/users/{quiz.owner.slug}"
				onclick={handleOwnerClick}
				class="text-sm font-semibold hover:text-emerald-800"
			>
				{quiz.owner.name}
			</a>
		{/if}
	</div>
</div>
