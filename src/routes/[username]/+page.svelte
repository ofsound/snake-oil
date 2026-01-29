<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let user = $derived(data.user);
</script>

{#if user}
	<div class="mx-auto max-w-3xl p-8">
		<div class="mb-8 rounded-lg bg-white p-6 shadow-md">
			<h1 class="mb-6 border-b-2 border-gray-200 pb-2 text-3xl text-gray-700">
				{user.name || 'Anonymous User'}
			</h1>

			<div class="grid gap-4">
				{#if user.name}
					<div class="flex items-center justify-between rounded-md bg-gray-50 p-3">
						<span class="font-semibold text-gray-600">Username:</span>
						<span class="font-medium text-gray-800">{user.name}</span>
					</div>
				{/if}

				{#if user.createdAt}
					<div class="flex items-center justify-between rounded-md bg-gray-50 p-3">
						<span class="font-semibold text-gray-600">Member since:</span>
						<span class="font-medium text-gray-800">
							{new Date(user.createdAt).toLocaleDateString()}
						</span>
					</div>
				{/if}
			</div>
		</div>

		{#if user.image}
			<div class="rounded-lg bg-white p-6 shadow-md">
				<h2 class="mb-4 border-b-2 border-gray-200 pb-2 text-xl text-gray-700">Profile Picture</h2>
				<img
					src={user.image}
					alt="{user.name || 'User'}'s profile picture"
					class="h-32 w-32 rounded-full object-cover"
				/>
			</div>
		{/if}
	</div>
{/if}
