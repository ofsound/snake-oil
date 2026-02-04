<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import QuizRow from '$lib/components/QuizRow.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Server load already validates authentication, just use the data directly
	let user = $derived(data.user);
	let profile = $derived(data.profile);
	let quizzes = $derived(data.quizzes ?? []);
</script>

<Card class="flex">
	<div class="mr-10 flex-1 rounded-lg">
		<div class="grid gap-2">
			<div class="flex items-center rounded-md">
				<span class="w-26 text-gray-600">Email:</span>
				<span class="font-medium text-gray-800">{user.email}</span>
			</div>

			<div class="flex items-center rounded-md">
				<span class="w-26 text-gray-600">Name:</span>
				<span class="font-medium text-gray-800">{user.name}</span>
			</div>

			<div class="flex items-center rounded-md">
				<span class="w-26 text-gray-600">Public URL:</span>
				<a href="/users/{profile.slug}" class="font-medium text-indigo-600 hover:text-indigo-700"
					>/{profile.slug}</a
				>
			</div>

			<div class="flex items-center rounded-md">
				<span class="w-26 text-gray-600">Join Date:</span>
				<span class="font-medium text-gray-800"
					>{new Date(profile.createdAt).toLocaleDateString()}</span
				>
			</div>
		</div>
	</div>

	<div class="flex flex-col gap-1.5 text-sm">
		<a href="/" class="underline">Update Profile</a>
		<a href="/" class="underline">Change Password</a>
		<a href="/" class="underline">View Activity</a>
		<a href="/" class="underline">Delete Account</a>
	</div>
</Card>

<div class="mt-10 flex items-center justify-between border-b border-gray-200 pb-2">
	<h2 class="flex-1 text-2xl text-gray-700">My Quizzes</h2>
	{#if quizzes.length > 0}
		<Button variant="accent" size="md" href="/create">Create Quiz</Button>
	{/if}
</div>

{#if quizzes.length > 0}
	<div class="mt-4 flex flex-col gap-3">
		{#each quizzes as quiz (quiz.id)}
			<QuizRow {quiz} showOwner={false} linkToManage={true} />
		{/each}
	</div>
{:else}
	<div class="rounded-md bg-gray-50 p-8 text-center">
		<p class="mb-4 text-gray-600">You haven't created any quizzes yet.</p>
		<Button variant="accent" size="md" href="/create">Create Your First Quiz</Button>
	</div>
{/if}
