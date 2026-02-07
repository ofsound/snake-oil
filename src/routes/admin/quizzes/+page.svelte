<script lang="ts">
	import { formatDistanceToNow } from 'date-fns';

	let { data } = $props();

	let showDeleteModal = $state(false);
	let quizToDelete: (typeof data.quizzes)[0] | null = $state(null);
	let deleteConfirmTitle = $state('');

	function openDeleteModal(quiz: (typeof data.quizzes)[0]) {
		quizToDelete = quiz;
		deleteConfirmTitle = '';
		showDeleteModal = true;
	}

	function updateSearch(form: HTMLFormElement) {
		const formData = new FormData(form);
		const params = new URLSearchParams();

		const search = formData.get('search')?.toString();
		const visibility = formData.get('visibility')?.toString();
		const sort = formData.get('sort')?.toString();
		const order = formData.get('order')?.toString();

		if (search) params.set('search', search);
		if (visibility && visibility !== 'all') params.set('visibility', visibility);
		if (sort) params.set('sort', sort);
		if (order) params.set('order', order);

		window.location.href = `/admin/quizzes?${params.toString()}`;
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Quizzes</h1>
			<p class="mt-1 text-sm text-gray-500">Manage all quizzes on the platform</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="rounded-lg bg-white p-4 shadow">
		<form
			class="flex flex-wrap items-end gap-4"
			onsubmit={(e) => {
				e.preventDefault();
				updateSearch(e.currentTarget);
			}}
		>
			<div class="min-w-[200px] flex-1">
				<label class="mb-1 block text-sm font-medium text-gray-700">Search</label>
				<input
					type="text"
					name="search"
					value={data.filters.search}
					placeholder="Quiz title or description..."
					class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				/>
			</div>

			<div>
				<label class="mb-1 block text-sm font-medium text-gray-700">Visibility</label>
				<select
					name="visibility"
					class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				>
					<option value="all" selected={data.filters.visibility === 'all'}>All</option>
					<option value="public" selected={data.filters.visibility === 'public'}>Public</option>
					<option value="private" selected={data.filters.visibility === 'private'}>Private</option>
				</select>
			</div>

			<div>
				<label class="mb-1 block text-sm font-medium text-gray-700">Sort</label>
				<select
					name="sort"
					class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				>
					<option value="created" selected={data.filters.sort === 'created'}>Created Date</option>
					<option value="title" selected={data.filters.sort === 'title'}>Title</option>
				</select>
			</div>

			<div>
				<label class="mb-1 block text-sm font-medium text-gray-700">Order</label>
				<select
					name="order"
					class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				>
					<option value="desc" selected={data.filters.order === 'desc'}>Newest First</option>
					<option value="asc" selected={data.filters.order === 'asc'}>Oldest First</option>
				</select>
			</div>

			<button
				type="submit"
				class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
			>
				Filter
			</button>
		</form>
	</div>

	<!-- Quizzes Table -->
	<div class="overflow-hidden rounded-lg bg-white shadow">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Quiz</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Owner</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Visibility</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Type</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Created</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Actions</th
						>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#if data.quizzes.length === 0}
						<tr>
							<td colspan="6" class="px-6 py-8 text-center text-sm text-gray-500">
								No quizzes found
							</td>
						</tr>
					{:else}
						{#each data.quizzes as quiz (quiz.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4">
									<div class="text-sm font-medium text-gray-900">{quiz.title}</div>
									<div class="max-w-xs truncate text-sm text-gray-500">{quiz.description}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<a
										href="/admin/users/{quiz.ownerId}"
										class="text-sm text-blue-600 hover:text-blue-900"
									>
										{quiz.ownerName || quiz.ownerSlug}
									</a>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{#if quiz.visibility === 'public'}
										<span
											class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
										>
											Public
										</span>
									{:else}
										<span
											class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
										>
											Private
										</span>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									{#if quiz.speedRunId}
										<span
											class="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800"
										>
											Speed Run
										</span>
									{:else}
										<span class="text-sm text-gray-500">Regular</span>
									{/if}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
									<time title={new Date(quiz.createdAt).toLocaleString()}>
										{formatDistanceToNow(new Date(quiz.createdAt), { addSuffix: true })}
									</time>
								</td>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
									<div class="flex gap-2">
										<a
											href="/{quiz.ownerSlug}/{quiz.slug}"
											target="_blank"
											class="text-blue-600 hover:text-blue-900"
										>
											View
										</a>
										<button
											onclick={() => openDeleteModal(quiz)}
											class="text-red-600 hover:text-red-900"
										>
											Delete
										</button>
									</div>
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
									data.pagination.totalQuizzes
								)}</span
							>
							of <span class="font-medium">{data.pagination.totalQuizzes}</span> quizzes
						</p>
					</div>
					<div>
						<nav
							class="relative z-0 inline-flex -space-x-px rounded-md shadow-sm"
							aria-label="Pagination"
						>
							{#if data.pagination.page > 1}
								<a
									href="/admin/quizzes?page={data.pagination.page - 1}"
									class="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
								>
									Previous
								</a>
							{/if}
							{#if data.pagination.page < data.pagination.totalPages}
								<a
									href="/admin/quizzes?page={data.pagination.page + 1}"
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

<!-- Delete Modal -->
{#if showDeleteModal && quizToDelete}
	<div class="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-gray-500">
		<div class="mx-4 w-full max-w-lg rounded-lg bg-white p-6">
			<h3 class="mb-2 text-lg font-medium text-gray-900">Delete Quiz</h3>
			<p class="mb-4 text-sm text-gray-600">
				Are you sure you want to delete <strong>{quizToDelete.title}</strong>? This action cannot be
				undone. All questions, submissions, and speed run results will be permanently deleted.
			</p>
			<div class="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-3">
				<p class="text-sm text-yellow-800">
					<strong>Warning:</strong> This quiz has {quizToDelete.speedRunId
						? 'speed run enabled'
						: 'regular mode'} and belongs to {quizToDelete.ownerName || quizToDelete.ownerSlug}.
				</p>
			</div>
			<form method="POST" action="?/delete" class="space-y-4">
				<input type="hidden" name="quizId" value={quizToDelete.id} />
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700">
						Type the quiz title to confirm: <code class="rounded bg-gray-100 px-1"
							>{quizToDelete.title}</code
						>
					</label>
					<input
						type="text"
						name="confirmTitle"
						bind:value={deleteConfirmTitle}
						required
						class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
						placeholder="Type exact title here..."
					/>
				</div>
				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={() => (showDeleteModal = false)}
						class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={deleteConfirmTitle !== quizToDelete.title}
						class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
					>
						Delete Quiz
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
