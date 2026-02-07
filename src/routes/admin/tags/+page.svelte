<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import FormField from '$lib/components/FormField.svelte';
	import FormInput from '$lib/components/FormInput.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import { fade, fly } from 'svelte/transition';

	let { data, form } = $props();

	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showDeleteModal = $state(false);
	let showMergeModal = $state(false);
	let selectedTag = $state<(typeof data.tags)[0] | null>(null);
	let searchQuery = $state(data.search ?? '');
	let submitting = $state(false);
	let selectedTagsForMerge = $state<string[]>([]);

	function openEditModal(tag: (typeof data.tags)[0]) {
		selectedTag = tag;
		showEditModal = true;
	}

	function openDeleteModal(tag: (typeof data.tags)[0]) {
		selectedTag = tag;
		showDeleteModal = true;
	}

	function toggleTagForMerge(tagId: string) {
		if (selectedTagsForMerge.includes(tagId)) {
			selectedTagsForMerge = selectedTagsForMerge.filter((id) => id !== tagId);
		} else {
			selectedTagsForMerge = [...selectedTagsForMerge, tagId];
		}
	}

	function openMergeModal() {
		if (selectedTagsForMerge.length < 2) {
			alert('Please select at least 2 tags to merge');
			return;
		}
		showMergeModal = true;
	}

	function getSortUrl(field: string) {
		const params = new URLSearchParams();
		if (data.search) params.set('search', data.search);
		if (data.filter && data.filter !== 'all') params.set('filter', data.filter);
		params.set('sort', field);
		params.set('order', data.sortBy === field && data.order === 'desc' ? 'asc' : 'desc');
		params.set('page', '1');
		return `?${params.toString()}`;
	}

	function getFilterUrl(filter: string) {
		const params = new URLSearchParams();
		if (data.search) params.set('search', data.search);
		if (data.sortBy) params.set('sort', data.sortBy);
		if (data.order) params.set('order', data.order);
		if (filter !== 'all') params.set('filter', filter);
		params.set('page', '1');
		return `?${params.toString()}`;
	}
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<Heading level={1} class="mb-2">Tag Manager</Heading>
	<p class="mb-8 text-gray-600 dark:text-gray-400">
		Manage quiz tags, view statistics, and organize your taxonomy
	</p>

	<!-- Statistics Cards -->
	<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card variant="flat" padding="md">
			<div class="text-center">
				<div class="text-3xl font-bold text-indigo-600">{data.stats.total}</div>
				<div class="text-sm text-gray-600">Total Tags</div>
			</div>
		</Card>
		<Card variant="flat" padding="md">
			<div class="text-center">
				<div class="text-3xl font-bold text-emerald-600">{data.stats.popular}</div>
				<div class="text-sm text-gray-600">Popular (10+)</div>
			</div>
		</Card>
		<Card variant="flat" padding="md">
			<div class="text-center">
				<div class="text-3xl font-bold text-amber-600">{data.stats.unused}</div>
				<div class="text-sm text-gray-600">Unused</div>
			</div>
		</Card>
		<Card variant="flat" padding="md">
			<div class="text-center">
				<div class="text-3xl font-bold text-purple-600">
					{data.pagination.totalPages}
				</div>
				<div class="text-sm text-gray-600">Pages</div>
			</div>
		</Card>
	</div>

	<!-- Actions Bar -->
	<div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-wrap gap-2">
			<Button variant="primary" onclick={() => (showCreateModal = true)}>Create New Tag</Button>
			{#if selectedTagsForMerge.length >= 2}
				<Button variant="accent" onclick={openMergeModal}>
					Merge Selected ({selectedTagsForMerge.length})
				</Button>
			{/if}
			<form method="POST" action="?/recalculate" use:enhance class="inline">
				<Button type="submit" variant="outline" size="sm">Recalculate Counts</Button>
			</form>
		</div>

		<div class="flex flex-wrap gap-2">
			<a
				href={getFilterUrl('all')}
				class="rounded-full px-4 py-2 text-sm transition-colors {data.filter === 'all' ||
				!data.filter
					? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
					: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}"
			>
				All
			</a>
			<a
				href={getFilterUrl('popular')}
				class="rounded-full px-4 py-2 text-sm transition-colors {data.filter === 'popular'
					? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
					: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}"
			>
				Popular
			</a>
			<a
				href={getFilterUrl('unused')}
				class="rounded-full px-4 py-2 text-sm transition-colors {data.filter === 'unused'
					? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
					: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}"
			>
				Unused
			</a>
		</div>

		<form class="flex gap-2" method="GET">
			{#if data.sortBy}<input type="hidden" name="sort" value={data.sortBy} />{/if}
			{#if data.order}<input type="hidden" name="order" value={data.order} />{/if}
			{#if data.filter}<input type="hidden" name="filter" value={data.filter} />{/if}
			<FormInput
				type="search"
				name="search"
				placeholder="Search tags..."
				bind:value={searchQuery}
				class="w-48"
			/>
			<Button type="submit" variant="outline" size="sm">Search</Button>
		</form>
	</div>

	<!-- Tag List -->
	<Card variant="flat" padding="none" class="overflow-hidden">
		<table class="w-full">
			<thead class="bg-gray-50 dark:bg-gray-800">
				<tr>
					<th class="px-4 py-3 text-left text-sm font-medium text-gray-600">
						<input
							type="checkbox"
							class="rounded border-gray-300"
							onchange={(e) => {
								if (e.currentTarget.checked) {
									selectedTagsForMerge = data.tags.map((t) => t.id);
								} else {
									selectedTagsForMerge = [];
								}
							}}
						/>
					</th>
					<th class="px-4 py-3 text-left">
						<a
							href={getSortUrl('label')}
							class="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
						>
							Label
							{#if data.sortBy === 'label'}
								<span>{data.order === 'asc' ? '↑' : '↓'}</span>
							{/if}
						</a>
					</th>
					<th class="px-4 py-3 text-left text-sm font-medium text-gray-600">Slug</th>
					<th class="px-4 py-3 text-left">
						<a
							href={getSortUrl('useCount')}
							class="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
						>
							Use Count
							{#if data.sortBy === 'useCount' || !data.sortBy}
								<span>{data.order === 'asc' ? '↑' : '↓'}</span>
							{/if}
						</a>
					</th>
					<th class="px-4 py-3 text-left text-sm font-medium text-gray-600">Created</th>
					<th class="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
				{#each data.tags as tag (tag.id)}
					<tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
						<td class="px-4 py-3">
							<input
								type="checkbox"
								class="rounded border-gray-300"
								checked={selectedTagsForMerge.includes(tag.id)}
								onchange={() => toggleTagForMerge(tag.id)}
							/>
						</td>
						<td class="px-4 py-3 font-medium">{tag.label}</td>
						<td class="px-4 py-3 text-sm text-gray-600">{tag.slug}</td>
						<td class="px-4 py-3">
							<span
								class="inline-flex rounded-full px-2 py-1 text-xs font-medium {tag.useCount >= 10
									? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
									: tag.useCount === 0
										? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
										: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}"
							>
								{tag.useCount}
							</span>
						</td>
						<td class="px-4 py-3 text-sm text-gray-600">
							{new Date(tag.createdAt).toLocaleDateString()}
						</td>
						<td class="px-4 py-3 text-right">
							<div class="flex justify-end gap-2">
								<Button variant="ghost" size="sm" onclick={() => openEditModal(tag)}>Edit</Button>
								<Button variant="ghost" size="sm" onclick={() => openDeleteModal(tag)}>
									<span class="text-red-600 hover:text-red-700">Delete</span>
								</Button>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="px-4 py-8 text-center text-gray-500">
							No tags found. Create your first tag to get started.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</Card>

	<!-- Pagination -->
	{#if data.pagination.totalPages > 1}
		<div class="mt-6 flex items-center justify-between">
			<div class="text-sm text-gray-600">
				Showing {(data.pagination.page - 1) * data.pagination.itemsPerPage + 1} to {Math.min(
					data.pagination.page * data.pagination.itemsPerPage,
					data.pagination.totalItems
				)} of {data.pagination.totalItems} tags
			</div>
			<div class="flex gap-2">
				{#if data.pagination.page > 1}
					{@const prevParams = new URLSearchParams()}
					{#if data.search}{prevParams.set('search', data.search)}{/if}
					{#if data.filter}{prevParams.set('filter', data.filter)}{/if}
					{#if data.sortBy}{prevParams.set('sort', data.sortBy)}{/if}
					{#if data.order}{prevParams.set('order', data.order)}{/if}
					{prevParams.set('page', String(data.pagination.page - 1))}
					<a
						href="?{prevParams.toString()}"
						class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
					>
						Previous
					</a>
				{/if}
				{#if data.pagination.page < data.pagination.totalPages}
					{@const nextParams = new URLSearchParams()}
					{#if data.search}{nextParams.set('search', data.search)}{/if}
					{#if data.filter}{nextParams.set('filter', data.filter)}{/if}
					{#if data.sortBy}{nextParams.set('sort', data.sortBy)}{/if}
					{#if data.order}{nextParams.set('order', data.order)}{/if}
					{nextParams.set('page', String(data.pagination.page + 1))}
					<a
						href="?{nextParams.toString()}"
						class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
					>
						Next
					</a>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Popular Tags Sidebar -->
	{#if data.popularTags.length > 0}
		<div class="mt-8">
			<Heading level={2} class="mb-4 text-lg">Most Popular Tags</Heading>
			<div class="flex flex-wrap gap-2">
				{#each data.popularTags as tag}
					<a
						href="/quizzes/tag/{tag.slug}"
						class="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800"
					>
						{tag.label}
						<span class="ml-1 text-xs opacity-75">({tag.useCount})</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Create Tag Modal -->
{#if showCreateModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (showCreateModal = false)}
		transition:fade={{ duration: 200 }}
	>
		<div transition:fly={{ y: 20, duration: 200 }}>
			<Card variant="flat" padding="lg" class="w-full max-w-md">
				<Heading level={2} class="mb-4">Create New Tag</Heading>
				{#if form?.error}
					<div class="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
						{form.error}
					</div>
				{/if}
				<form
					method="POST"
					action="?/create"
					use:enhance={() => {
						submitting = true;
						return async ({ result, update }) => {
							submitting = false;
							if (result.type === 'success') {
								showCreateModal = false;
							}
							await update();
						};
					}}
				>
					<FormField label="Tag Label" id="label">
						<FormInput id="label" name="label" required placeholder="e.g., jazz" />
					</FormField>
					<div class="mt-4 flex justify-end gap-2">
						<Button type="button" variant="ghost" onclick={() => (showCreateModal = false)}>
							Cancel
						</Button>
						<Button type="submit" variant="primary" loading={submitting}>Create Tag</Button>
					</div>
				</form>
			</Card>
		</div>
	</div>
{/if}

<!-- Edit Tag Modal -->
{#if showEditModal && selectedTag}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (showEditModal = false)}
		transition:fade={{ duration: 200 }}
	>
		<div transition:fly={{ y: 20, duration: 200 }}>
			<Card variant="flat" padding="lg" class="w-full max-w-md">
				<Heading level={2} class="mb-4">Edit Tag</Heading>
				{#if form?.error}
					<div class="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
						{form.error}
					</div>
				{/if}
				<form
					method="POST"
					action="?/update"
					use:enhance={() => {
						submitting = true;
						return async ({ result, update }) => {
							submitting = false;
							if (result.type === 'success') {
								showEditModal = false;
								selectedTag = null;
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={selectedTag.id} />
					<FormField label="Tag Label" id="edit-label">
						<FormInput id="edit-label" name="label" required value={selectedTag.label} />
					</FormField>
					<div class="mt-4 flex justify-end gap-2">
						<Button type="button" variant="ghost" onclick={() => (showEditModal = false)}>
							Cancel
						</Button>
						<Button type="submit" variant="primary" loading={submitting}>Save Changes</Button>
					</div>
				</form>
			</Card>
		</div>
	</div>
{/if}

<!-- Delete Tag Modal -->
{#if showDeleteModal && selectedTag}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (showDeleteModal = false)}
		transition:fade={{ duration: 200 }}
	>
		<div transition:fly={{ y: 20, duration: 200 }}>
			<Card variant="flat" padding="lg" class="w-full max-w-md">
				<Heading level={2} class="mb-4 text-red-600">Delete Tag</Heading>
				<p class="mb-4 text-gray-600">
					Are you sure you want to delete the tag "<strong>{selectedTag.label}</strong>"?
				</p>
				{#if selectedTag.useCount > 0}
					<div class="mb-4 rounded-lg bg-amber-100 p-3 text-sm text-amber-800">
						Warning: This tag is used by {selectedTag.useCount} quiz{selectedTag.useCount === 1
							? ''
							: 'es'}. Deleting it will remove the tag from all quizzes.
					</div>
				{/if}
				<form
					method="POST"
					action="?/delete"
					use:enhance={() => {
						submitting = true;
						return async ({ result, update }) => {
							submitting = false;
							if (result.type === 'success') {
								showDeleteModal = false;
								selectedTag = null;
							}
							await update();
						};
					}}
				>
					<input type="hidden" name="id" value={selectedTag.id} />
					<div class="flex justify-end gap-2">
						<Button type="button" variant="ghost" onclick={() => (showDeleteModal = false)}>
							Cancel
						</Button>
						<Button type="submit" variant="danger" loading={submitting}>Delete Tag</Button>
					</div>
				</form>
			</Card>
		</div>
	</div>
{/if}

<!-- Merge Tags Modal -->
{#if showMergeModal && selectedTagsForMerge.length >= 2}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={() => (showMergeModal = false)}
		transition:fade={{ duration: 200 }}
	>
		<div transition:fly={{ y: 20, duration: 200 }}>
			<Card variant="flat" padding="lg" class="w-full max-w-lg">
				<Heading level={2} class="mb-4">Merge Tags</Heading>
				<p class="mb-4 text-gray-600">
					Select a target tag to merge {selectedTagsForMerge.length} selected tags into:
				</p>
				{#if form?.error}
					<div class="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">
						{form.error}
					</div>
				{/if}
				<form
					method="POST"
					action="?/merge"
					use:enhance={() => {
						submitting = true;
						return async ({ result, update }) => {
							submitting = false;
							if (result.type === 'success') {
								showMergeModal = false;
								selectedTagsForMerge = [];
							}
							await update();
						};
					}}
				>
					{#each selectedTagsForMerge as tagId}
						<input type="hidden" name="sourceIds" value={tagId} />
					{/each}
					<FormField label="Target Tag" id="target-tag">
						<select
							id="target-tag"
							name="targetId"
							required
							class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-700"
						>
							<option value="">Select a tag...</option>
							{#each data.tags.filter((t) => !selectedTagsForMerge.includes(t.id)) as tag}
								<option value={tag.id}>{tag.label} ({tag.useCount} uses)</option>
							{/each}
						</select>
					</FormField>
					<div class="mt-4 flex justify-end gap-2">
						<Button type="button" variant="ghost" onclick={() => (showMergeModal = false)}>
							Cancel
						</Button>
						<Button type="submit" variant="primary" loading={submitting}>Merge Tags</Button>
					</div>
				</form>
			</Card>
		</div>
	</div>
{/if}
