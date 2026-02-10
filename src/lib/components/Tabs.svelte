<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import Card from './Card.svelte';

	import type { Snippet } from 'svelte';

	interface Tab {
		label: string;
		value: string;
	}

	interface Props {
		tabs: Tab[];
		activeTab: string;
		paramName?: string;
		children: Snippet;
	}

	let { tabs, activeTab, paramName = 'tab', children }: Props = $props();

	function handleTabChange(newTab: string): void {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (newTab === tabs[0]?.value) {
			params.delete(paramName);
		} else {
			params.set(paramName, newTab);
		}
		params.delete('page');
		goto(`?${params.toString()}`, { keepFocus: true });
	}
</script>

<Card variant="flat" padding="none">
	<div class="border-b border-gray-200 dark:border-gray-700">
		<nav class="-mb-px flex" aria-label="Tabs">
			{#each tabs as tab (tab.value)}
				<button
					type="button"
					onclick={() => handleTabChange(tab.value)}
					class="cursor-pointer border-b-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors
						{activeTab === tab.value
						? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'}"
				>
					{tab.label}
				</button>
			{/each}
		</nav>
	</div>
	<div class="p-6">
		{@render children()}
	</div>
</Card>
