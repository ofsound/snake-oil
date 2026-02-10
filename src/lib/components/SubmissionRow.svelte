<script lang="ts">
	import { resolve } from '$app/paths';

	interface Submission {
		id: string;
		type: 'quiz' | 'speedrun';
		quizTitle: string;
		quizSlug: string;
		creatorSlug: string;
		creatorName: string;
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

	const rowHref = $derived(resolve(`/${submission.creatorSlug}/${submission.quizSlug}`));

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
			? 'flex cursor-pointer items-center justify-between rounded-md border border-accent-amber-border bg-accent-amber-bg px-3 py-3 transition-colors hover:brightness-95'
			: 'flex cursor-pointer items-center justify-between rounded-md border border-border-subtle bg-surface-subtle px-3 py-3 transition-colors hover:bg-interactive-bg'
	);
</script>

<div role="button" tabindex="0" onclick={handleClick} onkeydown={handleKeydown} class={rowClasses}>
	<div class="flex min-w-0 flex-1 flex-col gap-1">
		<div class="flex flex-wrap items-center gap-2">
			<div class="truncate font-semibold tracking-wide">{submission.quizTitle}</div>
			<span class="text-xs text-text-muted">by {submission.creatorName}</span>
		</div>
		<div class="text-xs text-text-muted">
			{formatDate(submission.createdAt)}
		</div>
	</div>

	<div class="flex items-center gap-4">
		{#if isSpeedRun}
			{@const sr = submission}
			<div class="flex items-center gap-4 text-sm">
				<div class="flex items-center gap-1">
					<span class="font-medium">{sr.correctCount}</span>
					<span class="text-text-muted">/{sr.totalQuestions}</span>
				</div>
				<div class="text-text-secondary">{formatTime(sr.totalTimeMs ?? 0)}</div>
				{#if sr.streakMax && sr.streakMax > 0}
					<div class="text-accent-amber-text">🔥 {sr.streakMax}</div>
				{/if}
				<div class="font-medium text-accent-amber-text">
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
						<span class="text-sm font-bold text-text-muted">#{sr.globalRank}</span>
					{/if}
				{/if}
			</div>
		{:else}
			<div class="text-sm text-text-secondary">
				<span class="font-medium">{submission.totalCorrect}</span>
				<span class="text-text-muted">/{submission.totalQuestions}</span>
				<span class="ml-1 text-xs text-text-muted">({submission.score}%)</span>
			</div>
		{/if}
	</div>
</div>
