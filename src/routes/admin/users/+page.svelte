<script lang="ts">
	import { formatDistanceToNow } from 'date-fns';

	import AdminDataTable from '$lib/components/admin/AdminDataTable.svelte';

	let { data } = $props();

	function getRoleBadgeClass(role: string): string {
		switch (role) {
			case 'admin':
				return 'bg-admin-accent-red-bg text-admin-accent-red-text';
			case 'moderator':
				return 'bg-admin-accent-blue-bg text-admin-accent-blue-text';
			default:
				return 'bg-admin-surface-muted text-admin-text-primary';
		}
	}

	function getRoleLabel(role: string): string {
		return role.charAt(0).toUpperCase() + role.slice(1);
	}

	const filters = [
		{
			id: 'search',
			label: 'Search',
			type: 'text' as const,
			placeholder: 'Name, username, or email...'
		},
		{
			id: 'role',
			label: 'Role',
			type: 'select' as const,
			options: [
				{ value: 'all', label: 'All Roles' },
				{ value: 'user', label: 'User' },
				{ value: 'moderator', label: 'Moderator' },
				{ value: 'admin', label: 'Admin' }
			]
		},
		{
			id: 'status',
			label: 'Status',
			type: 'select' as const,
			options: [
				{ value: 'all', label: 'All Status' },
				{ value: 'active', label: 'Active' },
				{ value: 'suspended', label: 'Suspended' }
			]
		},
		{
			id: 'sort',
			label: 'Sort',
			type: 'select' as const,
			options: [
				{ value: 'created', label: 'Joined Date' },
				{ value: 'name', label: 'Name' },
				{ value: 'role', label: 'Role' }
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
	title="Users"
	description="Manage platform users and their permissions"
	basePath="/admin/users"
	itemName="users"
	{filters}
	{data}
	emptyMessage="No users found"
	headers={['User', 'Role', 'Status', 'Stats', 'Joined', 'Actions']}
>
	{#each data.items as user (user.id)}
		<tr class="hover:bg-admin-surface-muted">
			<td class="px-6 py-4 whitespace-nowrap">
				<div class="flex items-center">
					<div class="h-10 w-10 shrink-0">
						{#if user.image}
							<img class="h-10 w-10 rounded-full" src={user.image} alt={user.name || ''} />
						{:else}
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-admin-surface-subtle"
							>
								<span class="font-medium text-admin-text-secondary">
									{(user.name || user.slug || '?').charAt(0).toUpperCase()}
								</span>
							</div>
						{/if}
					</div>
					<div class="ml-4">
						<div class="text-sm font-medium text-admin-text-primary">
							{user.name || 'Unnamed'}
						</div>
						<div class="text-sm text-admin-text-muted">@{user.slug}</div>
					</div>
				</div>
			</td>
			<td class="px-6 py-4 whitespace-nowrap">
				<span
					class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getRoleBadgeClass(
						user.role
					)}"
				>
					{getRoleLabel(user.role)}
				</span>
			</td>
			<td class="px-6 py-4 whitespace-nowrap">
				{#if user.isSuspended}
					<span
						class="inline-flex items-center rounded-full bg-admin-accent-red-bg px-2.5 py-0.5 text-xs font-medium text-admin-accent-red-text"
					>
						Suspended
					</span>
				{:else}
					<span
						class="inline-flex items-center rounded-full bg-admin-accent-emerald-bg px-2.5 py-0.5 text-xs font-medium text-admin-accent-emerald-text"
					>
						Active
					</span>
				{/if}
			</td>
			<td class="px-6 py-4 whitespace-nowrap">
				<div class="text-sm text-admin-text-primary">{user.quizCount} quizzes</div>
				<div class="text-xs text-admin-text-muted">
					{user.submissionCount} submissions · {user.speedRunCount} speed runs
				</div>
			</td>
			<td class="px-6 py-4 text-sm whitespace-nowrap text-admin-text-muted">
				<time title={new Date(user.createdAt).toLocaleString()}>
					{formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
				</time>
			</td>
			<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
				<a
					href="/admin/users/{user.id}"
					class="text-admin-accent-violet-text hover:text-admin-text-primary"
				>
					View
				</a>
			</td>
		</tr>
	{/each}
</AdminDataTable>
