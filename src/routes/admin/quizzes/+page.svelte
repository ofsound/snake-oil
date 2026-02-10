<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import { formatDistanceToNow } from 'date-fns';

	import Button from '$lib/components/Button.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import Pagination from '$lib/components/Pagination.svelte';

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
		const params = new SvelteURLSearchParams();

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

<PageContainer>
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-admin-text-primary">Quizzes</h1>
				<p class="mt-1 text-sm text-admin-text-muted">Manage all quizzes on the platform</p>
			</div>
		</div>

		<!-- Filters -->
		<div class="rounded-lg bg-admin-surface-elevated p-4 shadow">
			<form
				class="flex flex-wrap items-end gap-4"
				onsubmit={(e) => {
					e.preventDefault();
					updateSearch(e.currentTarget);
				}}
			>
				<div class="min-w-[200px] flex-1">
					<label for="filter-search" class="mb-1 block text-sm font-medium text-admin-text-primary"
						>Search</label
					>
					<input
						id="filter-search"
						type="text"
						name="search"
						value={data.filters.search}
						placeholder="Quiz title or description..."
						class="w-full rounded-md border-admin-border shadow-sm focus:border-admin-accent-violet-border focus:ring-admin-accent-violet-border sm:text-sm"
					/>
				</div>

				<div>
					<label
						for="filter-visibility"
						class="mb-1 block text-sm font-medium text-admin-text-primary">Visibility</label
					>
					<select
						id="filter-visibility"
						name="visibility"
						class="rounded-md border-admin-border shadow-sm focus:border-admin-accent-violet-border focus:ring-admin-accent-violet-border sm:text-sm"
					>
						<option value="all" selected={data.filters.visibility === 'all'}>All</option>
						<option value="public" selected={data.filters.visibility === 'public'}>Public</option>
						<option value="private" selected={data.filters.visibility === 'private'}>Private</option
						>
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
						<option value="created" selected={data.filters.sort === 'created'}>Created Date</option>
						<option value="title" selected={data.filters.sort === 'title'}>Title</option>
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
						<option value="desc" selected={data.filters.order === 'desc'}>Newest First</option>
						<option value="asc" selected={data.filters.order === 'asc'}>Oldest First</option>
					</select>
				</div>

				<Button type="submit" variant="admin" size="sm">Filter</Button>
			</form>
		</div>

		<!-- Quizzes Table -->
		<div class="overflow-hidden rounded-lg bg-admin-surface-elevated shadow">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-admin-border">
					<thead class="bg-admin-surface-muted">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Quiz</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Creator</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Visibility</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Type</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Created</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-admin-border bg-admin-surface-elevated">
						{#if data.quizzes.length === 0}
							<tr>
								<td colspan="6" class="px-6 py-8 text-center text-sm text-admin-text-muted">
									No quizzes found
								</td>
							</tr>
						{:else}
							{#each data.quizzes as quiz (quiz.id)}
								<tr class="hover:bg-admin-surface-muted">
									<td class="px-6 py-4">
										<div class="text-sm font-medium text-admin-text-primary">{quiz.title}</div>
										<div class="max-w-xs truncate text-sm text-admin-text-muted">
											{quiz.description}
										</div>
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
				basePath="/admin/quizzes"
				itemName="quizzes"
			/>
		</div>
	</div></PageContainer
>

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
