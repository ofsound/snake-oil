<script lang="ts">
	import type { PageData } from './$types';
	import SpeedRunGame from './components/SpeedRunGame.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Speed Run: {data.quiz.title}</title>
	<meta name="description" content="Test your knowledge in this timed speed run quiz!" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
	<SpeedRunGame
		quiz={data.quiz}
		speedRun={data.speedRun}
		questions={data.questions}
		initialLeaderboard={data.leaderboard}
		user={data.user}
	/>
</div>
