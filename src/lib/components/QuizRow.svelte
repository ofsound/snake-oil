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
	}

	let { quiz, showOwner = false }: Props = $props();

	function handleClick(event: MouseEvent): void {
		// Only navigate if not clicking on the owner link
		const target = event.target as HTMLElement;
		if (!target.closest('[data-owner-link]')) {
			window.location.href = `/${quiz.slug}`;
		}
	}

	function handleOwnerClick(event: MouseEvent): void {
		event.stopPropagation();
	}
</script>

<div
	role="button"
	tabindex="0"
	onclick={handleClick}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			window.location.href = `/${quiz.slug}`;
		}
	}}
	class="flex cursor-pointer items-center justify-between rounded-md border-none bg-gray-50 px-3 py-2 transition-colors hover:bg-gray-100"
>
	<div class="flex flex-col">
		<h3 class="font-semibold text-gray-800">{quiz.title}</h3>
		<div class="text-sm text-gray-600">{quiz.description}</div>
	</div>
	<div class="flex flex-col items-end gap-1 text-xs">
		<div>
			{new Date(quiz.createdAt).toLocaleDateString()}
		</div>
		{#if showOwner && quiz.owner && quiz.owner.name}
			<a
				data-owner-link
				href="/users/{quiz.owner.slug}"
				onclick={handleOwnerClick}
				class="font-semibold hover:text-emerald-800"
			>
				{quiz.owner.name}
			</a>
		{/if}
	</div>
</div>
