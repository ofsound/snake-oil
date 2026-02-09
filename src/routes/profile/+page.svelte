<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import ModeToggle from '$lib/components/ModeToggle.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import QuizRow from '$lib/components/QuizRow.svelte';
	import SubmissionRow from '$lib/components/SubmissionRow.svelte';

	import { authClient } from '$lib/auth-client';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let loading = $state(false);

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

	function handleSubmissionFilterChange(newFilter: 'all' | 'quiz' | 'speedrun') {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (newFilter === 'all') {
			params.delete('submissionFilter');
		} else {
			params.set('submissionFilter', newFilter);
		}
		params.set('page', '1');
		goto(resolve(`/profile?${params.toString()}`));
	}

	function handleQuizFilterChange(newFilter: 'all' | 'quiz' | 'speedrun') {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		if (newFilter === 'all') {
			params.delete('quizFilter');
		} else {
			params.set('quizFilter', newFilter);
		}
		goto(resolve(`/profile?${params.toString()}`));
	}

	let user = $derived(data.user);
	let profile = $derived(data.profile);
	let quizzes = $derived(data.quizzes ?? []);
	let submissions = $derived(data.submissions ?? []);
	let submissionFilter = $derived(data.submissionFilter);
	let quizFilter = $derived(data.quizFilter);
	let currentPage = $derived(data.currentPage);
	let totalPages = $derived(data.totalPages);
	let totalCount = $derived(data.totalCount);
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

				<div class="mt-4 flex items-baseline rounded-md">
					<Button variant="secondary" size="sm" onclick={handleSignOut} disabled={loading}>
						Log out
					</Button>
				</div>
			</div>
		</div>

		<div class=" hidden flex-col gap-1.5 text-sm">
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

	<div class="mt-4">
		<ModeToggle value={quizFilter} onChange={handleQuizFilterChange} />
	</div>

	{#if quizzes.length > 0}
		<div class="mt-4 flex flex-col gap-3">
			{#each quizzes as quiz (quiz.id)}
				<QuizRow {quiz} showCreator={false} showEditAndSubmissionsLinks={true} />
			{/each}
		</div>
	{:else}
		<div class="rounded-md bg-gray-50 p-8 text-center">
			<p class="mb-4 text-gray-600">
				{#if quizFilter === 'quiz'}
					You haven't created any regular quizzes.
				{:else if quizFilter === 'speedrun'}
					You haven't created any speed runs.
				{:else}
					You haven't created any quizzes yet.
				{/if}
			</p>
			<Button variant="accent" size="md" href="/create">Create Your First Quiz</Button>
		</div>
	{/if}

	<!-- My Submissions Section -->
	<div class="mt-10 flex items-center justify-between border-b border-gray-200 pb-2">
		<Heading level={2} class="flex-1">My Submissions</Heading>
	</div>

	<div class="mt-4">
		<ModeToggle value={submissionFilter} onChange={handleSubmissionFilterChange} />
	</div>

	{#if totalCount > 0}
		<div class="mt-4 flex flex-col gap-3">
			{#each submissions as submission (submission.id)}
				<SubmissionRow {submission} />
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="mt-6 flex items-center justify-between">
				<div class="text-sm text-gray-600 dark:text-gray-400">
					Page {currentPage} of {totalPages}
					({totalCount} total {totalCount === 1 ? 'submission' : 'submissions'})
				</div>
				<div class="flex gap-2">
					{#if currentPage > 1}
						{@const prevParams = new SvelteURLSearchParams(page.url.searchParams)}
						{@const _ = prevParams.set('page', String(currentPage - 1))}
						<a
							href={`/profile?${prevParams.toString()}`}
							class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
						>
							← Previous
						</a>
					{/if}
					{#if currentPage < totalPages}
						{@const nextParams = new SvelteURLSearchParams(page.url.searchParams)}
						{@const _ = nextParams.set('page', String(currentPage + 1))}
						<a
							href={`/profile?${nextParams.toString()}`}
							class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
						>
							Next →
						</a>
					{/if}
				</div>
			</div>
		{/if}
	{:else}
		<div class="rounded-md bg-gray-50 p-8 text-center">
			<p class="text-gray-600">
				{#if submissionFilter === 'quiz'}
					You haven't taken any quizzes yet.
				{:else if submissionFilter === 'speedrun'}
					You haven't completed any speed runs yet.
				{:else}
					You haven't taken any quizzes or completed any speed runs yet.
				{/if}
			</p>
		</div>
	{/if}
</PageContainer>
