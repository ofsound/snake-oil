<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import { formatDistanceToNow } from 'date-fns';

	import Button from '$lib/components/Button.svelte';

	let { data } = $props();

	function formatAction(action: string): string {
		return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}

	function formatTargetType(type: string): string {
		return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}

	function updateFilters(form: HTMLFormElement) {
		const formData = new FormData(form);
		const params = new SvelteURLSearchParams();

		const action = formData.get('action')?.toString();
		const targetType = formData.get('targetType')?.toString();

		if (action && action !== 'all') params.set('action', action);
		if (targetType && targetType !== 'all') params.set('targetType', targetType);

		window.location.href = `/admin/audit-log?${params.toString()}`;
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">Audit Log</h1>
		<p class="mt-1 text-sm text-gray-500">Track all administrative actions across the platform</p>
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
				<label for="filter-action" class="mb-1 block text-sm font-medium text-gray-700"
					>Action Type</label
				>
				<select
					id="filter-action"
					name="action"
					class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				>
					<option value="all" selected={data.filters.action === 'all'}>All Actions</option>
					{#each data.filterOptions.actions as action (action)}
						<option value={action} selected={data.filters.action === action}>
							{formatAction(action)}
						</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="filter-target-type" class="mb-1 block text-sm font-medium text-gray-700"
					>Target Type</label
				>
				<select
					id="filter-target-type"
					name="targetType"
					class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
				>
					<option value="all" selected={data.filters.targetType === 'all'}>All Targets</option>
					{#each data.filterOptions.targetTypes as targetType (targetType)}
						<option value={targetType} selected={data.filters.targetType === targetType}>
							{formatTargetType(targetType)}
						</option>
					{/each}
				</select>
			</div>

			<Button type="submit" variant="admin" size="sm">Filter</Button>
		</form>
	</div>

	<!-- Actions Table -->
	<div class="overflow-hidden rounded-lg bg-white shadow">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Time</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Admin</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Action</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Target</th
						>
						<th
							class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>Details</th
						>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#if data.actions.length === 0}
						<tr>
							<td colspan="5" class="px-6 py-8 text-center text-sm text-gray-500">
								No admin actions found
							</td>
						</tr>
					{:else}
						{#each data.actions as action (action.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
									<time title={new Date(action.createdAt).toLocaleString()}>
										{formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
									</time>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">
										{action.admin?.name || 'Unknown'}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
									>
										{formatAction(action.action)}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900">{formatTargetType(action.targetType)}</div>
									{#if action.targetId}
										<div class="max-w-xs truncate text-xs text-gray-500">{action.targetId}</div>
									{/if}
									{#if action.targetOwner}
										<div class="mt-1 text-xs text-gray-400">
											Owner: {action.targetOwner.name || action.targetOwner.slug}
										</div>
									{/if}
								</td>
								<td class="px-6 py-4">
									{#if action.details && Object.keys(action.details).length > 0}
										<details class="text-sm">
											<summary class="cursor-pointer text-blue-600 hover:text-blue-800">
												View Details
											</summary>
											<pre
												class="mt-2 overflow-x-auto rounded bg-gray-50 p-2 text-xs">{JSON.stringify(
													action.details,
													null,
													2
												)}</pre>
										</details>
									{:else}
										<span class="text-sm text-gray-400">No details</span>
									{/if}
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
									data.pagination.totalActions
								)}</span
							>
							of <span class="font-medium">{data.pagination.totalActions}</span> actions
						</p>
					</div>
					<div>
						<nav
							class="relative z-0 inline-flex -space-x-px rounded-md shadow-sm"
							aria-label="Pagination"
						>
							{#if data.pagination.page > 1}
								<a
									href="/admin/audit-log?page={data.pagination.page - 1}"
									class="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
								>
									Previous
								</a>
							{/if}
							{#if data.pagination.page < data.pagination.totalPages}
								<a
									href="/admin/audit-log?page={data.pagination.page + 1}"
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
