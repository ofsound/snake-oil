<script lang="ts">
	import { formatDistanceToNow } from 'date-fns';

	import AdminDataTable from '$lib/components/admin/AdminDataTable.svelte';
	import Button from '$lib/components/Button.svelte';

	let { data } = $props();

	let showDeleteModal = $state(false);
	let resultToDelete: (typeof data.items)[0] | null = $state(null);
	let showClearModal = $state(false);
	let quizToClear: (typeof data.quizzes)[0] | null = $state(null);
	let clearConfirmTitle = $state('');

	function openDeleteModal(result: (typeof data.items)[0]) {
		resultToDelete = result;
		showDeleteModal = true;
	}

	function openClearModal(quiz: (typeof data.quizzes)[0]) {
		quizToClear = quiz;
		clearConfirmTitle = '';
		showClearModal = true;
	}

	function formatTime(ms: number): string {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}

	const filters = [
		{
			id: 'quiz',
			label: 'Quiz',
			type: 'select' as const,
			dynamicOptions: 'quizzes',
			options: [{ value: 'all', label: 'All Quizzes' }]
		},
		{
			id: 'sort',
			label: 'Sort',
			type: 'select' as const,
			options: [
				{ value: 'created', label: 'Date' },
				{ value: 'score', label: 'Score' },
				{ value: 'time', label: 'Time' }
			]
		},
		{
			id: 'order',
			label: 'Order',
			type: 'select' as const,
			options: [
				{ value: 'desc', label: 'Best First' },
				{ value: 'asc', label: 'Worst First' }
			]
		},
		{
			id: 'suspicious',
			label: 'Suspicious',
			type: 'checkbox' as const,
			checkboxLabel: 'Suspicious only (<1s/question)'
		}
	];
</script>

<AdminDataTable
	title="Speed Run Results"
	description="Manage speed run results and leaderboards"
	basePath="/admin/speed-runs"
	itemName="results"
	{filters}
	{data}
	emptyMessage="No speed run results found"
	headers={['Date', 'Quiz', 'Player', 'Score', 'Time', 'Status', 'Actions']}
>
	{#snippet aboveTable()}
		<div class="rounded-lg bg-admin-surface-elevated p-4 shadow">
			<h2 class="mb-3 text-lg font-medium text-admin-text-primary">Clear Leaderboards</h2>
			<div class="flex flex-wrap gap-2">
				{#each data.quizzes as quiz (quiz.id)}
					<button
						onclick={() => openClearModal(quiz)}
						class="rounded bg-admin-accent-red-bg px-3 py-1 text-sm text-admin-accent-red-text hover:bg-admin-surface-muted"
					>
						Clear {quiz.title}
					</button>
				{/each}
			</div>
		</div>
	{/snippet}
	{#each data.items as result (result.id)}
		<tr class="hover:bg-admin-surface-muted {result.isSuspicious ? 'bg-admin-accent-red-bg' : ''}">
			<td class="px-6 py-4 text-sm whitespace-nowrap text-admin-text-muted">
				<time title={new Date(result.createdAt).toLocaleString()}>
					{formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
				</time>
			</td>
			<td class="px-6 py-4 whitespace-nowrap">
				<a
					href="/{result.speedRun.quiz.creator.slug}/{result.speedRun.quiz.slug}"
					target="_blank"
					class="text-sm font-medium text-admin-accent-violet-text hover:text-admin-text-primary"
				>
					{result.speedRun.quiz.title}
				</a>
			</td>
			<td class="px-6 py-4 whitespace-nowrap">
				{#if result.user}
					<a
						href="/admin/users/{result.user.id}"
						class="text-sm text-admin-accent-violet-text hover:text-admin-text-primary"
					>
						{result.user.name || result.user.slug}
					</a>
				{:else}
					<span class="text-sm text-admin-text-muted">{result.displayName}</span>
				{/if}
			</td>
			<td class="px-6 py-4 whitespace-nowrap">
				<div class="text-sm font-medium text-admin-text-primary">
					{result.correctCount}/{result.totalQuestions}
				</div>
				<div class="text-xs text-admin-text-muted">
					Score: {result.score.toLocaleString()}
				</div>
			</td>
			<td class="px-6 py-4 text-sm whitespace-nowrap text-admin-text-muted">
				{formatTime(result.totalTimeMs)}
			</td>
			<td class="px-6 py-4 whitespace-nowrap">
				{#if result.isSuspicious}
					<span
						class="inline-flex items-center rounded-full bg-admin-accent-red-bg px-2.5 py-0.5 text-xs font-medium text-admin-accent-red-text"
					>
						Suspicious
					</span>
				{:else}
					<span
						class="inline-flex items-center rounded-full bg-admin-accent-emerald-bg px-2.5 py-0.5 text-xs font-medium text-admin-accent-emerald-text"
					>
						Valid
					</span>
				{/if}
			</td>
			<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
				<button
					onclick={() => openDeleteModal(result)}
					class="text-admin-accent-red-text hover:text-admin-text-primary"
				>
					Delete
				</button>
			</td>
		</tr>
	{/each}
</AdminDataTable>

<!-- Delete Result Modal -->
{#if showDeleteModal && resultToDelete}
	<div
		class="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-admin-surface-subtle"
	>
		<div class="mx-4 w-full max-w-md rounded-lg bg-admin-surface-elevated p-6">
			<h3 class="mb-2 text-lg font-medium text-admin-text-primary">Delete Speed Run Result</h3>
			<p class="mb-4 text-sm text-admin-text-secondary">
				Are you sure you want to delete this result for <strong>{resultToDelete.displayName}</strong
				>
				on <strong>{resultToDelete.speedRun.quiz.title}</strong>?
			</p>
			<div class="mb-4 rounded bg-admin-surface-muted p-3">
				<p class="text-sm">
					<strong>Score:</strong>
					{resultToDelete.correctCount}/{resultToDelete.totalQuestions}
				</p>
				<p class="text-sm text-admin-text-secondary">
					<strong class="text-admin-text-primary">Time:</strong>
					{formatTime(resultToDelete.totalTimeMs)}
				</p>
				<p class="text-sm text-admin-text-secondary">
					<strong class="text-admin-text-primary">Points:</strong>
					{resultToDelete.score.toLocaleString()}
				</p>
			</div>
			<form method="POST" action="?/delete" class="flex justify-end gap-3">
				<input type="hidden" name="resultId" value={resultToDelete.id} />
				<Button type="button" onclick={() => (showDeleteModal = false)} variant="outline" size="sm"
					>Cancel</Button
				>
				<Button type="submit" variant="danger" size="sm">Delete Result</Button>
			</form>
		</div>
	</div>
{/if}

<!-- Clear Leaderboard Modal -->
{#if showClearModal && quizToClear}
	<div
		class="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-admin-surface-subtle"
	>
		<div class="mx-4 w-full max-w-lg rounded-lg bg-admin-surface-elevated p-6">
			<h3 class="mb-2 text-lg font-medium text-admin-text-primary">Clear Leaderboard</h3>
			<p class="mb-4 text-sm text-admin-text-secondary">
				Are you sure you want to clear the entire leaderboard for <strong
					>{quizToClear.title}</strong
				>? This will delete ALL speed run results for this quiz and cannot be undone.
			</p>
			<div class="mb-4 rounded-md border border-admin-border bg-admin-accent-red-bg p-3">
				<p class="text-sm text-admin-accent-red-text">
					<strong>Warning:</strong> This action permanently deletes all results. Users will lose their
					scores.
				</p>
			</div>
			<form method="POST" action="?/clearLeaderboard" class="space-y-4">
				<input type="hidden" name="speedRunId" value={quizToClear.id} />
				<div>
					<label
						for="clear-confirm-title"
						class="mb-1 block text-sm font-medium text-admin-text-primary"
					>
						Type the quiz title to confirm: <code class="rounded bg-admin-surface-subtle px-1"
							>{quizToClear.title}</code
						>
					</label>
					<input
						id="clear-confirm-title"
						type="text"
						name="confirmTitle"
						bind:value={clearConfirmTitle}
						required
						class="w-full rounded-md border-admin-border shadow-sm focus:border-admin-accent-violet-border focus:ring-admin-accent-violet-border sm:text-sm"
						placeholder="Type exact title here..."
					/>
				</div>
				<div class="flex justify-end gap-3">
					<Button type="button" onclick={() => (showClearModal = false)} variant="outline" size="sm"
						>Cancel</Button
					>
					<Button
						type="submit"
						disabled={clearConfirmTitle !== quizToClear.title}
						variant="danger"
						size="sm">Clear Leaderboard</Button
					>
				</div>
			</form>
		</div>
	</div>
{/if}
