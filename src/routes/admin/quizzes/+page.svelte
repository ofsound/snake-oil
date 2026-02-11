<script lang="ts">
	import { formatDistanceToNow } from 'date-fns';

	import AdminDataTable from '$lib/components/admin/AdminDataTable.svelte';
	import Button from '$lib/components/Button.svelte';

	let { data } = $props();

	let showDeleteModal = $state(false);
	let quizToDelete: (typeof data.items)[0] | null = $state(null);
	let deleteConfirmTitle = $state('');

	function openDeleteModal(quiz: (typeof data.items)[0]) {
		quizToDelete = quiz;
		deleteConfirmTitle = '';
		showDeleteModal = true;
	}

	const filters = [
		{
			id: 'search',
			label: 'Search',
			type: 'text' as const,
			placeholder: 'Quiz title or description...'
		},
		{
			id: 'visibility',
			label: 'Visibility',
			type: 'select' as const,
			options: [
				{ value: 'all', label: 'All' },
				{ value: 'public', label: 'Public' },
				{ value: 'private', label: 'Private' }
			]
		},
		{
			id: 'sort',
			label: 'Sort',
			type: 'select' as const,
			options: [
				{ value: 'created', label: 'Created Date' },
				{ value: 'title', label: 'Title' }
			]
		},
		{
			id: 'order',
			label: 'Order',
			type: 'select' as const,
			options: [
				{ value: 'desc', label: 'Newest First' },
				{ value: 'asc', label: 'Oldest First' }
			]
		}
	];
</script>

<AdminDataTable
	title="Quizzes"
	description="Manage all quizzes on the platform"
	basePath="/admin/quizzes"
	itemName="quizzes"
	{filters}
	{data}
	emptyMessage="No quizzes found"
	headers={['Quiz', 'Creator', 'Visibility', 'Type', 'Created', 'Actions']}
>
	{#snippet children()}
		{#each data.items as quiz (quiz.id)}
			<tr class="hover:bg-admin-surface-muted">
				<td class="px-6 py-4">
					<div class="text-sm font-medium text-admin-text-primary">{quiz.title}</div>
					<div class="max-w-xs truncate text-sm text-admin-text-muted">{quiz.description}</div>
				</td>
				<td class="px-6 py-4 whitespace-nowrap">
					<a
						href="/admin/users/{quiz.creatorId}"
						class="text-sm text-admin-accent-violet-text hover:text-admin-text-primary"
					>
						{quiz.creatorName || quiz.creatorSlug}
					</a>
				</td>
				<td class="px-6 py-4 whitespace-nowrap">
					{#if quiz.visibility === 'public'}
						<span
							class="inline-flex items-center rounded-full bg-admin-accent-emerald-bg px-2.5 py-0.5 text-xs font-medium text-admin-accent-emerald-text"
						>
							Public
						</span>
					{:else}
						<span
							class="inline-flex items-center rounded-full bg-admin-surface-muted px-2.5 py-0.5 text-xs font-medium text-admin-text-primary"
						>
							Private
						</span>
					{/if}
				</td>
				<td class="px-6 py-4 whitespace-nowrap">
					{#if quiz.speedRunId}
						<span
							class="inline-flex items-center rounded-full bg-admin-accent-violet-bg px-2.5 py-0.5 text-xs font-medium text-admin-accent-violet-text"
						>
							Speed Run
						</span>
					{:else}
						<span class="text-sm text-admin-text-muted">Regular</span>
					{/if}
				</td>
				<td class="px-6 py-4 text-sm whitespace-nowrap text-admin-text-muted">
					<time title={new Date(quiz.createdAt).toLocaleString()}>
						{formatDistanceToNow(new Date(quiz.createdAt), { addSuffix: true })}
					</time>
				</td>
				<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
					<div class="flex gap-2">
						<a
							href="/{quiz.creatorSlug}/{quiz.slug}"
							target="_blank"
							class="text-admin-accent-violet-text hover:text-admin-text-primary"
						>
							View
						</a>
						<button
							onclick={() => openDeleteModal(quiz)}
							class="text-admin-accent-red-text hover:text-admin-text-primary"
						>
							Delete
						</button>
					</div>
				</td>
			</tr>
		{/each}
	{/snippet}
</AdminDataTable>

<!-- Delete Modal -->
{#if showDeleteModal && quizToDelete}
	<div
		class="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-admin-surface-subtle"
	>
		<div class="mx-4 w-full max-w-lg rounded-lg bg-admin-surface-elevated p-6">
			<h3 class="mb-2 text-lg font-medium text-admin-text-primary">Delete Quiz</h3>
			<p class="mb-4 text-sm text-admin-text-secondary">
				Are you sure you want to delete <strong>{quizToDelete.title}</strong>? This action cannot be
				undone. All questions, submissions, and speed run results will be permanently deleted.
			</p>
			<div class="mb-4 rounded-md border border-admin-border bg-admin-surface-subtle p-3">
				<p class="text-sm text-admin-text-secondary">
					<strong>Warning:</strong> This quiz has {quizToDelete.speedRunId
						? 'speed run enabled'
						: 'regular mode'} and belongs to {quizToDelete.creatorName || quizToDelete.creatorSlug}.
				</p>
			</div>
			<form method="POST" action="?/delete" class="space-y-4">
				<input type="hidden" name="quizId" value={quizToDelete.id} />
				<div>
					<label
						for="delete-confirm-title"
						class="mb-1 block text-sm font-medium text-admin-text-primary"
					>
						Type the quiz title to confirm: <code class="rounded bg-admin-surface-subtle px-1"
							>{quizToDelete.title}</code
						>
					</label>
					<input
						id="delete-confirm-title"
						type="text"
						name="confirmTitle"
						bind:value={deleteConfirmTitle}
						required
						class="w-full rounded-md border-admin-border shadow-sm focus:border-admin-accent-violet-border focus:ring-admin-accent-violet-border sm:text-sm"
						placeholder="Type exact title here..."
					/>
				</div>
				<div class="flex justify-end gap-3">
					<Button
						type="button"
						onclick={() => (showDeleteModal = false)}
						variant="outline"
						size="sm">Cancel</Button
					>
					<Button
						type="submit"
						disabled={deleteConfirmTitle !== quizToDelete.title}
						variant="danger"
						size="sm">Delete Quiz</Button
					>
				</div>
			</form>
		</div>
	</div>
{/if}
