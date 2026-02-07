<script lang="ts">
	import { formatDistanceToNow } from 'date-fns';

	let { data } = $props();

	function formatAction(action: string): string {
		return action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}

	function formatTargetType(type: string): string {
		return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
	}
</script>

<div class="space-y-6">
	<h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		<!-- Users Card -->
		<div class="rounded-lg bg-white p-6 shadow">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="rounded-md bg-blue-500 p-3">
						<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
							/>
						</svg>
					</div>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-500">Total Users</p>
					<p class="text-2xl font-bold text-gray-900">{data.stats.totalUsers.toLocaleString()}</p>
					<p class="mt-1 text-xs text-green-600">+{data.stats.newUsersLast7Days} in last 7 days</p>
				</div>
			</div>
		</div>

		<!-- Suspended Users Card -->
		<div class="rounded-lg bg-white p-6 shadow">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="rounded-md bg-red-500 p-3">
						<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
							/>
						</svg>
					</div>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-500">Suspended Users</p>
					<p class="text-2xl font-bold text-gray-900">
						{data.stats.suspendedUsers.toLocaleString()}
					</p>
					<a
						href="/admin/users?filter=suspended"
						class="mt-1 inline-block text-xs text-blue-600 hover:text-blue-800"
					>
						View suspended →
					</a>
				</div>
			</div>
		</div>

		<!-- Quizzes Card -->
		<div class="rounded-lg bg-white p-6 shadow">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="rounded-md bg-green-500 p-3">
						<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-500">Total Quizzes</p>
					<p class="text-2xl font-bold text-gray-900">{data.stats.totalQuizzes.toLocaleString()}</p>
					<p class="mt-1 text-xs text-gray-500">{data.stats.privateQuizzes} private</p>
				</div>
			</div>
		</div>

		<!-- Speed Runs Card -->
		<div class="rounded-lg bg-white p-6 shadow">
			<div class="flex items-center">
				<div class="flex-shrink-0">
					<div class="rounded-md bg-purple-500 p-3">
						<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 10V3L4 14h7v7l9-11h-7z"
							/>
						</svg>
					</div>
				</div>
				<div class="ml-4">
					<p class="text-sm font-medium text-gray-500">Speed Run Results</p>
					<p class="text-2xl font-bold text-gray-900">
						{data.stats.totalSpeedRuns.toLocaleString()}
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Recent Admin Actions -->
	<div class="overflow-hidden rounded-lg bg-white shadow">
		<div class="border-b border-gray-200 px-6 py-4">
			<h2 class="text-lg font-medium text-gray-900">Recent Admin Actions</h2>
			<p class="mt-1 text-sm text-gray-500">Last 10 actions across the platform</p>
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
							>Target</th
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
							<td colspan="4" class="px-6 py-8 text-center text-sm text-gray-500">
								No admin actions yet
							</td>
						</tr>
					{:else}
						{#each data.recentActions as action}
							<tr class="hover:bg-gray-50">
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
		{#if data.recentActions.length > 0}
			<div class="border-t border-gray-200 bg-gray-50 px-6 py-3">
				<a href="/admin/audit-log" class="text-sm font-medium text-blue-600 hover:text-blue-800">
					View all actions →
				</a>
			</div>
		{/if}
	</div>
</div>
