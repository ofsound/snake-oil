<script lang="ts">
	import { formatTimeLong } from '$lib/speed-run/scoring';
	interface Props {
		progress: { current: number; total: number };
		globalTimeMs: number;
		questionRemainingMs: number;
		questionTimeLimitMs: number;
		streak: number;
	}

	let { progress, globalTimeMs, questionRemainingMs, questionTimeLimitMs, streak }: Props =
		$props();

	// Calculate progress percentage
	const progressPercent = $derived((progress.current / progress.total) * 100);

	// Calculate question timer percentage and color
	const questionTimerPercent = $derived(
		questionTimeLimitMs > 0 ? (questionRemainingMs / questionTimeLimitMs) * 100 : 100
	);

	const timerColor = $derived(() => {
		if (questionTimerPercent > 50) return '#22c55e'; // Green
		if (questionTimerPercent > 25) return '#f97316'; // Orange
		return '#ef4444'; // Red
	});
</script>

<div class="mb-6 space-y-4">
	<!-- Top bar with global timer and progress -->
	<div class="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
		<div class="flex items-center gap-4">
			<div class="text-2xl font-bold text-white">
				{formatTimeLong(globalTimeMs)}
			</div>
			<div class="text-white/60">⏱️</div>
		</div>

		<div class="flex items-center gap-3">
			<div class="text-right">
				<div class="text-2xl font-bold text-white">
					{progress.current}<span class="text-white/40">/{progress.total}</span>
				</div>
				<div class="text-xs text-white/60">Questions</div>
			</div>
		</div>
	</div>

	<!-- Progress bar -->
	<div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
		<div
			class="h-full rounded-full bg-linear-to-r from-amber-500 to-orange-500 transition-all duration-300"
			style="width: {progressPercent}%"
		></div>
	</div>

	<!-- Question timer and streak -->
	<div class="flex items-center justify-between">
		{#if questionTimeLimitMs > 0}
			<div class="flex items-center gap-3">
				<!-- Circular timer -->
				<div class="relative h-12 w-12">
					<svg class="h-full w-full -rotate-90" viewBox="0 0 36 36">
						<!-- Background circle -->
						<path
							d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
							fill="none"
							stroke="rgba(255,255,255,0.1)"
							stroke-width="3"
						/>
						<!-- Progress circle -->
						<path
							d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
							fill="none"
							stroke={timerColor()}
							stroke-width="3"
							stroke-dasharray="{questionTimerPercent}, 100"
							class="transition-all duration-100"
						/>
					</svg>
					<div class="absolute inset-0 flex items-center justify-center">
						<span class="text-xs font-bold text-white">
							{Math.ceil(questionRemainingMs / 1000)}
						</span>
					</div>
				</div>
				<span class="text-sm text-white/60">Time Remaining</span>
			</div>
		{:else}
			<div></div>
		{/if}

		<!-- Streak counter -->
		{#if streak > 0}
			<div
				class="flex items-center gap-2 rounded-full bg-linear-to-r from-orange-500 to-red-500 px-4 py-2"
			>
				<span class="text-xl">🔥</span>
				<span class="font-bold text-white">{streak}</span>
			</div>
		{:else}
			<div></div>
		{/if}
	</div>
</div>
