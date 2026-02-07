<script lang="ts">
	interface Props {
		quizTitle: string;
		quizDescription: string;
		totalQuestions: number;
		defaultTimeLimit: number | null;
		displayName: string;
		onStart: (name: string) => void;
	}

	let {
		quizTitle,
		quizDescription,
		totalQuestions,
		defaultTimeLimit,
		displayName,
		onStart
	}: Props = $props();

	let localOverride = $state<string | null>(null);
	let nameInput = $derived(localOverride !== null ? localOverride : displayName);

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (nameInput.trim()) {
			onStart(nameInput.trim());
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center px-4">
	<div class="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-lg">
		<div class="mb-8 text-center">
			<div
				class="mb-4 inline-flex items-center justify-center rounded-full bg-linear-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-bold text-white"
			>
				⚡ SPEED RUN
			</div>
			<h1 class="mb-2 text-4xl font-bold text-white">{quizTitle}</h1>
			<p class="text-lg text-white/70">{quizDescription}</p>
		</div>

		<div class="mb-8 grid grid-cols-3 gap-4">
			<div class="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
				<div class="text-3xl font-bold text-white">{totalQuestions}</div>
				<div class="text-sm text-white/60">Questions</div>
			</div>
			<div class="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
				<div class="text-3xl font-bold text-white">
					{defaultTimeLimit ? `${defaultTimeLimit}s` : '∞'}
				</div>
				<div class="text-sm text-white/60">Per Question</div>
			</div>
			<div class="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
				<div class="text-3xl font-bold text-amber-400">RACE</div>
				<div class="text-sm text-white/60">Mode</div>
			</div>
		</div>

		<div class="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
			<h3 class="mb-2 font-semibold text-amber-400">How to Play:</h3>
			<ul class="space-y-2 text-sm text-white/80">
				<li class="flex items-start gap-2">
					<span class="text-amber-400">1.</span>
					<span>Listen to the audio clip and select the correct answer</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-amber-400">2.</span>
					<span>Answer quickly - there's a timer for each question!</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-amber-400">3.</span>
					<span>See your result immediately and move to the next question</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-amber-400">4.</span>
					<span>Build streaks for consecutive correct answers</span>
				</li>
				<li class="flex items-start gap-2">
					<span class="text-amber-400">5.</span>
					<span>Complete all questions as fast as possible!</span>
				</li>
			</ul>
		</div>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div>
				<label for="displayName" class="mb-2 block text-sm font-medium text-white/80">
					Enter your name for the leaderboard
				</label>
				<input
					type="text"
					id="displayName"
					value={nameInput}
					oninput={(e) => (localOverride = e.currentTarget.value)}
					placeholder="Your name"
					required
					class="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
				/>
			</div>

			<button
				type="submit"
				class="w-full rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-8 py-4 text-xl font-bold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-105 hover:shadow-amber-500/40"
			>
				START SPEED RUN ⚡
			</button>
		</form>
	</div>
</div>
