<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import { formatDistanceToNow } from 'date-fns';

	import Button from '$lib/components/Button.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import Pagination from '$lib/components/Pagination.svelte';

	let { data } = $props();

	let showDeleteModal = $state(false);
	let resultToDelete: (typeof data.results)[0] | null = $state(null);
	let showClearModal = $state(false);
	let quizToClear: (typeof data.quizzes)[0] | null = $state(null);
	let clearConfirmTitle = $state('');

	function openDeleteModal(result: (typeof data.results)[0]) {
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

	function updateFilters(form: HTMLFormElement) {
		const formData = new FormData(form);
		const params = new SvelteURLSearchParams();

		const quiz = formData.get('quiz')?.toString();
		const sort = formData.get('sort')?.toString();
		const order = formData.get('order')?.toString();
		const suspicious = formData.get('suspicious')?.toString();

		if (quiz && quiz !== 'all') params.set('quiz', quiz);
		if (sort) params.set('sort', sort);
		if (order) params.set('order', order);
		if (suspicious === 'on') params.set('suspicious', 'true');

		window.location.href = `/admin/speed-runs?${params.toString()}`;
	}
</script>

<PageContainer>
	<div class="space-y-6">
		<div>
			<h1 class="text-2xl font-bold text-admin-text-primary">Speed Run Results</h1>
			<p class="mt-1 text-sm text-admin-text-muted">Manage speed run results and leaderboards</p>
		</div>

		<!-- Filters -->
		<div class="rounded-lg bg-admin-surface-elevated p-4 shadow">
			<form
				class="flex flex-wrap items-end gap-4"
				onsubmit={(e) => {
					e.preventDefault();
					updateFilters(e.currentTarget);
				}}
			>
				<div>
					<label for="filter-quiz" class="mb-1 block text-sm font-medium text-admin-text-primary"
						>Quiz</label
					>
					<select
						id="filter-quiz"
						name="quiz"
						class="rounded-md border-admin-border shadow-sm focus:border-admin-accent-violet-border focus:ring-admin-accent-violet-border sm:text-sm"
					>
						<option value="all" selected={data.filters.quiz === 'all'}>All Quizzes</option>
						{#each data.quizzes as quiz (quiz.id)}
							<option value={quiz.id} selected={data.filters.quiz === quiz.id}>
								{quiz.title}
							</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="filter-sort" class="mb-1 block text-sm font-medium text-admin-text-primary"
						>Sort</label
					>
					<select
						id="filter-sort"
						name="sort"
						class="rounded-md border-admin-border shadow-sm focus:border-admin-accent-violet-border focus:ring-admin-accent-violet-border sm:text-sm"
					>
						<option value="created" selected={data.filters.sort === 'created'}>Date</option>
						<option value="score" selected={data.filters.sort === 'score'}>Score</option>
						<option value="time" selected={data.filters.sort === 'time'}>Time</option>
					</select>
				</div>

				<div>
					<label for="filter-order" class="mb-1 block text-sm font-medium text-admin-text-primary"
						>Order</label
					>
					<select
						id="filter-order"
						name="order"
						class="rounded-md border-admin-border shadow-sm focus:border-admin-accent-violet-border focus:ring-admin-accent-violet-border sm:text-sm"
					>
						<option value="desc" selected={data.filters.order === 'desc'}>Best First</option>
						<option value="asc" selected={data.filters.order === 'asc'}>Worst First</option>
					</select>
				</div>

				<div class="flex items-center">
					<label class="flex items-center">
						<input
							type="checkbox"
							name="suspicious"
							checked={data.filters.suspicious}
							class="rounded border-admin-border text-admin-accent-violet-text focus:ring-admin-accent-violet-border"
						/>
						<span class="ml-2 text-sm text-admin-text-primary"
							>Suspicious only (&lt;1s/question)</span
						>
					</label>
				</div>

				<Button type="submit" variant="admin" size="sm">Filter</Button>
			</form>
		</div>

		<!-- Clear Leaderboards Section -->
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

		<!-- Results Table -->
		<div class="overflow-hidden rounded-lg bg-white shadow">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-admin-border">
					<thead class="bg-admin-surface-muted">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Date</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Quiz</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Player</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Score</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Time</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Status</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-admin-border bg-admin-surface-elevated">
						{#if data.results.length === 0}
							<tr>
								<td colspan="7" class="px-6 py-8 text-center text-sm text-admin-text-muted">
									No speed run results found
								</td>
							</tr>
						{:else}
							{#each data.results as result (result.id)}
								<tr
									class="hover:bg-admin-surface-muted {result.isSuspicious
										? 'bg-admin-accent-red-bg'
										: ''}"
								>
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
						{/if}
					</tbody>
				</table>
			</div>

			<Pagination
				currentPage={data.currentPage}
				totalPages={data.totalPages}
				totalItems={data.totalItems}
				itemsPerPage={data.itemsPerPage}
				mode="simple"
				navigation="ssr"
				variant="admin"
				basePath="/admin/speed-runs"
				itemName="results"
			/>
		</div>
	</div></PageContainer
>

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
