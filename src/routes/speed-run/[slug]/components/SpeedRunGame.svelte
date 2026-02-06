<script lang="ts">
	import type { GamePhase, SpeedRunQuestion, SpeedRunLeaderboardEntry } from '$lib/speed-run/types';
	import type { SpeedRun, User } from '$lib/server/db/schema';
	import { calculateSpeedRunScore, formatTimeMs } from '$lib/speed-run/scoring';
	import StartScreen from './StartScreen.svelte';
	import CountdownOverlay from './CountdownOverlay.svelte';
	import QuestionCard from './QuestionCard.svelte';
	import AnswerReveal from './AnswerReveal.svelte';
	import ResultsScreen from './ResultsScreen.svelte';
	import GameHUD from './GameHUD.svelte';

	interface Props {
		quiz: {
			id: string;
			title: string;
			slug: string;
			description: string;
		};
		speedRun: {
			id: string;
			defaultQuestionTimeLimit: number | null;
			revealDelayMs: number;
			audioLoopGapMs: number;
			enableStreakBonus: boolean;
		};
		questions: Array<{
			id: string;
			position: number;
			question: string | null;
			variantType: string;
			variantConfig: {
				type: string;
				options: Array<{ id: string; text: string; isCorrect: boolean }>;
				questionTimeLimit?: number;
			};
			track: { id: string; name: string; url: string };
		}>;
		initialLeaderboard: SpeedRunLeaderboardEntry[];
		user: User | null | undefined;
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

		// Validate answer with server immediately
		const formData = new FormData();
		formData.append('soundbiteId', currentQuestion.id);
		formData.append('guess', guess);

		let isCorrect = false;
		let correctAnswer = '';

		try {
			const response = await fetch('?/checkAnswer', {
				method: 'POST',
				body: formData
			});
			const responseData = await response.json();
			console.log('Check answer raw response:', responseData);

			// SvelteKit returns {type: 'success', status: 200, data: '<json-string>'}
			// The data string uses reference indices that need to be resolved
			let result;
			if (responseData.data && typeof responseData.data === 'string') {
				// Parse the data string and resolve references
				const parsedArray = JSON.parse(responseData.data);
				console.log('Check answer parsed array:', parsedArray);

				// The first element is an object with reference indices
				// e.g., {success: 1, isCorrect: 2, correctAnswer: 3}
				// where the numbers are indices into the parsedArray
				if (Array.isArray(parsedArray) && parsedArray.length > 0) {
					const refs = parsedArray[0];
					result = {};
					for (const [key, value] of Object.entries(refs)) {
						// If value is a number, it's a reference to parsedArray[value]
						if (typeof value === 'number') {
							result[key] = parsedArray[value];
						} else {
							result[key] = value;
						}
					}
				}
			} else {
				result = responseData;
			}

			console.log('Check answer resolved result:', result);

			if (result && result.success) {
				isCorrect = result.isCorrect === true;
				correctAnswer = result.correctAnswer || '';
			}
		} catch (e) {
			console.error('Failed to validate answer:', e);
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

		console.log('Setting lastAnswer:', { isCorrect, guess, correctAnswer, isLastQuestion });

		lastAnswer = {
			isCorrect,
			guess,
			correctAnswer,
			isLastQuestion
		};

		phase = 'revealing';

		// Auto-advance after reveal delay
		setTimeout(() => {
			if (currentQuestionIndex < questions.length - 1) {
				currentQuestionIndex++;
				phase = 'question';
				startQuestionTimer();
			} else {
				finishGame();
			}
		}, speedRun.revealDelayMs);
	}

	async function finishGame() {
		stopGlobalTimer();
		const endTime = Date.now();

		console.log('Submitting answers:', JSON.stringify(answers, null, 2));

		// Submit to server using FormData (required for SvelteKit form actions)
		const formData = new FormData();
		formData.append('speedRunId', speedRun.id);
		formData.append('answers', JSON.stringify(answers));
		formData.append('startTime', String(globalStartTime));
		formData.append('endTime', String(endTime));
		formData.append('displayName', displayName);

		try {
			const response = await fetch('?/submit', {
				method: 'POST',
				body: formData
			});

			const responseData = await response.json();
			console.log('Raw response:', responseData);

			// SvelteKit returns {type: 'success', status: 200, data: '<json-string>'}
			// The data string uses reference indices that need to be resolved
			let result;
			if (responseData.data && typeof responseData.data === 'string') {
				// Parse the data string and resolve references
				const parsedArray = JSON.parse(responseData.data);
				console.log('Parsed array:', parsedArray);

				// The first element is an object with reference indices
				// e.g., {success: 1, result: 2, rank: 3, top10: 4}
				// where the numbers are indices into the parsedArray
				if (Array.isArray(parsedArray) && parsedArray.length > 0) {
					const refs = parsedArray[0];
					result = {};
					for (const [key, value] of Object.entries(refs)) {
						// If value is a number, it's a reference to parsedArray[value]
						if (typeof value === 'number') {
							result[key] = parsedArray[value];
						} else {
							result[key] = value;
						}
					}

					// Also resolve references in nested result object
					if (result.result && typeof result.result === 'object') {
						const resolvedResult: Record<string, unknown> = {};
						for (const [key, value] of Object.entries(result.result)) {
							if (typeof value === 'number' && value < parsedArray.length) {
								resolvedResult[key] = parsedArray[value];
							} else {
								resolvedResult[key] = value;
							}
						}
						result.result = resolvedResult;
					}

					// Resolve references in top10 array
					if (result.top10 && Array.isArray(result.top10)) {
						result.top10 = result.top10.map((entry: unknown) => {
							if (entry && typeof entry === 'object') {
								const resolvedEntry: Record<string, unknown> = {};
								for (const [key, value] of Object.entries(entry)) {
									if (typeof value === 'number' && value < parsedArray.length) {
										resolvedEntry[key] = parsedArray[value];
									} else {
										resolvedEntry[key] = value;
									}
								}
								return resolvedEntry;
							}
							return entry;
						});
					}
				}
			} else {
				result = responseData;
			}

			console.log('Resolved result:', result);
			console.log('Result.result:', result?.result);
			console.log('Result.top10:', result?.top10);

			if (result && result.success && result.result) {
				const resultData = result.result;
				console.log('resultData:', resultData);
				console.log(
					'correctCount:',
					resultData.correctCount,
					'type:',
					typeof resultData.correctCount
				);
				console.log('totalTimeMs:', resultData.totalTimeMs, 'type:', typeof resultData.totalTimeMs);
				console.log('score:', resultData.score, 'type:', typeof resultData.score);
				console.log('streakMax:', resultData.streakMax, 'type:', typeof resultData.streakMax);

				finalResult = {
					rank: result.rank ?? 0,
					correctCount: resultData.correctCount ?? 0,
					totalTimeMs: resultData.totalTimeMs ?? 0,
					score: resultData.score ?? 0,
					maxStreak: resultData.streakMax ?? 0
				};

				// Handle top10 which might be an array of reference objects
				let top10 = result.top10 || [];
				console.log('Raw top10:', JSON.stringify(top10, null, 2));

				// Deep resolve any remaining references in top10 entries
				function deepResolve(obj: unknown): unknown {
					if (obj === null || obj === undefined) return obj;
					if (typeof obj === 'number' && obj < parsedArray.length) {
						return parsedArray[obj];
					}
					if (Array.isArray(obj)) {
						return obj.map(deepResolve);
					}
					if (typeof obj === 'object') {
						const resolved: Record<string, unknown> = {};
						for (const [key, value] of Object.entries(obj)) {
							resolved[key] = deepResolve(value);
						}
						return resolved;
					}
					return obj;
				}

				top10 = deepResolve(top10) as Array<Record<string, unknown>>;
				console.log('Deep resolved top10:', JSON.stringify(top10, null, 2));

				leaderboard = top10;
				console.log('finalResult set:', finalResult);
				console.log('leaderboard set:', leaderboard);
			} else {
				console.error('Submission failed or missing result:', result);
			}
		} catch (error) {
			console.error('Error submitting results:', error);
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
