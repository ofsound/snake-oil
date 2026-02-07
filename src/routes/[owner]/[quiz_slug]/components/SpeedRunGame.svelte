<script lang="ts">
	import StartScreen from './StartScreen.svelte';
	import CountdownOverlay from './CountdownOverlay.svelte';
	import QuestionCard from './QuestionCard.svelte';
	import AnswerReveal from './AnswerReveal.svelte';
	import ResultsScreen from './ResultsScreen.svelte';
	import GameHUD from './GameHUD.svelte';

	import { calculateSpeedRunScore, calculateMaxStreak } from '$lib/speed-run/scoring';

	import type {
		GamePhase,
		SpeedRunQuestion,
		SpeedRunLeaderboardEntry,
		SpeedRunCheckAnswerResponse,
		SpeedRunSubmitResponse
	} from '$lib/speed-run/types';
	interface Props {
		quiz: {
			title: string;
			description: string;
		};
		speedRun: {
			id: string;
			defaultQuestionTimeLimit: number | null;
			revealDelayMs: number;
			audioLoopGapMs: number;
		};
		questions: SpeedRunQuestion[];
		initialLeaderboard: SpeedRunLeaderboardEntry[];
		user: { id: string; name: string | null; email: string } | null | undefined;
	}

	let { quiz, speedRun, questions, initialLeaderboard, user }: Props = $props();

	// Game state
	let phase = $state<GamePhase>('idle');
	let currentQuestionIndex = $state(0);
	let globalStartTime = $state(0);
	let globalElapsedMs = $state(0);
	let questionStartTime = $state(0);
	let questionTimeLimitMs = $state(0);
	let questionRemainingMs = $state(0);
	let streak = $state(0);
	let maxStreak = $state(0);
	let answers = $state<
		Array<{
			soundbiteId: string;
			isCorrect: boolean;
			timeSpentMs: number;
			answeredAt: number;
			guess: string;
		}>
	>([]);
	let lastAnswer = $state<{
		isCorrect: boolean;
		guess: string;
		correctAnswer: string;
		isLastQuestion: boolean;
	} | null>(null);
	let displayName = $state(user?.name || '');
	let leaderboard = $state(initialLeaderboard);
	let finalResult = $state<{
		rank: number;
		correctCount: number;
		totalTimeMs: number;
		score: number;
		maxStreak: number;
	} | null>(null);

	// Animation frame for timer
	let animationFrameId: number;

	function startGlobalTimer() {
		globalStartTime = Date.now();

		function updateTimer() {
			if (phase === 'question' || phase === 'revealing') {
				globalElapsedMs = Date.now() - globalStartTime;
				animationFrameId = requestAnimationFrame(updateTimer);
			}
		}

		animationFrameId = requestAnimationFrame(updateTimer);
	}

	function stopGlobalTimer() {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
	}

	function startQuestionTimer() {
		const currentQuestion = questions[currentQuestionIndex];
		const timeLimit =
			currentQuestion.variantConfig.questionTimeLimit ?? speedRun.defaultQuestionTimeLimit;

		if (timeLimit) {
			questionTimeLimitMs = timeLimit * 1000;
			questionStartTime = Date.now();
			questionRemainingMs = questionTimeLimitMs;

			function updateQuestionTimer() {
				if (phase === 'question') {
					const elapsed = Date.now() - questionStartTime;
					questionRemainingMs = Math.max(0, questionTimeLimitMs - elapsed);

					if (questionRemainingMs <= 0) {
						// Time's up - treat as incorrect answer
						handleAnswer(''); // Empty guess = timeout
					} else {
						requestAnimationFrame(updateQuestionTimer);
					}
				}
			}

			requestAnimationFrame(updateQuestionTimer);
		}
	}

	function handleStart(name: string) {
		displayName = name;
		phase = 'countdown';
	}

	function handleCountdownComplete() {
		phase = 'question';
		startGlobalTimer();
		startQuestionTimer();
	}

	async function handleAnswer(guess: string) {
		const currentQuestion = questions[currentQuestionIndex];
		const timeSpent = Date.now() - questionStartTime;

		// Validate answer with server via API
		let isCorrect = false;
		let correctAnswer = '';

		try {
			const response = await fetch('/api/speed-run/check-answer', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					soundbiteId: currentQuestion.id,
					guess
				})
			});

			const result: SpeedRunCheckAnswerResponse = await response.json();

			if (result.success) {
				isCorrect = result.isCorrect;
				correctAnswer = result.correctAnswer;
			}
		} catch (e) {
			console.error('Failed to validate answer:', e);
			// Continue with local state - don't block the game on API failure
		}

		// Update streak
		if (isCorrect) {
			streak++;
			maxStreak = Math.max(maxStreak, streak);
		} else {
			streak = 0;
		}

		// Record answer
		answers = [
			...answers,
			{
				soundbiteId: currentQuestion.id,
				isCorrect,
				timeSpentMs: timeSpent,
				answeredAt: Date.now(),
				guess
			}
		];

		const isLastQuestion = currentQuestionIndex >= questions.length - 1;

		lastAnswer = {
			isCorrect,
			guess,
			correctAnswer,
			isLastQuestion
		};

		phase = 'revealing';

		// If last question, stop timer immediately and capture end time
		// Don't wait for the reveal delay to calculate final time
		if (isLastQuestion) {
			stopGlobalTimer();
			const finalEndTime = Date.now();

			// Auto-advance after reveal delay, but use pre-captured end time
			setTimeout(() => {
				finishGame(finalEndTime);
			}, speedRun.revealDelayMs);
		} else {
			// Auto-advance after reveal delay for non-last questions
			setTimeout(() => {
				currentQuestionIndex++;
				phase = 'question';
				startQuestionTimer();
			}, speedRun.revealDelayMs);
		}
	}

	async function finishGame(capturedEndTime?: number) {
		const endTime = capturedEndTime ?? Date.now();

		if (!capturedEndTime) {
			stopGlobalTimer();
		}

		// Submit results via API
		try {
			const response = await fetch('/api/speed-run/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					speedRunId: speedRun.id,
					answers,
					startTime: globalStartTime,
					endTime,
					displayName
				})
			});

			const result: SpeedRunSubmitResponse = await response.json();

			if (result.success) {
				finalResult = {
					rank: result.rank,
					correctCount: result.result.correctCount,
					totalTimeMs: result.result.totalTimeMs,
					score: result.result.score,
					maxStreak: result.result.streakMax
				};

				leaderboard = result.top10;
			} else {
				console.error('Submission failed:', result.error);
				// Fallback to client-side calculation
				const correctCount = answers.filter((a) => a.isCorrect).length;
				const totalTimeMs = endTime - globalStartTime;
				const maxStreak = calculateMaxStreak(answers);
				const score = calculateSpeedRunScore(correctCount, totalTimeMs);

				finalResult = {
					rank: 1,
					correctCount,
					totalTimeMs,
					score,
					maxStreak
				};
			}
		} catch (error) {
			console.error('Error submitting results:', error);
			// Fallback to client-side calculation on error
			const correctCount = answers.filter((a) => a.isCorrect).length;
			const totalTimeMs = endTime - globalStartTime;
			const maxStreak = calculateMaxStreak(answers);
			const score = calculateSpeedRunScore(correctCount, totalTimeMs);

			finalResult = {
				rank: 1,
				correctCount,
				totalTimeMs,
				score,
				maxStreak
			};
		}

		phase = 'results';
	}

	function handleRestart() {
		// Reset all state
		phase = 'idle';
		currentQuestionIndex = 0;
		globalStartTime = 0;
		globalElapsedMs = 0;
		questionStartTime = 0;
		questionTimeLimitMs = 0;
		questionRemainingMs = 0;
		streak = 0;
		maxStreak = 0;
		answers = [];
		lastAnswer = null;
		finalResult = null;
	}

	const currentQuestion = $derived(questions[currentQuestionIndex]);
	const progress = $derived({
		current: currentQuestionIndex + 1,
		total: questions.length
	});
</script>

{#if phase === 'idle'}
	<StartScreen
		quizTitle={quiz.title}
		quizDescription={quiz.description}
		totalQuestions={questions.length}
		defaultTimeLimit={speedRun.defaultQuestionTimeLimit}
		{displayName}
		onStart={handleStart}
	/>
{:else if phase === 'countdown'}
	<CountdownOverlay onComplete={handleCountdownComplete} />
{:else if phase === 'question' || phase === 'revealing'}
	<div class="container mx-auto max-w-4xl px-4 py-6">
		<GameHUD
			{progress}
			globalTimeMs={globalElapsedMs}
			{questionRemainingMs}
			{questionTimeLimitMs}
			{streak}
		/>

		{#if phase === 'question'}
			<QuestionCard
				question={currentQuestion}
				gapMs={speedRun.audioLoopGapMs}
				onAnswer={handleAnswer}
			/>
		{:else if lastAnswer}
			<AnswerReveal
				isCorrect={lastAnswer.isCorrect}
				guess={lastAnswer.guess}
				correctAnswer={lastAnswer.correctAnswer}
				revealDelayMs={speedRun.revealDelayMs}
				{streak}
				isLastQuestion={lastAnswer.isLastQuestion}
			/>
		{/if}
	</div>
{:else if phase === 'results'}
	{#if finalResult}
		<ResultsScreen
			quizTitle={quiz.title}
			correctCount={finalResult.correctCount}
			totalQuestions={questions.length}
			totalTimeMs={finalResult.totalTimeMs}
			score={finalResult.score}
			maxStreak={finalResult.maxStreak}
			rank={finalResult.rank}
			{leaderboard}
			onRestart={handleRestart}
		/>
	{:else}
		<div class="flex min-h-screen items-center justify-center px-4">
			<div class="text-center">
				<h2 class="text-2xl font-bold text-white">Loading Results...</h2>
				<p class="mt-2 text-white/60">If this persists, there may be an error.</p>
			</div>
		</div>
	{/if}
{/if}
