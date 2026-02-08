<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import { formatDistanceToNow } from 'date-fns';

	import Button from '$lib/components/Button.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';

	let { data } = $props();

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

	function getRoleLabel(role: string): string {
		return role.charAt(0).toUpperCase() + role.slice(1);
	}

	function updateSearch(form: HTMLFormElement) {
		const formData = new FormData(form);
		const params = new SvelteURLSearchParams();

		const search = formData.get('search')?.toString();
		const role = formData.get('role')?.toString();
		const status = formData.get('status')?.toString();
		const sort = formData.get('sort')?.toString();
		const order = formData.get('order')?.toString();

		if (search) params.set('search', search);
		if (role && role !== 'all') params.set('role', role);
		if (status && status !== 'all') params.set('status', status);
		if (sort) params.set('sort', sort);
		if (order) params.set('order', order);

		window.location.href = `/admin/users?${params.toString()}`;
	}
</script>

<PageContainer>
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">Users</h1>
				<p class="mt-1 text-sm text-gray-500">Manage platform users and their permissions</p>
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
					<label for="filter-search" class="mb-1 block text-sm font-medium text-gray-700"
						>Search</label
					>
					<input
						id="filter-search"
						type="text"
						name="search"
						value={data.filters.search}
						placeholder="Name, username, or email..."
						class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					/>
				</div>

				<div>
					<label for="filter-role" class="mb-1 block text-sm font-medium text-gray-700">Role</label>
					<select
						id="filter-role"
						name="role"
						class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					>
						<option value="all" selected={data.filters.role === 'all'}>All Roles</option>
						<option value="user" selected={data.filters.role === 'user'}>User</option>
						<option value="moderator" selected={data.filters.role === 'moderator'}>Moderator</option
						>
						<option value="admin" selected={data.filters.role === 'admin'}>Admin</option>
					</select>
				</div>

				<div>
					<label for="filter-status" class="mb-1 block text-sm font-medium text-gray-700"
						>Status</label
					>
					<select
						id="filter-status"
						name="status"
						class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					>
						<option value="all" selected={data.filters.status === 'all'}>All Status</option>
						<option value="active" selected={data.filters.status === 'active'}>Active</option>
						<option value="suspended" selected={data.filters.status === 'suspended'}
							>Suspended</option
						>
					</select>
				</div>

				<div>
					<label for="filter-sort" class="mb-1 block text-sm font-medium text-gray-700">Sort</label>
					<select
						id="filter-sort"
						name="sort"
						class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					>
						<option value="created" selected={data.filters.sort === 'created'}>Joined Date</option>
						<option value="name" selected={data.filters.sort === 'name'}>Name</option>
						<option value="role" selected={data.filters.sort === 'role'}>Role</option>
					</select>
				</div>

				<div>
					<label for="filter-order" class="mb-1 block text-sm font-medium text-gray-700"
						>Order</label
					>
					<select
						id="filter-order"
						name="order"
						class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					>
						<option value="desc" selected={data.filters.order === 'desc'}>Newest First</option>
						<option value="asc" selected={data.filters.order === 'asc'}>Oldest First</option>
					</select>
				</div>

				<Button type="submit" variant="admin" size="sm">Filter</Button>
			</form>
		</div>

		<!-- Users Table -->
		<div class="overflow-hidden rounded-lg bg-white shadow">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>User</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Role</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Status</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Stats</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Joined</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#if data.users.length === 0}
							<tr>
								<td colspan="6" class="px-6 py-8 text-center text-sm text-gray-500">
									No users found
								</td>
							</tr>
						{:else}
							{#each data.users as user (user.id)}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="flex items-center">
											<div class="h-10 w-10 shrink-0">
												{#if user.image}
													<img
														class="h-10 w-10 rounded-full"
														src={user.image}
														alt={user.name || ''}
													/>
												{:else}
													<div
														class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300"
													>
														<span class="font-medium text-gray-600">
															{(user.name || user.slug || '?').charAt(0).toUpperCase()}
														</span>
													</div>
												{/if}
											</div>
											<div class="ml-4">
												<div class="text-sm font-medium text-gray-900">
													{user.name || 'Unnamed'}
												</div>
												<div class="text-sm text-gray-500">@{user.slug}</div>
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
												class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
											>
												Suspended
											</span>
										{:else}
											<span
												class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
											>
												Active
											</span>
										{/if}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm text-gray-900">
											{user.quizCount} quizzes
										</div>
										<div class="text-xs text-gray-500">
											{user.submissionCount} submissions · {user.speedRunCount} speed runs
										</div>
									</td>
									<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
										<time title={new Date(user.createdAt).toLocaleString()}>
											{formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
										</time>
									</td>
									<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
										<a href="/admin/users/{user.id}" class="text-blue-600 hover:text-blue-900">
											View
										</a>
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
										data.pagination.totalUsers
									)}</span
								>
								of <span class="font-medium">{data.pagination.totalUsers}</span> users
							</p>
						</div>
						<div>
							<nav
								class="relative z-0 inline-flex -space-x-px rounded-md shadow-sm"
								aria-label="Pagination"
							>
								{#if data.pagination.page > 1}
									<a
										href="/admin/users?page={data.pagination.page - 1}"
										class="relative inline-flex items-center rounded-l-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
									>
										Previous
									</a>
								{/if}
								{#if data.pagination.page < data.pagination.totalPages}
									<a
										href="/admin/users?page={data.pagination.page + 1}"
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
	</div></PageContainer
>
