<script lang="ts">
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import { formatDistanceToNow } from 'date-fns';

	import Button from '$lib/components/Button.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import Pagination from '$lib/components/Pagination.svelte';

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
				<h1 class="text-2xl font-bold text-admin-text-primary">Users</h1>
				<p class="mt-1 text-sm text-admin-text-muted">
					Manage platform users and their permissions
				</p>
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
						placeholder="Name, username, or email..."
						class="w-full rounded-md border-admin-border shadow-sm focus:border-admin-accent-violet-border focus:ring-admin-accent-violet-border sm:text-sm"
					/>
				</div>

				<div>
					<label for="filter-role" class="mb-1 block text-sm font-medium text-admin-text-primary"
						>Role</label
					>
					<select
						id="filter-role"
						name="role"
						class="rounded-md border-admin-border shadow-sm focus:border-admin-accent-violet-border focus:ring-admin-accent-violet-border sm:text-sm"
					>
						<option value="all" selected={data.filters.role === 'all'}>All Roles</option>
						<option value="user" selected={data.filters.role === 'user'}>User</option>
						<option value="moderator" selected={data.filters.role === 'moderator'}>Moderator</option
						>
						<option value="admin" selected={data.filters.role === 'admin'}>Admin</option>
					</select>
				</div>

				<div>
					<label for="filter-status" class="mb-1 block text-sm font-medium text-admin-text-primary"
						>Status</label
					>
					<select
						id="filter-status"
						name="status"
						class="rounded-md border-admin-border shadow-sm focus:border-admin-accent-violet-border focus:ring-admin-accent-violet-border sm:text-sm"
					>
						<option value="all" selected={data.filters.status === 'all'}>All Status</option>
						<option value="active" selected={data.filters.status === 'active'}>Active</option>
						<option value="suspended" selected={data.filters.status === 'suspended'}
							>Suspended</option
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
						<option value="created" selected={data.filters.sort === 'created'}>Joined Date</option>
						<option value="name" selected={data.filters.sort === 'name'}>Name</option>
						<option value="role" selected={data.filters.sort === 'role'}>Role</option>
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

		<!-- Users Table -->
		<div class="overflow-hidden rounded-lg bg-admin-surface-elevated shadow">
			<div class="overflow-x-auto">
				<table class="min-w-full divide-y divide-admin-border">
					<thead class="bg-admin-surface-muted">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>User</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Role</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Status</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Stats</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Joined</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-admin-text-muted uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-admin-border bg-admin-surface-elevated">
						{#if data.users.length === 0}
							<tr>
								<td colspan="6" class="px-6 py-8 text-center text-sm text-admin-text-muted">
									No users found
								</td>
							</tr>
						{:else}
							{#each data.users as user (user.id)}
								<tr class="hover:bg-admin-surface-muted">
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
										<div class="text-sm text-admin-text-primary">
											{user.quizCount} quizzes
										</div>
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
				basePath="/admin/users"
				itemName="users"
			/>
		</div>
	</div></PageContainer
>
