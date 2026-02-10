<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	import Button from '$lib/components/Button.svelte';
	import Card from '$lib/components/Card.svelte';
	import ModeToggle from '$lib/components/ModeToggle.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import QuizRow from '$lib/components/QuizRow.svelte';
	import RenderTiptapContent from '$lib/components/RenderTiptapContent.svelte';
	import SubmissionRow from '$lib/components/SubmissionRow.svelte';
	import Tabs from '$lib/components/Tabs.svelte';

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
		params.set('quizPage', '1');
		goto(resolve(`/profile?${params.toString()}`));
	}

	let user = $derived(data.user);
	let profile = $derived(data.profile);
	let quizzes = $derived(data.quizzes ?? []);
	let submissions = $derived(data.submissions ?? []);
	let submissionFilter = $derived(data.submissionFilter);
	let quizFilter = $derived(data.quizFilter);
	let activeTab = $derived(data.activeTab);
	let quizCurrentPage = $derived(data.quizCurrentPage);
	let quizTotalPages = $derived(data.quizTotalPages);
	let quizTotalCount = $derived(data.quizTotalCount);
	let submissionCurrentPage = $derived(data.submissionCurrentPage);
	let submissionTotalPages = $derived(data.submissionTotalPages);
	let submissionTotalCount = $derived(data.submissionTotalCount);
</script>

<PageContainer>
	<Card class="flex" padding="sm" variant="neutral">
		<div class="mr-10 flex-1 rounded-lg">
			<div class="flex gap-6">
				<!-- Profile Image -->
				<div class="shrink-0">
					{#if profile.image}
						<img
							src={profile.image}
							alt={`${profile.name}'s profile`}
							class="h-[120px] w-[120px] rounded-lg object-cover"
						/>
					{:else}
						<div
							class="flex h-[120px] w-[120px] items-center justify-center rounded-lg bg-surface-muted"
						>
							<span class="text-5xl">👤</span>
						</div>
					{/if}
				</div>

				<!-- User Info -->
				<div class="grid flex-1 gap-2">
					<div class="flex items-baseline rounded-md">
						<div class="w-18 text-sm text-text-secondary">Name:</div>
						<div class="text-sm font-medium">{user.name}</div>
					</div>

					<div class="flex items-baseline rounded-md">
						<div class="w-18 text-sm text-text-secondary">Email:</div>
						<div class="text-sm font-medium">{user.email}</div>
					</div>

					<div class="flex items-baseline rounded-md">
						<div class="w-18 text-sm text-text-secondary">URL:</div>
						<a
							href={resolve(`/user/${profile.slug}`)}
							class="text-sm font-medium text-accent-indigo-text hover:text-accent-indigo-text"
							>/user/{profile.slug}</a
						>
					</div>

					<div class="flex items-baseline rounded-md">
						<div class="w-18 text-sm text-text-secondary">Joined:</div>
						<div class="text-sm font-medium">
							{new Date(profile.createdAt).toLocaleDateString('en-US', {
								year: 'numeric',
								month: 'long',
								day: 'numeric'
							})}
						</div>
					</div>

					<div class="mt-4 flex items-baseline gap-3 rounded-md">
						<Button variant="primary" size="sm" href="/profile/edit">Edit Profile</Button>
						<Button variant="secondary" size="sm" onclick={handleSignOut} disabled={loading}>
							Log out
						</Button>
					</div>
				</div>
			</div>

			<!-- Bio Section -->
			{#if profile.bio}
				<div class="mt-6 border-t border-border pt-4">
					<div class="text-sm text-text-secondary">Bio:</div>
					<div class="prose prose-sm mt-2 max-w-none">
						<RenderTiptapContent content={profile.bio} />
					</div>
				</div>
			{/if}
		</div>

		<div class=" hidden flex-col gap-1.5 text-sm">
			<a href={resolve('/')} class="underline">Update Profile</a>
			<a href={resolve('/')} class="underline">Change Password</a>
			<a href={resolve('/')} class="underline">View Activity</a>
			<a href={resolve('/')} class="underline">Delete Account</a>
		</div>
	</Card>

	<div class="mt-10">
		<Tabs
			tabs={[
				{ label: 'My Quizzes', value: 'quizzes' },
				{ label: 'My Submissions', value: 'submissions' }
			]}
			activeTab={activeTab === 'submissions' ? 'submissions' : 'quizzes'}
		>
			{#if activeTab === 'quizzes'}
				<div class="mb-4 flex items-center justify-between">
					<ModeToggle variant="minimal" value={quizFilter} onChange={handleQuizFilterChange} />
					<Button variant="accent" size="md" href="/create">Create Quiz</Button>
				</div>

				{#if quizzes.length > 0}
					<div class="flex flex-col gap-3">
						{#each quizzes as quiz (quiz.id)}
							<QuizRow {quiz} showCreator={false} showEditAndSubmissionsLinks={true} />
						{/each}
					</div>

					<Pagination
						currentPage={quizCurrentPage}
						totalPages={quizTotalPages}
						totalItems={quizTotalCount}
						itemsPerPage={20}
					/>
				{:else}
					<div class="rounded-md bg-surface-muted p-8 text-center">
						<p class="mb-4 text-text-secondary">
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
			{:else}
				<div class="mb-4">
					<ModeToggle
						variant="minimal"
						value={submissionFilter}
						onChange={handleSubmissionFilterChange}
					/>
				</div>

				{#if submissionTotalCount > 0}
					<div class="flex flex-col gap-3">
						{#each submissions as submission (submission.id)}
							<SubmissionRow {submission} />
						{/each}
					</div>

					<Pagination
						currentPage={submissionCurrentPage}
						totalPages={submissionTotalPages}
						totalItems={submissionTotalCount}
						itemsPerPage={20}
					/>
				{:else}
					<div class="rounded-md bg-surface-muted p-8 text-center">
						<p class="text-text-secondary">
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
			{/if}
		</Tabs>
	</div>
</PageContainer>
