<script lang="ts">
	import StartScreen from './StartScreen.svelte';
	import CountdownOverlay from './CountdownOverlay.svelte';
	import QuestionCard from './QuestionCard.svelte';
	import AnswerReveal from './AnswerReveal.svelte';
	import ResultsScreen from './ResultsScreen.svelte';
	import GameHUD from './GameHUD.svelte';
	import AudioPlayer from './AudioPlayer.svelte';

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
	let displayName = $derived(user?.name || '');
	let submittedLeaderboard = $state<SpeedRunLeaderboardEntry[] | null>(null);
	let leaderboard = $derived(submittedLeaderboard ?? initialLeaderboard);
	let finalResult = $state<{
		rank: number;
		correctCount: number;
		totalTimeMs: number;
		score: number;
		maxStreak: number;
	} | null>(null);

	// Audio player reference for fading out
	let audioPlayerRef = $state<AudioPlayer | null>(null);

	// Preloading state
	let preloadStatus = $state<'idle' | 'loading' | 'error' | 'complete'>('idle');
	let preloadProgress = $state(0);
	let preloadTotal = $state(0);

	// Animation frame for timer
	let animationFrameId: number;

	// Shared validation helper for all variant types
	async function validateAnswer(
		soundbiteId: string,
		guess: string
	): Promise<{ isCorrect: boolean; correctAnswer: string } | null> {
		try {
			const response = await fetch('/api/speed-run/check-answer', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ soundbiteId, guess })
			});

			const result: SpeedRunCheckAnswerResponse = await response.json();

			if (result.success) {
				return {
					isCorrect: result.isCorrect,
					correctAnswer: result.correctAnswer
				};
			}
		} catch (e) {
			console.error('Failed to validate answer:', e);
		}
		return null;
	}

	// Preload all images and audio metadata before starting
	async function preloadAllAssets(): Promise<boolean> {
		preloadStatus = 'loading';
		preloadProgress = 0;

		// Collect all URLs to preload
		const imageUrls: string[] = [];
		const audioUrls: string[] = [];

		questions.forEach((q) => {
			// Audio for ALL question types
			audioUrls.push(q.track.url);

			// Images only for image_choice
			if (q.variantType === 'image_choice') {
				q.variantConfig.options.forEach((opt) => {
					// Skip blob URLs (temporary preview URLs) - only preload actual uploaded images
					if (opt.imageUrl && !opt.imageUrl.startsWith('blob:')) {
						imageUrls.push(opt.imageUrl);
					}
				});
			}
		});

		preloadTotal = imageUrls.length + audioUrls.length;
		let loaded = 0;

		const updateProgress = () => {
			loaded++;
			preloadProgress = loaded;
		};

		// Preload images
		const imagePromises = imageUrls.map(
			(url) =>
				new Promise<void>((resolve, reject) => {
					const img = new Image();
					img.onload = () => {
						updateProgress();
						resolve();
					};
					img.onerror = () => {
						reject(new Error(`Failed to load image: ${url}`));
					};
					img.src = url;
				})
		);

		// Preload audio metadata
		const audioPromises = audioUrls.map(
			(url) =>
				new Promise<void>((resolve, reject) => {
					const audio = new Audio();
					audio.preload = 'metadata';

					const timeout = setTimeout(() => {
						reject(new Error(`Timeout loading audio: ${url}`));
					}, 10000);

					audio.onloadedmetadata = () => {
						clearTimeout(timeout);
						updateProgress();
						resolve();
					};

					audio.onerror = () => {
						clearTimeout(timeout);
						reject(new Error(`Failed to load audio: ${url}`));
					};

					audio.src = url;
				})
		);

		// All must succeed
		try {
			await Promise.all([...imagePromises, ...audioPromises]);
			preloadStatus = 'complete';
			return true;
		} catch (error) {
			preloadStatus = 'error';
			console.error('Preload failed:', error);
			return false;
		}
	}

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

	async function handleStart(name: string) {
		displayName = name;

		// Check if we have any image_choice questions that need preloading
		const hasImageChoice = questions.some((q) => q.variantType === 'image_choice');

		if (hasImageChoice) {
			// Preload all assets first
			const success = await preloadAllAssets();
			if (!success) {
				// Force reload on failure
				setTimeout(() => {
					window.location.reload();
				}, 2000);
				return;
			}
		}

		phase = 'countdown';
	}

	function handleCountdownComplete() {
		phase = 'question';
		startGlobalTimer();
		startQuestionTimer();
	}

	async function handleAnswer(guess: string, isCorrect?: boolean, correctAnswerText?: string) {
		const currentQuestion = questions[currentQuestionIndex];
		const timeSpent = Date.now() - questionStartTime;

		// If isCorrect is not provided, we need to check via API
		// This happens for multiple_choice (immediate) or simple_guess timeout
		let finalIsCorrect = isCorrect ?? false;
		let finalCorrectAnswer = correctAnswerText ?? '';

		if (isCorrect === undefined) {
			// Validate answer with server via API
			const result = await validateAnswer(currentQuestion.id, guess);
			if (result) {
				finalIsCorrect = result.isCorrect;
				finalCorrectAnswer = result.correctAnswer;
			}
		}

		// Update streak
		if (finalIsCorrect) {
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
				isCorrect: finalIsCorrect,
				timeSpentMs: timeSpent,
				answeredAt: Date.now(),
				guess
			}
		];

		const isLastQuestion = currentQuestionIndex >= questions.length - 1;

		lastAnswer = {
			isCorrect: finalIsCorrect,
			guess,
			correctAnswer: finalCorrectAnswer,
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

				submittedLeaderboard = result.top10;
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
	{#if preloadStatus === 'loading'}
		<div class="flex min-h-screen items-center justify-center px-4">
			<div class="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
				<div class="mb-4 text-2xl font-bold text-white">Preparing Quiz...</div>
				<div class="mb-2 text-white/60">{preloadProgress} / {preloadTotal}</div>
				<div class="h-2 w-full overflow-hidden rounded-full bg-white/10">
					<div
						class="h-full bg-amber-500 transition-all duration-300"
						style="width: {(preloadProgress / preloadTotal) * 100}%"
					></div>
				</div>
			</div>
		</div>
	{:else if preloadStatus === 'error'}
		<div class="flex min-h-screen items-center justify-center px-4">
			<div
				class="w-full max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center"
			>
				<div class="mb-4 text-2xl font-bold text-red-400">Loading Failed</div>
				<div class="text-white/60">Reloading...</div>
			</div>
		</div>
	{:else}
		<StartScreen
			quizTitle={quiz.title}
			quizDescription={quiz.description}
			totalQuestions={questions.length}
			defaultTimeLimit={speedRun.defaultQuestionTimeLimit}
			{displayName}
			onStart={handleStart}
		/>
	{/if}
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

		<!-- Audio Player - persists during both question and reveal phases -->
		<AudioPlayer
			trackUrl={currentQuestion.track.url}
			gapMs={speedRun.audioLoopGapMs}
			isPlaying={phase === 'question'}
			bind:this={audioPlayerRef}
		/>

		{#if phase === 'question'}
			{@const boundValidateAnswer =
				currentQuestion.variantType === 'simple_guess'
					? (guess: string) => validateAnswer(currentQuestion.id, guess)
					: undefined}
			<QuestionCard
				question={currentQuestion}
				onAnswer={handleAnswer}
				onValidateGuess={boundValidateAnswer}
				onAudioFadeOut={() => audioPlayerRef?.fadeOutAudio()}
			/>
		{:else if lastAnswer}
			{@const isImageChoice = currentQuestion?.variantType === 'image_choice'}
			<AnswerReveal
				isCorrect={lastAnswer.isCorrect}
				guess={lastAnswer.guess}
				correctAnswer={lastAnswer.correctAnswer}
				revealDelayMs={isImageChoice ? 2000 : speedRun.revealDelayMs}
				{streak}
				isLastQuestion={lastAnswer.isLastQuestion}
				question={currentQuestion}
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
