<script lang="ts">
	import { resolve } from '$app/paths';

	import Button from '$lib/components/Button.svelte';
	import GlassCard from '$lib/components/GlassCard.svelte';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import QuizRow from '$lib/components/QuizRow.svelte';

	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let quizzes = $derived(data.quizzes ?? []);
</script>

<!-- Full gradient hero for non-logged-in users -->
<section
	class="animate-gradient-slow relative min-h-[70vh] w-full overflow-hidden bg-linear-to-br from-violet-600 via-cyan-500 to-blue-600 dark:from-indigo-950 dark:via-blue-900 dark:to-indigo-950"
>
	<!-- Floating orbs for depth -->
	<div
		class="animate-float absolute top-[20%] left-[10%] h-64 w-64 rounded-full bg-fuchsia-400/20 blur-[80px]"
		style="animation-delay: 0s;"
	></div>
	<div
		class="animate-float absolute top-[30%] right-[15%] h-48 w-48 rounded-full bg-cyan-400/20 blur-[80px]"
		style="animation-delay: -2s;"
	></div>
	<div
		class="animate-float absolute bottom-[20%] left-[30%] h-56 w-56 rounded-full bg-violet-400/20 blur-[80px]"
		style="animation-delay: -4s;"
	></div>

	<!-- Glass overlay for subtle texture -->
	<div class="absolute inset-0 bg-white/5 backdrop-blur-[1px]"></div>

	<!-- Content container -->
	<div
		class="relative z-10 mx-auto flex min-h-[70vh] max-w-6xl flex-col items-center justify-center px-6 py-20"
	>
		<div class="text-center">
			<div
				class="glass mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/90"
			>
				<span>🎉</span>
				<span>Join thousands of happy quiz creators</span>
			</div>

			<h1
				class="mb-6 text-5xl leading-tight font-bold tracking-tight text-white md:text-6xl lg:text-7xl"
			>
				Create Beautiful
				<span
					class="bg-linear-to-rrom-emerald-300 block via-cyan-300 to-blue-300 bg-clip-text text-transparent"
				>
					Quizzes in Minutes
				</span>
			</h1>

			<p class="mx-auto mb-10 max-w-2xl text-xl text-white/80">
				Design stunning quizzes, share them anywhere, and watch your audience engage like never
				before. No design skills needed.
			</p>

			<!-- CTA Buttons -->
			<div class="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
				<Button href="/signup" variant="glow" size="xl" class="animate-pulse-glow w-full sm:w-auto">
					🚀 Get Started Free
				</Button>
				<Button href="/quizzes" variant="glass" size="xl" class="w-full sm:w-auto">
					👀 Browse Quizzes
				</Button>
			</div>

			<!-- Feature highlights -->
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div class="glass-card rounded-xl p-6 text-center">
					<div class="mb-3 text-3xl">⚡</div>
					<h3 class="mb-1 font-semibold text-white">Lightning Fast</h3>
					<p class="text-sm text-white/70">Create quizzes in under 5 minutes</p>
				</div>
				<div class="glass-card rounded-xl p-6 text-center">
					<div class="mb-3 text-3xl">🎨</div>
					<h3 class="mb-1 font-semibold text-white">Beautiful Design</h3>
					<p class="text-sm text-white/70">Stunning templates out of the box</p>
				</div>
				<div class="glass-card rounded-xl p-6 text-center">
					<div class="mb-3 text-3xl">📊</div>
					<h3 class="mb-1 font-semibold text-white">Track Results</h3>
					<p class="text-sm text-white/70">See who took your quiz and how they did</p>
				</div>
				<div class="glass-card rounded-xl p-6 text-center">
					<div class="mb-3 text-3xl">🚀</div>
					<h3 class="mb-1 font-semibold text-white">Share Anywhere</h3>
					<p class="text-sm text-white/70">One link, works on any device</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Bottom gradient fade to white -->
	<div
		class="absolute right-0 bottom-0 left-0 h-32 bg-linear-to-t from-white via-white/80 to-transparent dark:from-gray-900 dark:via-gray-900/80"
	></div>
</section>

<!-- Recent Quizzes Section -->
<PageContainer class="py-16">
	<div class="mx-auto max-w-4xl">
		<div class="mb-12 text-center">
			<h2 class="mb-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
				Fresh from the Community
			</h2>
			<p class="text-lg text-gray-600 dark:text-gray-400">See what others are creating right now</p>
		</div>

		{#if quizzes.length > 0}
			<div class="flex flex-col gap-4">
				{#each quizzes as quiz (quiz.id)}
					<GlassCard padding="none" interactive={true} glowOnHover={true}>
						<div class="p-5">
							<QuizRow {quiz} showCreator={true} />
						</div>
					</GlassCard>
				{/each}
			</div>
		{:else}
			<GlassCard padding="lg" interactive={false}>
				<div class="text-center">
					<div class="mb-4 text-5xl">📝</div>
					<h3 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">No quizzes yet</h3>
					<p class="mb-6 text-gray-600 dark:text-gray-400">
						Be the first to create something amazing!
					</p>
					<Button href={resolve('/create')} variant="gradient" size="md">
						Create the First Quiz
					</Button>
				</div>
			</GlassCard>
		{/if}

		<!-- CTA for non-logged-in users -->
		<div class="mt-12 text-center">
			<GlassCard padding="xl" class="bg-linear-to-br from-violet-600/10 to-cyan-600/10">
				<div class="mb-4 text-4xl">✨</div>
				<h3 class="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
					Ready to create your own?
				</h3>
				<p class="mb-6 text-gray-600 dark:text-gray-400">
					Join thousands of creators and start building beautiful quizzes today. It's completely
					free.
				</p>
				<div class="flex flex-col items-center justify-center gap-3 sm:flex-row">
					<Button href="/signup" variant="gradient" size="lg">🚀 Get Started Free</Button>
					<Button href="/quizzes" variant="outline" size="lg">Browse More</Button>
				</div>
			</GlassCard>
		</div>
	</div>
</PageContainer>

<!-- Decorative section divider -->
<div class="relative h-32 overflow-hidden">
	<div
		class="absolute inset-0 bg-linear-to-r from-violet-100 via-fuchsia-100 to-cyan-100 opacity-50 dark:from-violet-950/30 dark:via-fuchsia-950/30 dark:to-cyan-950/30"
	></div>
	<div class="absolute inset-0 flex items-center justify-center">
		<div
			class="h-px w-1/3 bg-linear-to-r from-transparent via-gray-300 to-transparent dark:via-gray-700"
		></div>
	</div>
</div>

<!-- Features/Trust section -->
<section class="bg-white py-20 dark:bg-gray-900">
	<PageContainer>
		<div class="mx-auto max-w-4xl text-center">
			<h2 class="mb-4 text-3xl font-bold text-gray-900 dark:text-white">Loved by Quiz Creators</h2>
			<p class="mb-12 text-lg text-gray-600 dark:text-gray-400">
				Join a growing community of educators, marketers, and creators
			</p>

			<div class="grid gap-6 sm:grid-cols-3">
				<div
					class="rounded-2xl bg-linear-to-br from-emerald-50 to-teal-50 p-6 dark:from-emerald-950/30 dark:to-teal-950/30"
				>
					<div class="mb-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">10k+</div>
					<div class="text-sm text-gray-600 dark:text-gray-400">Quizzes Created</div>
				</div>
				<div
					class="rounded-2xl bg-linear-to-br from-violet-50 to-fuchsia-50 p-6 dark:from-violet-950/30 dark:to-fuchsia-950/30"
				>
					<div class="mb-2 text-3xl font-bold text-violet-600 dark:text-violet-400">500k+</div>
					<div class="text-sm text-gray-600 dark:text-gray-400">Quiz Takers</div>
				</div>
				<div
					class="rounded-2xl bg-linear-to-br from-amber-50 to-orange-50 p-6 dark:from-amber-950/30 dark:to-orange-950/30"
				>
					<div class="mb-2 text-3xl font-bold text-amber-600 dark:text-amber-400">4.9★</div>
					<div class="text-sm text-gray-600 dark:text-gray-400">Creator Rating</div>
				</div>
			</div>
		</div>
	</PageContainer>
</section>
