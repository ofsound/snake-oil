<script lang="ts">
	import type { GamePhase, SpeedRunQuestion, SpeedRunLeaderboardEntry } from '$lib/speed-run/types';
	import type { SpeedRun, User } from '$lib/server/db/schema';
	import { calculateSpeedRunScore, calculateMaxStreak, formatTimeMs } from '$lib/speed-run/scoring';
	import StartScreen from './StartScreen.svelte';
	import CountdownOverlay from './CountdownOverlay.svelte';
	import QuestionCard from './QuestionCard.svelte';
	import AnswerReveal from './AnswerReveal.svelte';
	import ResultsScreen from './ResultsScreen.svelte';
	import GameHUD from './GameHUD.svelte';

	/**
	 * Resolves SvelteKit's devalue serialization format
	 * Format: Array where index 0 is the root object.
	 * Property values can be:
	 * - primitives: used directly
	 * - numbers: references to other indices in the array (for deduplication)
	 * - objects/arrays: contain a mix of primitives and references
	 */
	function resolveDevalue(parsed: unknown[]): Record<string, unknown> {
		if (!Array.isArray(parsed) || parsed.length === 0) {
			return {};
		}

		const resolved = new Map<number, unknown>();

		function resolveValue(value: unknown, path: string = ''): unknown {
			// Direct primitive value
			if (value === null || (typeof value !== 'object' && typeof value !== 'number')) {
				return value;
			}

			// Handle reference indices
			if (typeof value === 'number') {
				// This is a reference - resolve it from the parsed array
				if (value >= 0 && value < parsed.length) {
					// Check for circular reference
					if (resolved.has(value)) {
						return resolved.get(value);
					}
					// Mark as resolving to prevent infinite loops
					resolved.set(value, parsed[value]);
					const dereferenced = resolveValue(parsed[value], `${path}[${value}]`);
					resolved.set(value, dereferenced);
					return dereferenced;
				}
				return value;
			}

			// Handle arrays
			if (Array.isArray(value)) {
				return value.map((item, i) => resolveValue(item, `${path}[${i}]`));
			}

			// Handle objects
			if (typeof value === 'object' && value !== null) {
				const obj: Record<string, unknown> = {};
				for (const [key, val] of Object.entries(value)) {
					obj[key] = resolveValue(val, `${path}.${key}`);
				}
				return obj;
			}

			return value;
		}

		return resolveValue(parsed[0]) as Record<string, unknown>;
	}

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
			console.log('Check answer raw response:', JSON.stringify(responseData, null, 2));

			// Parse SvelteKit form action response using devalue format
			let result: Record<string, unknown> = {};
			if (responseData.type === 'success' && responseData.data) {
				const parsed = JSON.parse(responseData.data);
				console.log('Check answer parsed:', parsed);

				if (Array.isArray(parsed) && parsed.length > 0) {
					result = resolveDevalue(parsed);
				} else {
					result = parsed as Record<string, unknown>;
				}
			} else if (responseData.success) {
				result = responseData as Record<string, unknown>;
			}

			console.log('Check answer resolved result:', JSON.stringify(result, null, 2));

			if (result && result.success) {
				isCorrect = result.isCorrect === true;
				correctAnswer = String(result.correctAnswer || '');
				console.log('Answer validation:', { isCorrect, correctAnswer });
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

		// If last question, stop timer immediately and capture end time
		// Don't wait for the reveal delay to calculate final time
		if (isLastQuestion) {
			stopGlobalTimer();
			const finalEndTime = Date.now();
			console.log('Last question answered, timer stopped at:', finalEndTime);

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
		// Use pre-captured end time if provided (for last question), otherwise stop timer now
		const endTime = capturedEndTime ?? Date.now();

		if (!capturedEndTime) {
			stopGlobalTimer();
		}

		console.log('Finishing game with end time:', endTime, '(captured:', !!capturedEndTime, ')');

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
			console.log('Raw response:', JSON.stringify(responseData, null, 2));

			// Parse SvelteKit form action response
			// Format: {type: 'success', status: 200, data: '<devalue-serialized-string>'}
			let result: Record<string, unknown> = {};

			if (responseData.type === 'success' && responseData.data) {
				try {
					// The data is devalue-serialized, we need to parse it
					const parsed = JSON.parse(responseData.data);
					console.log('Parsed devalue data:', parsed);

					// Check if it's the array format with references
					if (Array.isArray(parsed) && parsed.length > 0) {
						result = resolveDevalue(parsed);
					} else {
						result = parsed as Record<string, unknown>;
					}
				} catch (e) {
					console.error('Failed to parse response data:', e);
					result = {};
				}
			} else if (responseData.success) {
				// Already parsed
				result = responseData as Record<string, unknown>;
			}

			console.log('Resolved result:', JSON.stringify(result, null, 2));

			if (result && result.success && result.result) {
				const resultData = result.result as Record<string, unknown>;
				console.log('resultData:', resultData);

				// Calculate client-side values from answers array as fallback
				const clientCorrectCount = answers.filter((a) => a.isCorrect).length;
				const clientTotalTimeMs = endTime - globalStartTime;
				const clientStreakMax = calculateMaxStreak(answers);
				const clientScore = calculateSpeedRunScore(clientCorrectCount, clientTotalTimeMs);

				console.log('Client-side calculated values:', {
					clientCorrectCount,
					clientTotalTimeMs,
					clientScore,
					clientStreakMax
				});

				// Validate and extract numeric values from server, with client-side fallback
				const correctCount =
					typeof resultData.correctCount === 'number' && resultData.correctCount > 0
						? resultData.correctCount
						: clientCorrectCount;
				const totalTimeMs =
					typeof resultData.totalTimeMs === 'number' && resultData.totalTimeMs > 0
						? resultData.totalTimeMs
						: clientTotalTimeMs;
				const score =
					typeof resultData.score === 'number' && resultData.score > 0
						? resultData.score
						: clientScore;
				const streakMax =
					typeof resultData.streakMax === 'number' && resultData.streakMax > 0
						? resultData.streakMax
						: clientStreakMax;

				console.log('Final values (server with fallback):', {
					correctCount,
					totalTimeMs,
					score,
					streakMax
				});

				finalResult = {
					rank: typeof result.rank === 'number' && result.rank > 0 ? result.rank : 1,
					correctCount,
					totalTimeMs,
					score,
					maxStreak: streakMax
				};

				// Handle top10 leaderboard - use client-side values for current user
				// to avoid devalue parsing issues
				const rawTop10 = result.top10;
				let top10: SpeedRunLeaderboardEntry[] = [];

				// Create current user entry with client-side calculated values
				const currentUserEntry: SpeedRunLeaderboardEntry = {
					id: String(resultData.id ?? 'current'),
					displayName: displayName || 'You',
					correctCount,
					totalTimeMs,
					streakMax,
					score,
					createdAt: new Date(),
					isCurrentUser: true
				};

				if (Array.isArray(rawTop10) && rawTop10.length > 0) {
					// Try to use server data for other players, but use client data for current user
					top10 = rawTop10
						.filter((entry: unknown) => typeof entry === 'object' && entry !== null)
						.map((entry: unknown) => {
							const e = entry as Record<string, unknown>;
							const isCurrent = Boolean(e.isCurrentUser);

							// If this is the current user, use our client-side calculated values
							if (isCurrent) {
								return currentUserEntry;
							}

							// For other users, try to use server values
							return {
								id: String(e.id ?? ''),
								displayName: String(e.displayName ?? 'Anonymous'),
								correctCount: typeof e.correctCount === 'number' ? e.correctCount : 0,
								totalTimeMs: typeof e.totalTimeMs === 'number' ? e.totalTimeMs : 0,
								streakMax: typeof e.streakMax === 'number' ? e.streakMax : 0,
								score: typeof e.score === 'number' ? e.score : 0,
								createdAt:
									e.createdAt instanceof Date
										? e.createdAt
										: new Date(String(e.createdAt ?? Date.now())),
								isCurrentUser: false
							};
						});
				}

				// If parsing failed or no entries, use just the current user
				if (top10.length === 0) {
					top10 = [currentUserEntry];
				}

				console.log('Processed leaderboard:', JSON.stringify(top10, null, 2));

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
