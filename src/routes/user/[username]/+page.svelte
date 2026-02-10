<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import Heading from '$lib/components/Heading.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import QuizRow from '$lib/components/QuizRow.svelte';
	import RenderTiptapContent from '$lib/components/RenderTiptapContent.svelte';

	import type { PageProps } from './$types';
	let { data }: PageProps = $props();
	let user = $derived(data.user);
	let quizzes = $derived(data.quizzes ?? []);
</script>

<PageContainer>
	<Card padding="sm" variant="neutral">
		<div class="flex gap-6">
			<!-- Profile Image -->
			<div class="shrink-0">
				{#if user.image}
					<img
						src={user.image}
						alt="{user.name || 'User'}'s profile picture"
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
			<div class="flex-1">
				<Heading level={1} class="mb-1.5">
					{user.name || 'User Profile'}
				</Heading>
				<div class="text-sm">
					<span class=" text-text-secondary">Joined:</span>
					<span class=" font-medium">
						{new Date(user.createdAt).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
					</span>
				</div>
			</div>
		</div>

		<!-- Bio Section -->
		{#if user.bio}
			<div class="mt-6 border-t border-border pt-4">
				<div class="prose prose-sm max-w-none">
					<RenderTiptapContent content={user.bio} />
				</div>
			</div>
		{/if}
	</Card>

	<Heading level={2} class="mt-10 border-b border-border pb-2">Quizzes</Heading>

	<div class="mt-4">
		{#if quizzes.length > 0}
			<div class="flex flex-col gap-3">
				{#each quizzes as quiz (quiz.id)}
					<QuizRow {quiz} showCreator={false} />
				{/each}
			</div>
		{:else}
			<div class="rounded-md bg-surface-muted p-8 text-center">
				<p class="mb-4 text-text-secondary">This user hasn't created any quizzes yet.</p>
			</div>
		{/if}
	</div>
</PageContainer>
