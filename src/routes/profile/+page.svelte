<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import QuizRow from '$lib/components/QuizRow.svelte';

	import { authClient } from '$lib/auth-client';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let loading = $state(false);

	// Server load already validates authentication, just use the data directly
	let user = $derived(data.user);
	let profile = $derived(data.profile);
	let quizzes = $derived(data.quizzes ?? []);

	async function handleSignOut() {
		loading = true;
		try {
			await authClient.signOut();
			goto(resolve('/'), { invalidateAll: true });
		} catch (err: unknown) {
			console.error('Sign out error:', err);
		} finally {
			loading = false;
		}
	}
</script>

<PageContainer>
	<Card class="flex" padding="sm" variant="neutral">
		<div class="mr-10 flex-1 rounded-lg">
			<div class="grid gap-2">
				<div class="flex items-baseline rounded-md">
					<div class="w-18 text-sm text-gray-600">Name:</div>
					<div class="text-sm font-medium">{user.name}</div>
				</div>

				<div class="flex items-baseline rounded-md">
					<div class="w-18 text-sm text-gray-600">Email:</div>
					<div class="text-sm font-medium">{user.email}</div>
				</div>

				<div class="flex items-baseline rounded-md">
					<div class="w-18 text-sm text-gray-600">URL:</div>
					<a
						href={resolve(`/user/${profile.slug}`)}
						class="text-sm font-medium text-indigo-600 hover:text-indigo-700"
						>/user/{profile.slug}</a
					>
				</div>

				<div class="flex items-baseline rounded-md">
					<div class="w-18 text-sm text-gray-600">Joined:</div>
					<div class="text-sm font-medium">
						{new Date(profile.createdAt).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
					</div>
				</div>
			</div>
		</div>

		<div class="flex flex-col gap-1.5 text-sm">
			<Button variant="secondary" size="sm" onclick={handleSignOut} disabled={loading}>
				Log out
			</Button>
			<a href={resolve('/')} class="underline">Update Profile</a>
			<a href={resolve('/')} class="underline">Change Password</a>
			<a href={resolve('/')} class="underline">View Activity</a>
			<a href={resolve('/')} class="underline">Delete Account</a>
		</div>
	</Card>

	<div class="mt-10 flex items-center justify-between border-b border-gray-200 pb-2">
		<Heading level={2} class="flex-1">My Quizzes</Heading>
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
</PageContainer>
