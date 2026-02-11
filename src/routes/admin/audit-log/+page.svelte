<script lang="ts">
	import { formatDistanceToNow } from 'date-fns';

	import AdminDataTable from '$lib/components/admin/AdminDataTable.svelte';

	let { data } = $props();

	function formatAction(action: string): string {
		return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}

	function formatTargetType(type: string): string {
		return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}

	const filters = [
		{
			id: 'action',
			label: 'Action Type',
			type: 'select' as const,
			dynamicOptions: 'filterOptions.actions',
			options: [{ value: 'all', label: 'All Actions' }]
		},
		{
			id: 'targetType',
			label: 'Target Type',
			type: 'select' as const,
			dynamicOptions: 'filterOptions.targetTypes',
			options: [{ value: 'all', label: 'All Targets' }]
		}
	];
</script>

<AdminDataTable
	title="Audit Log"
	description="Track all administrative actions across the platform"
	basePath="/admin/audit-log"
	itemName="actions"
	{filters}
	{data}
	emptyMessage="No admin actions found"
	headers={['Time', 'Admin', 'Action', 'Target', 'Details']}
>
	{#each data.items as action (action.id)}
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
</AdminDataTable>
