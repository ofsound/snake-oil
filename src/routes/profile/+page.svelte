<script lang="ts">
	import QuizRow from '$lib/components/QuizRow.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Server load already validates authentication, just use the data directly
	let user = $derived(data.user);
	let profile = $derived(data.profile);
	let quizzes = $derived(data.quizzes ?? []);
</script>

{#if user}
	<div class="mx-auto max-w-3xl p-8">
		<div class="mb-4 flex border border-gray-100 bg-neutral-100 p-6">
			<div class="mr-10 flex-1 rounded-lg">
				<div class="grid gap-2">
					<div class="flex items-center gap-2 rounded-md">
						<span class="font-semibold text-gray-600">Email:</span>
						<span class="font-medium text-gray-800">{user.email}</span>
					</div>

					<div class="items-centergap-2 flex rounded-md">
						<span class="font-semibold text-gray-600">Name:</span>
						<span class="font-medium text-gray-800">{user.name}</span>
					</div>

					<div class="flex items-center gap-2 rounded-md">
						<span class="font-semibold text-gray-600">Public Profile:</span>
						<a
							href="/users/{profile.slug}"
							class="font-medium text-indigo-600 hover:text-indigo-700">@{profile.slug}</a
						>
					</div>

					<div class="items-centergap-2 flex rounded-md">
						<span class="font-semibold text-gray-600">Account created:</span>
						<span class="font-medium text-gray-800"
							>{new Date(profile.createdAt).toLocaleDateString()}</span
						>
					</div>
				</div>
			</div>

			<div class="flex flex-col gap-4 text-xs">
				<a href="/" class="hover:underline">Update Profile</a>
				<a href="/" class="hover:underline">Change Password</a>
				<a href="/" class="hover:underline">View Activity</a>
				<a href="/" class="hover:underline">Delete Account</a>
			</div>
		</div>

		<div class="mb-8 rounded-sm border border-gray-200 bg-white p-6">
			<div class="flex items-center justify-between">
				<h2 class="mb-6 flex-1 border-b border-gray-200 pb-2 text-2xl text-gray-700">My Quizzes</h2>
				{#if quizzes.length > 0}
					<a
						href="/create"
						class="inline-block rounded-md border-none bg-indigo-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-600"
						>Create Quiz</a
					>
				{/if}
			</div>
			{#if quizzes.length > 0}
				<div class="flex flex-col gap-3">
					{#each quizzes as quiz (quiz.id)}
						<QuizRow {quiz} showOwner={false} />
					{/each}
				</div>
			{:else}
				<div class="rounded-md bg-gray-50 p-8 text-center">
					<p class="mb-4 text-gray-600">You haven't created any quizzes yet.</p>
					<a
						href="/create"
						class="inline-block rounded-md border-none bg-indigo-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-700"
						>Create Your First Quiz</a
					>
				</div>
			{/if}
		</div>
	</div>
{/if}
