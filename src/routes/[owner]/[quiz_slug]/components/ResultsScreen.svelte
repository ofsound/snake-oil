<script lang="ts">
	import { fly } from 'svelte/transition';

	import { resolve } from '$app/paths';
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
		onRestart
	}: Props = $props();

	const accuracy = $derived(Math.round((correctCount / totalQuestions) * 100));
</script>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<div class="mb-8 text-center" in:fly={{ y: -30, duration: 400 }}>
		<h1 class="mb-2 text-4xl font-bold text-white">Speed Run Complete! 🏁</h1>
		<p class="text-xl text-white/70">{quizTitle}</p>
	</div>

	<!-- Stats Grid -->
	<div class="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4" in:fly={{ y: -20, duration: 300 }}>
		<div class="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
			<div class="text-4xl font-bold text-white">{correctCount ?? 0}/{totalQuestions ?? 0}</div>
			<div class="mt-1 text-sm text-white/60">Correct</div>
		</div>
		<div class="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
			<div class="text-4xl font-bold text-amber-400">{accuracy ?? 0}%</div>
			<div class="mt-1 text-sm text-white/60">Accuracy</div>
		</div>
		<div class="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
			<div class="text-4xl font-bold text-white">{formatTimeMs(totalTimeMs ?? 0)}</div>
			<div class="mt-1 text-sm text-white/60">Total Time</div>
		</div>
		<div class="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
			<div class="text-4xl font-bold text-orange-400">{maxStreak ?? 0}</div>
			<div class="mt-1 text-sm text-white/60">Best Streak</div>
		</div>
	</div>

	<!-- Rank and Score -->
	<div
		class="mb-8 rounded-2xl border border-amber-500/30 bg-linear-to-r from-amber-500/20 to-orange-500/20 p-8 text-center"
		in:fly={{ y: 20, delay: 100, duration: 400 }}
	>
		<div class="mb-2 text-sm font-semibold tracking-wider text-amber-400 uppercase">Your Rank</div>
		<div class="mb-2 text-7xl font-black text-white">#{rank ?? '-'}</div>
		<div class="text-2xl text-white/80">
			Score: <span class="font-bold text-white">{score?.toLocaleString() ?? 'N/A'}</span>
		</div>
	</div>

	<!-- Leaderboard -->
	<div
		class="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6"
		in:fly={{ y: 20, delay: 200, duration: 400 }}
	>
		<h2 class="mb-6 text-2xl font-bold text-white">🏆 Leaderboard</h2>

		<div class="space-y-3">
			{#each leaderboard as entry, index (entry.id)}
				{@const isCurrentUserClass = entry.isCurrentUser
					? 'bg-amber-500/20 border border-amber-500/50'
					: 'bg-white/5'}
				<div
					class="flex items-center gap-4 rounded-xl p-4 {isCurrentUserClass}"
					in:fly={{ y: 20, delay: index * 50, duration: 300 }}
				>
					<!-- Rank -->
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-bold text-white"
					>
						{#if index === 0}
							🥇
						{:else if index === 1}
							🥈
						{:else if index === 2}
							🥉
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
						<div class="text-xl font-bold text-white">{entry.score?.toLocaleString() ?? 'N/A'}</div>
						{#if entry.streakMax >= 3}
							<div class="text-xs text-orange-400">🔥 {entry.streakMax} streak</div>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Actions -->
	<div class="flex gap-4" in:fly={{ y: 20, delay: 300 + leaderboard.length * 50, duration: 300 }}>
		<button
			onclick={onRestart}
			class="flex-1 rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-8 py-4 text-xl font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-105 hover:shadow-amber-500/40"
		>
			Play Again ⚡
		</button>
		<a
			href={resolve('/')}
			class="flex-1 rounded-xl border-2 border-white/20 bg-white/5 px-8 py-4 text-center text-xl font-bold text-white transition-all hover:bg-white/10"
		>
			More Quizzes
		</a>
	</div>
</div>
