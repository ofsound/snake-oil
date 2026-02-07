<script lang="ts">
	import { formatDistanceToNow } from 'date-fns';

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
		const params = new URLSearchParams();

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

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Speed Run Results</h1>
		<p class="mt-1 text-sm text-gray-500">Manage speed run results and leaderboards</p>
	</div>

	<!-- Filters -->
	<div class="rounded-lg bg-white p-4 shadow">
		<form
			class="flex flex-wrap items-end gap-4"
			onsubmit={(e) => {
				e.preventDefault();
				updateFilters(e.currentTarget);
			}}
		>
			<div>
				<label class="mb-1 block text-sm font-medium text-gray-700">Quiz</label>
				<select
					name="quiz"
					class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
				<label class="mb-1 block text-sm font-medium text-gray-700">Sort</label>
				<select
					name="sort"
					class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				>
					<option value="created" selected={data.filters.sort === 'created'}>Date</option>
					<option value="score" selected={data.filters.sort === 'score'}>Score</option>
					<option value="time" selected={data.filters.sort === 'time'}>Time</option>
				</select>
			</div>

			<div>
				<label class="mb-1 block text-sm font-medium text-gray-700">Order</label>
				<select
					name="order"
					class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
						class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<span class="ml-2 text-sm text-gray-700">Suspicious only (&lt;1s/question)</span>
				</label>
			</div>

			<button
				type="submit"
				class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
			>
				Filter
			</button>
		</form>
	</div>

	<!-- Clear Leaderboards Section -->
	<div class="rounded-lg bg-white p-4 shadow">
		<h2 class="mb-3 text-lg font-medium text-gray-900">Clear Leaderboards</h2>
		<div class="flex flex-wrap gap-2">
			{#each data.quizzes as quiz (quiz.id)}
				<button
					onclick={() => openClearModal(quiz)}
					class="rounded bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200"
				>
					Clear {quiz.title}
				</button>
			{/each}
		</div>
	</div>

	<!-- Results Table -->
	<div class="overflow-hidden rounded-lg bg-white shadow">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Date</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Quiz</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Player</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Score</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Time</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Status</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Actions</th
						>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#if data.results.length === 0}
						<tr>
							<td colspan="7" class="px-6 py-8 text-center text-sm text-gray-500">
								No speed run results found
							</td>
						</tr>
					{:else}
						{#each data.results as result (result.id)}
							<tr class="hover:bg-gray-50 {result.isSuspicious ? 'bg-red-50' : ''}">
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
									<time title={new Date(result.createdAt).toLocaleString()}>
										{formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
									</time>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<a
										href="/{result.speedRun.quiz.owner.slug}/{result.speedRun.quiz.slug}"
										target="_blank"
										class="text-sm font-medium text-blue-600 hover:text-blue-900"
									>
										{result.speedRun.quiz.title}
									</a>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{#if result.user}
										<a
											href="/admin/users/{result.user.id}"
											class="text-sm text-blue-600 hover:text-blue-900"
										>
											{result.user.name || result.user.slug}
										</a>
									{:else}
										<span class="text-sm text-gray-500">{result.displayName}</span>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">
										{result.correctCount}/{result.totalQuestions}
									</div>
									<div class="text-xs text-gray-500">
										Score: {result.score.toLocaleString()}
									</div>
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
									{formatTime(result.totalTimeMs)}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{#if result.isSuspicious}
										<span
											class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
										>
											Suspicious
										</span>
									{:else}
										<span
											class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
										>
											Valid
										</span>
									{/if}
								</td>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
									<button
										onclick={() => openDeleteModal(result)}
										class="text-red-600 hover:text-red-900"
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

		<!-- Pagination -->
		{#if data.pagination.totalPages > 1}
			<div
				class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
			>
				<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
					<div>
						<p class="text-sm text-gray-700">
							Showing <span class="font-medium"
								>{(data.pagination.page - 1) * data.pagination.pageSize + 1}</span
							>
							to
							<span class="font-medium"
								>{Math.min(
									data.pagination.page * data.pagination.pageSize,
									data.pagination.totalResults
								)}</span
							>
							of <span class="font-medium">{data.pagination.totalResults}</span> results
						</p>
					</div>
					<div>
						<nav
							class="relative z-0 inline-flex -space-x-px rounded-md shadow-sm"
							aria-label="Pagination"
						>
							{#if data.pagination.page > 1}
								<a
									href="/admin/speed-runs?page={data.pagination.page - 1}"
									class="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
								>
									Previous
								</a>
							{/if}
							{#if data.pagination.page < data.pagination.totalPages}
								<a
									href="/admin/speed-runs?page={data.pagination.page + 1}"
									class="relative inline-flex items-center rounded-r-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
								>
									Next
								</a>
							{/if}
						</nav>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Delete Result Modal -->
{#if showDeleteModal && resultToDelete}
	<div class="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-gray-500">
		<div class="mx-4 w-full max-w-md rounded-lg bg-white p-6">
			<h3 class="mb-2 text-lg font-medium text-gray-900">Delete Speed Run Result</h3>
			<p class="mb-4 text-sm text-gray-600">
				Are you sure you want to delete this result for <strong>{resultToDelete.displayName}</strong
				>
				on <strong>{resultToDelete.speedRun.quiz.title}</strong>?
			</p>
			<div class="mb-4 rounded bg-gray-50 p-3">
				<p class="text-sm">
					<strong>Score:</strong>
					{resultToDelete.correctCount}/{resultToDelete.totalQuestions}
				</p>
				<p class="text-sm"><strong>Time:</strong> {formatTime(resultToDelete.totalTimeMs)}</p>
				<p class="text-sm"><strong>Points:</strong> {resultToDelete.score.toLocaleString()}</p>
			</div>
			<form method="POST" action="?/delete" class="flex justify-end gap-3">
				<input type="hidden" name="resultId" value={resultToDelete.id} />
				<button
					type="button"
					onclick={() => (showDeleteModal = false)}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					type="submit"
					class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
				>
					Delete Result
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- Clear Leaderboard Modal -->
{#if showClearModal && quizToClear}
	<div class="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-gray-500">
		<div class="mx-4 w-full max-w-lg rounded-lg bg-white p-6">
			<h3 class="mb-2 text-lg font-medium text-gray-900">Clear Leaderboard</h3>
			<p class="mb-4 text-sm text-gray-600">
				Are you sure you want to clear the entire leaderboard for <strong
					>{quizToClear.title}</strong
				>? This will delete ALL speed run results for this quiz and cannot be undone.
			</p>
			<div class="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
				<p class="text-sm text-red-800">
					<strong>Warning:</strong> This action permanently deletes all results. Users will lose their
					scores.
				</p>
			</div>
			<form method="POST" action="?/clearLeaderboard" class="space-y-4">
				<input type="hidden" name="speedRunId" value={quizToClear.id} />
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">
						Type the quiz title to confirm: <code class="rounded bg-gray-100 px-1"
							>{quizToClear.title}</code
						>
					</label>
					<input
						type="text"
						name="confirmTitle"
						bind:value={clearConfirmTitle}
						required
						class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
						placeholder="Type exact title here..."
					/>
				</div>
				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={() => (showClearModal = false)}
						class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={clearConfirmTitle !== quizToClear.title}
						class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
					>
						Clear Leaderboard
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
