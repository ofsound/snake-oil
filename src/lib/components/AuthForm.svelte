<script lang="ts">
	import type { Snippet } from 'svelte';
	import Card from './Card.svelte';

	interface Props {
		title: string;
		loading: boolean;
		error: string | null;
		children: Snippet;
		footer: Snippet;

		onsubmit?: (e: SubmitEvent) => void;
	}

	let { title, loading, error, children, footer, onsubmit }: Props = $props();
</script>

<div class="mt-14 flex justify-center p-8">
	<Card class="w-full max-w-[400px]">
		<h2 class="mt-0 mb-6 text-center text-lg font-semibold text-gray-900">{title}</h2>

		{#if error}
			<div class="mb-4 rounded bg-red-50 px-3 py-3 text-sm text-red-600">{error}</div>
		{/if}

		<form {onsubmit}>
			<div class="space-y-4">
				{@render children()}
			</div>

			<button
				type="submit"
				disabled={loading}
				class="mt-4 w-full cursor-pointer rounded-md bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
			>
				{loading ? 'Please wait...' : title}
			</button>
		</form>

		<div
			class="mt-4 text-center text-sm [&_a]:font-semibold [&_a]:text-indigo-600 [&_a]:hover:text-indigo-800 [&_p]:text-gray-600"
		>
			{@render footer()}
		</div>
	</Card>
</div>
