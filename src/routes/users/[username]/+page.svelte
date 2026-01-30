<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let user = $derived(data.user);
</script>

<div class="mx-auto max-w-3xl p-8">
	<div class="mb-8 flex rounded-lg bg-white p-6 shadow-md">
		<div class="h-20 w-20 bg-amber-300">
			<img
				src={user.image}
				alt="{user.name || 'User'}'s profile picture"
				class="h-32 w-32 rounded-full object-cover"
			/>
		</div>
		<h1 class="mb-6 text-3xl text-gray-700">
			{user.name}
		</h1>
		<div class="flex gap-2 rounded-md">
			<span class="font-semibold text-gray-600">Member since:</span>
			<span class="font-medium text-gray-800">
				{new Date(user.createdAt).toLocaleDateString()}
			</span>
		</div>
	</div>

	<ul class="mt-8 flex flex-col gap-2 rounded-md bg-zinc-100 p-4">
		<li>
			Quizzes
			<p class="italic">This links to, or is, a list of all the quizzes the user has created.</p>
		</li>
		<li>This page isn't even that important.</li>
	</ul>
</div>
