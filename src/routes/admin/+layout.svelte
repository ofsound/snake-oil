<script lang="ts">
	import { page } from '$app/state';

	import Icon from '$lib/components/Icon.svelte';

	let { children, data } = $props();

	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: 'chart' },
		{ href: '/admin/users', label: 'Users', icon: 'users' },
		{ href: '/admin/quizzes', label: 'Quizzes', icon: 'quiz' },
		{ href: '/admin/speed-runs', label: 'Speed Runs', icon: 'lightning' },
		{ href: '/admin/tags', label: 'Tags', icon: 'tags' },
		{ href: '/admin/audit-log', label: 'Audit Log', icon: 'list' }
	] as const;

	const isAdmin = $derived(data.user?.role === 'admin');

	function isActive(href: string): boolean {
		if (href === '/admin') {
			return page.url.pathname === '/admin';
		}
		return page.url.pathname.startsWith(href);
	}
</script>

<div class="min-h-screen bg-admin-surface">
	<!-- Admin Header -->
	<header class="border-b border-admin-border bg-admin-surface-elevated shadow-sm">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<div class="flex items-center">
					<a href="/admin" class="text-xl font-bold text-admin-text-primary">Admin Panel</a>
					{#if isAdmin}
						<span
							class="ml-2 rounded-full bg-admin-accent-red-bg px-2 py-0.5 text-xs font-medium text-admin-accent-red-text"
						>
							Admin
						</span>
					{:else}
						<span
							class="ml-2 rounded-full bg-admin-accent-blue-bg px-2 py-0.5 text-xs font-medium text-admin-accent-blue-text"
						>
							Moderator
						</span>
					{/if}
				</div>
				<div class="flex items-center gap-4">
					<span class="text-sm text-admin-text-secondary"
						>{data.user?.name || data.user?.email}</span
					>
					<a
						href="/"
						class="inline-flex items-center gap-1 text-sm text-admin-accent-violet-text hover:opacity-80"
					>
						<Icon name="arrow-left" size="sm" />
						Back to Site
					</a>
				</div>
			</div>
		</div>
	</header>

	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="flex flex-col gap-8 lg:flex-row">
			<!-- Sidebar Navigation -->
			<nav class="shrink-0 lg:w-64">
				<div class="overflow-hidden rounded-lg bg-admin-surface-elevated shadow">
					<div class="p-4">
						<h2 class="text-xs font-semibold tracking-wider text-admin-text-muted uppercase">
							Menu
						</h2>
					</div>
					<div class="border-t border-admin-border">
						{#each navItems as item (item.href)}
							<a
								href={item.href}
								class="flex items-center px-4 py-3 text-sm font-medium transition-colors {isActive(
									item.href
								)
									? 'border-r-2 border-admin-accent-violet-border bg-admin-accent-violet-bg text-admin-accent-violet-text'
									: 'text-admin-text-primary hover:bg-admin-surface-muted'}"
							>
								<Icon name={item.icon} size="sm" class="mr-3" />
								{item.label}
							</a>
						{/each}
					</div>
				</div>

				<!-- Quick Actions -->
				<div class="mt-6 overflow-hidden rounded-lg bg-admin-surface-elevated shadow">
					<div class="p-4">
						<h2 class="text-xs font-semibold tracking-wider text-admin-text-muted uppercase">
							Quick Actions
						</h2>
					</div>
					<div class="space-y-2 border-t border-admin-border p-4">
						<a
							href="/create"
							class="inline-flex w-full items-center justify-center gap-2 rounded bg-admin-accent-violet-bg px-4 py-2 text-center text-sm font-medium text-admin-accent-violet-text transition-colors hover:brightness-95"
						>
							<Icon name="plus" size="sm" />
							Create Quiz
						</a>
						<a
							href="/quizzes"
							class="inline-flex w-full items-center justify-center gap-2 rounded bg-admin-surface-muted px-4 py-2 text-center text-sm font-medium text-admin-text-primary transition-colors hover:bg-admin-surface-subtle"
						>
							<Icon name="grid" size="sm" />
							View All Quizzes
						</a>
					</div>
				</div>
			</nav>

			<!-- Main Content -->
			<main class="min-w-0 flex-1">
				{@render children()}
			</main>
		</div>
	</div>
</div>
