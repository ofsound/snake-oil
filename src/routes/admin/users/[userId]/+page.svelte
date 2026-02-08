<script lang="ts">
	import { formatDistanceToNow } from 'date-fns';

	import Button from '$lib/components/Button.svelte';

	let { data } = $props();

	let suspendReason = $state('');
	let showSuspendModal = $state(false);
	let showUnsuspendModal = $state(false);
	let showRoleModal = $state(false);
	// svelte-ignore state_referenced_locally
	let selectedRole = $state(data.targetUser.role);

	function getRoleBadgeClass(role: string): string {
		switch (role) {
			case 'admin':
				return 'bg-red-100 text-red-800';
			case 'moderator':
				return 'bg-blue-100 text-blue-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function formatAction(action: string): string {
		return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div>
			<a href="/admin/users" class="text-sm text-blue-600 hover:text-blue-800">← Back to Users</a>
			<h1 class="mt-2 text-2xl font-bold text-gray-900">
				{data.targetUser.name || 'Unnamed User'}
			</h1>
			<p class="text-sm text-gray-500">@{data.targetUser.slug}</p>
		</div>
		<div class="flex gap-2">
			{#if data.canManageRole}
				<Button onclick={() => (showRoleModal = true)} variant="admin" size="sm">Change Role</Button
				>
			{/if}
			{#if data.canSuspend}
				{#if data.targetUser.isSuspended}
					<Button onclick={() => (showUnsuspendModal = true)} variant="primary" size="sm"
						>Unsuspend User</Button
					>
				{:else}
					<Button onclick={() => (showSuspendModal = true)} variant="danger" size="sm"
						>Suspend User</Button
					>
				{/if}
			{/if}
		</div>
	</div>

	<!-- User Profile Card -->
	<div class="rounded-lg bg-white p-6 shadow">
		<div class="flex items-start gap-6">
			<div class="shrink-0">
				{#if data.targetUser.image}
					<img
						class="h-24 w-24 rounded-full"
						src={data.targetUser.image}
						alt={data.targetUser.name || ''}
					/>
				{:else}
					<div class="flex h-24 w-24 items-center justify-center rounded-full bg-gray-300">
						<span class="text-3xl font-medium text-gray-600">
							{(data.targetUser.name || data.targetUser.slug || '?').charAt(0).toUpperCase()}
						</span>
					</div>
				{/if}
			</div>
			<div class="grid flex-1 grid-cols-2 gap-4 md:grid-cols-4">
				<div>
					<p class="text-sm font-medium text-gray-500">Role</p>
					<span
						class="mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getRoleBadgeClass(
							data.targetUser.role
						)}"
					>
						{data.targetUser.role.charAt(0).toUpperCase() + data.targetUser.role.slice(1)}
					</span>
				</div>
				<div>
					<p class="text-sm font-medium text-gray-500">Status</p>
					{#if data.targetUser.isSuspended}
						<span
							class="mt-1 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
						>
							Suspended
						</span>
					{:else}
						<span
							class="mt-1 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
						>
							Active
						</span>
					{/if}
				</div>
				<div>
					<p class="text-sm font-medium text-gray-500">Joined</p>
					<p class="mt-1 text-sm text-gray-900">
						<time title={new Date(data.targetUser.createdAt).toLocaleString()}>
							{formatDistanceToNow(new Date(data.targetUser.createdAt), { addSuffix: true })}
						</time>
					</p>
				</div>
				{#if data.isCurrentUserAdmin}
					<div>
						<p class="text-sm font-medium text-gray-500">Email</p>
						<p class="mt-1 text-sm text-gray-900">{data.targetUser.email}</p>
					</div>
				{/if}
			</div>
		</div>

		{#if data.targetUser.isSuspended}
			<div class="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
				<h3 class="text-sm font-medium text-red-800">Account Suspended</h3>
				<p class="mt-1 text-sm text-red-700">
					<strong>Reason:</strong>
					{data.targetUser.suspendedReason}
				</p>
				<p class="mt-1 text-sm text-red-700">
					<strong>Suspended by:</strong>
					{data.targetUser.suspendedByUser?.name || 'Unknown'}
				</p>
				<p class="mt-1 text-sm text-red-700">
					<strong>Suspended:</strong>
					<time title={new Date(data.targetUser.suspendedAt || '').toLocaleString()}>
						{formatDistanceToNow(new Date(data.targetUser.suspendedAt || ''), { addSuffix: true })}
					</time>
				</p>
			</div>
		{/if}
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
		<div class="rounded-lg bg-white p-4 shadow">
			<p class="text-sm font-medium text-gray-500">Quizzes Created</p>
			<p class="text-2xl font-bold text-gray-900">{data.stats.quizCount}</p>
			<p class="text-xs text-gray-500">
				{data.stats.publicQuizzes} public · {data.stats.privateQuizzes} private
			</p>
		</div>
		<div class="rounded-lg bg-white p-4 shadow">
			<p class="text-sm font-medium text-gray-500">Submissions</p>
			<p class="text-2xl font-bold text-gray-900">{data.stats.submissionCount}</p>
		</div>
		<div class="rounded-lg bg-white p-4 shadow">
			<p class="text-sm font-medium text-gray-500">Speed Runs</p>
			<p class="text-2xl font-bold text-gray-900">{data.stats.speedRunCount}</p>
		</div>
	</div>

	<!-- Tabs for Quizzes, Submissions, Speed Runs, Audit Log -->
	<div class="overflow-hidden rounded-lg bg-white shadow">
		<div class="border-b border-gray-200">
			<nav class="-mb-px flex" aria-label="Tabs">
				<button
					class="border-b-2 border-blue-500 px-6 py-4 text-sm font-medium whitespace-nowrap text-blue-600"
				>
					Quizzes ({data.quizzes.length})
				</button>
			</nav>
		</div>
		<div class="p-6">
			{#if data.quizzes.length === 0}
				<p class="text-sm text-gray-500">No quizzes created yet</p>
			{:else}
				<div class="space-y-4">
					{#each data.quizzes.slice(0, 5) as quiz (quiz.id)}
						<div class="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50">
							<div>
								<h3 class="text-sm font-medium text-gray-900">{quiz.title}</h3>
								<p class="text-xs text-gray-500">
									{quiz.visibility === 'public' ? 'Public' : 'Private'} ·
									<time title={new Date(quiz.createdAt).toLocaleString()}>
										{formatDistanceToNow(new Date(quiz.createdAt), { addSuffix: true })}
									</time>
								</p>
							</div>
							<a href="/admin/quizzes/{quiz.id}" class="text-sm text-blue-600 hover:text-blue-800">
								View
							</a>
						</div>
					{/each}
					{#if data.quizzes.length > 5}
						<p class="mt-4 text-center text-sm text-gray-500">
							+{data.quizzes.length - 5} more quizzes
						</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Recent Admin Actions -->
	<div class="overflow-hidden rounded-lg bg-white shadow">
		<div class="border-b border-gray-200 px-6 py-4">
			<h2 class="text-lg font-medium text-gray-900">Recent Admin Actions</h2>
		</div>
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
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
							>When</th
						>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#if data.recentActions.length === 0}
						<tr>
							<td colspan="3" class="px-6 py-8 text-center text-sm text-gray-500">
								No admin actions for this user
							</td>
						</tr>
					{:else}
						{#each data.recentActions as action (action.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
									{action.admin?.name || 'Unknown'}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800"
									>
										{formatAction(action.action)}
									</span>
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
									<time title={new Date(action.createdAt).toLocaleString()}>
										{formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
									</time>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>

<!-- Suspend Modal -->
{#if showSuspendModal}
	<div class="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-gray-500">
		<div class="mx-4 w-full max-w-md rounded-lg bg-white p-6">
			<h3 class="mb-4 text-lg font-medium text-gray-900">Suspend User</h3>
			<p class="mb-4 text-sm text-gray-600">
				Are you sure you want to suspend <strong
					>{data.targetUser.name || data.targetUser.slug}</strong
				>? This will prevent them from accessing the platform.
			</p>
			<form method="POST" action="?/suspend" class="space-y-4">
				<div>
					<label for="suspend-reason" class="mb-1 block text-sm font-medium text-gray-700"
						>Reason for suspension *</label
					>
					<textarea
						id="suspend-reason"
						name="reason"
						bind:value={suspendReason}
						required
						rows="3"
						class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
						placeholder="Enter reason for suspension..."
					></textarea>
				</div>
				<div class="flex justify-end gap-3">
					<Button
						type="button"
						onclick={() => (showSuspendModal = false)}
						variant="outline"
						size="sm">Cancel</Button
					>
					<Button type="submit" disabled={!suspendReason.trim()} variant="danger" size="sm"
						>Suspend User</Button
					>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Unsuspend Modal -->
{#if showUnsuspendModal}
	<div class="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-gray-500">
		<div class="mx-4 w-full max-w-md rounded-lg bg-white p-6">
			<h3 class="mb-4 text-lg font-medium text-gray-900">Unsuspend User</h3>
			<p class="mb-4 text-sm text-gray-600">
				Are you sure you want to unsuspend <strong
					>{data.targetUser.name || data.targetUser.slug}</strong
				>? They will regain access to the platform.
			</p>
			<form method="POST" action="?/unsuspend" class="flex justify-end gap-3">
				<Button
					type="button"
					onclick={() => (showUnsuspendModal = false)}
					variant="outline"
					size="sm">Cancel</Button
				>
				<Button type="submit" variant="primary" size="sm">Unsuspend User</Button>
			</form>
		</div>
	</div>
{/if}

<!-- Change Role Modal -->
{#if showRoleModal}
	<div class="bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-gray-500">
		<div class="mx-4 w-full max-w-md rounded-lg bg-white p-6">
			<h3 class="mb-4 text-lg font-medium text-gray-900">Change User Role</h3>
			<p class="mb-4 text-sm text-gray-600">
				Change role for <strong>{data.targetUser.name || data.targetUser.slug}</strong>
			</p>
			<form method="POST" action="?/updateRole" class="space-y-4">
				<div>
					<label for="user-role" class="mb-1 block text-sm font-medium text-gray-700">Role</label>
					<select
						id="user-role"
						name="role"
						bind:value={selectedRole}
						class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					>
						<option value="user">User</option>
						<option value="moderator">Moderator</option>
						<option value="admin">Admin</option>
					</select>
				</div>
				<div class="flex justify-end gap-3">
					<Button type="button" onclick={() => (showRoleModal = false)} variant="outline" size="sm"
						>Cancel</Button
					>
					<Button type="submit" variant="admin" size="sm">Update Role</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
