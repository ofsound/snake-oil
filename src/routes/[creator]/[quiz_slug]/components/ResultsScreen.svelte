<script lang="ts">
	import { fly } from 'svelte/transition';

	import Icon from '$lib/components/Icon.svelte';

	import { formatTimeMs } from '$lib/speed-run/scoring';

	import type { SpeedRunLeaderboardEntry } from '$lib/speed-run/types';

	interface Props {
		quizTitle: string;
		correctCount: number;
		totalQuestions: number;
		totalTimeMs: number;
		score: number;
		maxStreak: number;
		rank: number;
		leaderboard: SpeedRunLeaderboardEntry[];
		onRestart: () => void;
		nextQuiz?: {
			slug: string;
			title: string;
			creatorSlug: string;
		} | null;
	}

	let {
		quizTitle,
		correctCount,
		totalQuestions,
		totalTimeMs,
		score,
		maxStreak,
		rank,
		leaderboard,
		onRestart,
		nextQuiz
	}: Props = $props();

	const accuracy = $derived(Math.round((correctCount / totalQuestions) * 100));

	let showContent = $state(false);

	$effect(() => {
		const timer = setTimeout(() => {
			showContent = true;
		}, 50);
		return () => clearTimeout(timer);
	});

	// Medal icons for top 3 ranks
	function getRankIcon(index: number): { icon: 'trophy' | 'medal'; color: string } | null {
		if (index === 0) return { icon: 'trophy', color: 'text-yellow-400' };
		if (index === 1) return { icon: 'medal', color: 'text-gray-300' };
		if (index === 2) return { icon: 'medal', color: 'text-amber-600' };
		return null;
	}
</script>

{#if showContent}
	<div class="container mx-auto max-w-4xl px-4 py-8">
		<div class="mb-8 text-center" in:fly={{ y: -30, duration: 600 }}>
			<h1 class="mb-2 flex items-center justify-center gap-3 text-4xl font-bold text-white">
				<Icon name="flag" size="xl" />
				Speed Run Complete!
			</h1>
			<p class="text-xl text-white/70">{quizTitle}</p>
		</div>

		<!-- Stats Grid -->
		<div
			class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4"
			in:fly={{ y: -20, delay: 100, duration: 500 }}
		>
			<div class="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
				<div class="mb-1 flex items-center justify-center text-white/60">
					<Icon name="check-circle" size="sm" />
				</div>
				<div class="text-4xl font-bold text-white">{correctCount ?? 0}/{totalQuestions ?? 0}</div>
				<div class="mt-1 text-sm text-white/60">Correct</div>
			</div>
			<div class="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
				<div class="mb-1 flex items-center justify-center text-white/60">
					<Icon name="stats" size="sm" />
				</div>
				<div class="text-4xl font-bold text-amber-400">{accuracy ?? 0}%</div>
				<div class="mt-1 text-sm text-white/60">Accuracy</div>
			</div>
			<div class="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
				<div class="mb-1 flex items-center justify-center text-white/60">
					<Icon name="timer" size="sm" />
				</div>
				<div class="text-4xl font-bold text-white">{formatTimeMs(totalTimeMs ?? 0)}</div>
				<div class="mt-1 text-sm text-white/60">Total Time</div>
			</div>
			<div class="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
				<div class="mb-1 flex items-center justify-center text-white/60">
					<Icon name="flame" size="sm" />
				</div>
				<div class="text-4xl font-bold text-orange-400">{maxStreak ?? 0}</div>
				<div class="mt-1 text-sm text-white/60">Best Streak</div>
			</div>
		</div>

		<!-- Rank and Score -->
		<div
			class="mb-8 rounded-2xl border border-amber-500/30 bg-linear-to-r from-amber-500/20 to-orange-500/20 p-8 text-center"
			in:fly={{ y: 20, delay: 200, duration: 600 }}
		>
			<div
				class="mb-2 flex items-center justify-center gap-2 text-sm font-semibold tracking-wider text-amber-400 uppercase"
			>
				<Icon name="trophy" size="sm" />
				Your Rank
			</div>
			<div class="mb-2 text-7xl font-black text-white">#{rank ?? '-'}</div>
			<div class="text-2xl text-white/80">
				Score: <span class="font-bold text-white">{score?.toLocaleString() ?? 'N/A'}</span>
			</div>
		</div>

		<!-- Leaderboard -->
		<div
			class="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6"
			in:fly={{ y: 20, delay: 300, duration: 500 }}
		>
			<h2 class="mb-6 flex items-center gap-2 text-2xl font-bold text-white">
				<Icon name="leaderboard" size="lg" />
				Leaderboard
			</h2>

			<div class="space-y-3">
				{#each leaderboard as entry, index (entry.id)}
					{@const isCurrentUserClass = entry.isCurrentUser
						? 'bg-amber-500/20 border border-amber-500/50'
						: 'bg-white/5'}
					{@const rankIcon = getRankIcon(index)}
					<div
						class="flex items-center gap-4 rounded-xl p-4 {isCurrentUserClass}"
						in:fly={{ y: 20, delay: 400 + index * 150, duration: 500 }}
					>
						<!-- Rank -->
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-bold text-white"
						>
							{#if rankIcon}
								<Icon name={rankIcon.icon} size="sm" class={rankIcon.color} />
							{:else}
								{index + 1}
							{/if}
						</div>

						<!-- Name -->
						<div class="flex-1">
							<div class="font-semibold text-white">
								{entry.displayName}
								{#if entry.isCurrentUser}
									<span class="ml-2 text-xs text-amber-400">(You)</span>
								{/if}
							</div>
							<div class="text-sm text-white/60">
								{entry.correctCount} correct • {formatTimeMs(entry.totalTimeMs)}
							</div>
						</div>

						<!-- Score -->
						<div class="text-right">
							<div class="text-xl font-bold text-white">
								{entry.score?.toLocaleString() ?? 'N/A'}
							</div>
							{#if entry.streakMax >= 3}
								<div class="flex items-center justify-end gap-1 text-xs text-orange-400">
									<Icon name="flame" size="xs" />
									{entry.streakMax} streak
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Actions -->
		<div
			class="flex gap-4"
			in:fly={{ y: 20, delay: 400 + leaderboard.length * 150, duration: 500 }}
		>
			<button
				onclick={onRestart}
				class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-8 py-4 text-xl font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-105 hover:shadow-amber-500/40"
			>
				<Icon name="refresh" size="lg" />
				Play Again
			</button>
			{#if nextQuiz}
				<a
					href="/{nextQuiz.creatorSlug}/{nextQuiz.slug}"
					class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-center text-xl font-bold text-slate-900 transition-all hover:scale-105 hover:bg-white/90"
				>
					<Icon name="arrow-right" size="lg" />
					Play Next: {nextQuiz.title}
				</a>
			{/if}
		</div>
	</div>
{/if}
