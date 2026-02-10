<script lang="ts">
	import { page } from '$app/state';

	import Button from '$lib/components/Button.svelte';
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-8 p-8">
	<div class="text-center">
		<h1 class="text-6xl font-bold text-text-primary">
			{page.status}
		</h1>
		<p class="mt-2 text-2xl text-text-secondary">
			{page.error?.message || 'Something went wrong'}
		</p>
	</div>

	<p class="max-w-md text-center text-text-muted">
		The page you're looking for doesn't exist or has been moved.
	</p>

	<Button variant="primary" size="lg" href="/">Go Home</Button>
</div>
