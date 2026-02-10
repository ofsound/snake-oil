<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import { ModeWatcher } from 'mode-watcher';

	import Button from '$lib/components/Button.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	import { editFormFooterState } from '$lib/edit-form-footer.svelte';

	import type { LayoutProps } from './$types';

	import favicon from '$lib/assets/favicon.svg';

	import './layout.css';

	let { data, children }: LayoutProps = $props();

	let isEditPage = $derived(!!page.url.pathname.match(/^\/[^/]+\/[^/]+\/edit\/?$/));
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<!-- ModeWatcher handles the dark mode class toggling -->
<ModeWatcher defaultMode="system" />

{#snippet mainHeader(isEdit: boolean)}
	<header
		class="border-b border-border bg-slate-200/80 py-4 transition-colors duration-200"
		class:flex-shrink-0={isEdit}
	>
		<div class="mx-auto flex max-w-5xl justify-between gap-2 px-8">
			<a
				href={resolve('/')}
				class="text-xl font-bold transition-colors duration-200 text-shadow-sm text-shadow-zinc-400/20"
				>snakeoil.app</a
			>

			<div class="flex gap-2">
				<Button class="!font-black" variant="accent" size="sm" href="/create">+</Button>
				<Button variant="accent" size="sm" href="/quizzes">quizzes</Button>
				{#if data.user?.name}
					<Button variant="primary" size="sm" href="/profile">
						{data.user.name} <span class="hidden text-xs">(profile)</span>
					</Button>
				{:else}
					<Button variant="secondary" size="sm" href="/login">sign in</Button>
				{/if}
			</div>
		</div>
	</header>
{/snippet}

{#if isEditPage}
	<div class="flex h-svh w-full flex-col">
		{@render mainHeader(true)}

		<div class="min-h-0 flex-1 overflow-y-auto">
			{@render children()}
		</div>

		<footer class="mt-4 flex flex-shrink-0 items-center justify-between p-4">
			<ThemeToggle />
			<Button
				form="quiz-edit-form"
				type="submit"
				variant="primary"
				size="md"
				disabled={editFormFooterState.value?.submitting ?? true}
				loading={editFormFooterState.value?.submitting ?? false}
			>
				Save changes
			</Button>
		</footer>
	</div>
{:else}
	<div class="flex min-h-svh w-full flex-col">
		{@render mainHeader(false)}

		{@render children()}

		<footer class="mt-4 flex justify-start p-4">
			<ThemeToggle />
		</footer>
	</div>
{/if}
