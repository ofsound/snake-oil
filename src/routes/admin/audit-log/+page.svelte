<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import { formatDistanceToNow } from 'date-fns';

	import Button from '$lib/components/Button.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import Pagination from '$lib/components/Pagination.svelte';

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

<PageContainer>
	<div class="space-y-6">
		<div>
			<h1 class="text-2xl font-bold text-admin-text-primary">Audit Log</h1>
			<p class="mt-1 text-sm text-admin-text-muted">
				Track all administrative actions across the platform
			</p>
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
					<label for="filter-action" class="mb-1 block text-sm font-medium text-admin-text-primary"
						>Action Type</label
					>
					<select
						id="filter-action"
						name="action"
						class="rounded-md border-admin-border shadow-sm focus:border-admin-accent-violet-border focus:ring-admin-accent-violet-border sm:text-sm"
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
					<label
						for="filter-target-type"
						class="mb-1 block text-sm font-medium text-admin-text-primary">Target Type</label
					>
					<select
						id="filter-target-type"
						name="targetType"
						class="rounded-md border-admin-border shadow-sm focus:border-admin-accent-violet-border focus:ring-admin-accent-violet-border sm:text-sm"
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
		<div class="overflow-hidden rounded-lg bg-admin-surface-elevated shadow">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-admin-border">
					<thead class="bg-admin-surface-muted">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Time</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Admin</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Action</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Target</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Details</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-admin-border bg-admin-surface-elevated">
						{#if data.actions.length === 0}
							<tr>
								<td colspan="5" class="px-6 py-8 text-center text-sm text-admin-text-muted">
									No admin actions found
								</td>
							</tr>
						{:else}
							{#each data.actions as action (action.id)}
								<tr class="hover:bg-admin-surface-muted">
									<td class="px-6 py-4 text-sm whitespace-nowrap text-admin-text-muted">
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
											class="inline-flex items-center rounded-full bg-admin-surface-muted px-2.5 py-0.5 text-xs font-medium text-admin-text-primary"
										>
											{formatAction(action.action)}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm text-admin-text-primary">
											{formatTargetType(action.targetType)}
										</div>
										{#if action.targetId}
											<div class="max-w-xs truncate text-xs text-admin-text-muted">
												{action.targetId}
											</div>
										{/if}
										{#if action.targetCreator}
											<div class="mt-1 text-xs text-admin-text-muted">
												Creator: {action.targetCreator.name || action.targetCreator.slug}
											</div>
										{/if}
									</td>
									<td class="px-6 py-4">
										{#if action.details && Object.keys(action.details).length > 0}
											<details class="text-sm">
												<summary
													class="cursor-pointer text-admin-accent-violet-text hover:text-admin-text-primary"
												>
													View Details
												</summary>
												<pre
													class="mt-2 overflow-x-auto rounded bg-admin-surface-muted p-2 text-xs">{JSON.stringify(
														action.details,
														null,
														2
													)}</pre>
											</details>
										{:else}
											<span class="text-sm text-admin-text-muted">No details</span>
										{/if}
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
				basePath="/admin/audit-log"
				itemName="actions"
			/>
		</div>
	</div></PageContainer
>
