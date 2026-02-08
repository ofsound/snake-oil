<script lang="ts">
	import { resolve } from '$app/paths';

	interface Submission {
		id: string;
		type: 'quiz' | 'speedrun';
		quizTitle: string;
		quizSlug: string;
		ownerSlug: string;
		ownerName: string;
		createdAt: Date;
		totalCorrect?: number;
		totalQuestions?: number;
		score?: number;
		correctCount?: number;
		totalTimeMs?: number;
		streakMax?: number;
		speedRunScore?: number;
		globalRank?: number;
	}

	interface Props {
		submission: Submission;
	}

	let { submission }: Props = $props();

	const rowHref = $derived(resolve(`/${submission.ownerSlug}/${submission.quizSlug}`));

	function handleClick(event: MouseEvent): void {
		if (event.metaKey || event.ctrlKey) {
			window.open(rowHref, '_blank');
		} else {
			window.location.href = rowHref;
		}
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		if (event.metaKey || event.ctrlKey) {
			window.open(rowHref, '_blank');
		} else {
			window.location.href = rowHref;
		}
	}

	function formatDate(date: Date): string {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatTime(ms: number): string {
		return `${Math.floor(ms / 1000)}s`;
	}

	const isSpeedRun = $derived(submission.type === 'speedrun');

	const rowClasses = $derived(
		isSpeedRun
			? 'flex cursor-pointer items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-3 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50'
			: 'flex cursor-pointer items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-3 transition-colors hover:bg-neutral-200 dark:border-neutral-700/50 dark:bg-neutral-800 dark:hover:bg-neutral-700'
	);
</script>

<div role="button" tabindex="0" onclick={handleClick} onkeydown={handleKeydown} class={rowClasses}>
	<div class="flex min-w-0 flex-1 flex-col gap-1">
		<div class="flex flex-wrap items-center gap-2">
			<div class="truncate font-semibold tracking-wide">{submission.quizTitle}</div>
			<span class="text-xs text-gray-500 dark:text-gray-400">by {submission.ownerName}</span>
		</div>
		<div class="text-xs text-gray-500 dark:text-gray-400">
			{formatDate(submission.createdAt)}
		</div>
	</div>

	<div class="flex items-center gap-4">
		{#if isSpeedRun}
			{@const sr = submission}
			<div class="flex items-center gap-4 text-sm">
				<div class="flex items-center gap-1">
					<span class="font-medium">{sr.correctCount}</span>
					<span class="text-gray-500">/{sr.totalQuestions}</span>
				</div>
				<div class="text-gray-600 dark:text-gray-400">{formatTime(sr.totalTimeMs ?? 0)}</div>
				{#if sr.streakMax && sr.streakMax > 0}
					<div class="text-orange-500">🔥 {sr.streakMax}</div>
				{/if}
				<div class="font-medium text-amber-600 dark:text-amber-400">
					{sr.speedRunScore?.toLocaleString()} pts
				</div>
				{#if sr.globalRank}
					{#if sr.globalRank === 1}
						<span class="text-2xl leading-none">🥇</span>
					{:else if sr.globalRank === 2}
						<span class="text-2xl leading-none">🥈</span>
					{:else if sr.globalRank === 3}
						<span class="text-2xl leading-none">🥉</span>
					{:else}
						<span class="text-sm font-bold text-gray-600 dark:text-gray-400">#{sr.globalRank}</span>
					{/if}
				{/if}
			</div>
		{:else}
			<div class="text-sm text-gray-700 dark:text-gray-300">
				<span class="font-medium">{submission.totalCorrect}</span>
				<span class="text-gray-500">/{submission.totalQuestions}</span>
				<span class="ml-1 text-xs text-gray-500">({submission.score}%)</span>
			</div>
		{/if}
	</div>
</div>
