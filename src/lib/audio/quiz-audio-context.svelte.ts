/**
 * QuizAudioContext - Singleton shared audio engine for all quiz players
 *
 * Manages ONE SingleTrackAudioEngine instance shared across all QuizAudioPlayer
 * components. Enforces that only ONE soundbite can play at a time.
 *
 * Usage:
 *   import { quizAudioContext } from './quiz-audio-context.svelte';
 *
 *   // In component onMount:
 *   quizAudioContext.register(soundbiteId, {
 *     onPlay: () => isPlaying = true,
 *     onPause: () => isPlaying = false,
 *     onStop: () => isPlaying = false,
 *     onEnded: () => isPlaying = false
 *   });
 *
 *   // To play:
 *   await quizAudioContext.play(soundbiteId, url);
 *
 *   // To stop:
 *   quizAudioContext.stop(soundbiteId);
 */

import { SingleTrackAudioEngine } from './single-track-audio-engine.svelte';

/** Callbacks for a registered player */
interface PlayerCallbacks {
	onPlay: () => void;
	onPause: () => void;
	onStop: () => void;
	onEnded: () => void;
}

/** Registry of all active players */
const playerRegistry = new Map<string, PlayerCallbacks>();

/** The shared audio engine instance */
let engine: SingleTrackAudioEngine | null = null;

/** Which player is currently playing */
let currentPlayerId = $state<string | null>(null);

/** Whether the engine failed to initialize */
let isEngineError = $state(false);

/** Get or create the shared engine */
function getEngine(): SingleTrackAudioEngine | null {
	if (engine) return engine;

	try {
		engine = new SingleTrackAudioEngine();
		const initialized = engine.initialize();

		if (!initialized) {
			console.error('[QuizAudioContext] Failed to initialize audio engine');
			isEngineError = true;
			return null;
		}

		// Track ended detection handled via engine.isPlaying reactive state
		// QuizAudioPlayer components watch quizAudioContext.currentPlayerId
		// and engine.isPlaying to detect when track ends

		return engine;
	} catch (err) {
		console.error('[QuizAudioContext] Error creating engine:', err);
		isEngineError = true;
		return null;
	}
}

export const quizAudioContext = {
	/**
	 * Register a player component with the context.
	 * Call this in onMount.
	 */
	register(playerId: string, callbacks: PlayerCallbacks): void {
		playerRegistry.set(playerId, callbacks);
	},

	/**
	 * Unregister a player component.
	 * Call this when component is destroyed.
	 */
	unregister(playerId: string): void {
		// If this player was active, stop it first
		if (currentPlayerId === playerId) {
			this.stop(playerId);
		}
		playerRegistry.delete(playerId);

		// If no more players registered, destroy the engine
		if (playerRegistry.size === 0 && engine) {
			engine.destroy();
			engine = null;
			currentPlayerId = null;
		}
	},

	/**
	 * Play a soundbite.
	 * If another player is active, it will be stopped first.
	 */
	async play(playerId: string, url: string): Promise<void> {
		if (isEngineError) {
			console.log('[QuizAudioContext] Engine is in error state, cannot play');
			return;
		}

		const audioEngine = getEngine();
		if (!audioEngine) {
			console.error('[QuizAudioContext] No audio engine available');
			return;
		}

		// If this is the current player, toggle play/pause
		if (currentPlayerId === playerId) {
			const callbacks = playerRegistry.get(playerId);

			if (audioEngine.isPlaying) {
				// PAUSE: Toggle to pause while maintaining position
				audioEngine.togglePlayPause();
				callbacks?.onPause();
				// Keep currentPlayerId - we're still the active player, just paused
			} else {
				// RESUME: Toggle to resume from current position
				audioEngine.togglePlayPause();
				callbacks?.onPlay();
			}
			return;
		}

		// If another player is currently playing, stop it completely
		if (currentPlayerId && currentPlayerId !== playerId) {
			const otherCallbacks = playerRegistry.get(currentPlayerId);
			if (otherCallbacks) {
				audioEngine.stopAndReset();
				otherCallbacks.onStop();
			}
		}

		// Set this as the current player
		currentPlayerId = playerId;

		// Load and play the audio
		try {
			await audioEngine.loadAudio({ type: 'single', url });
			audioEngine.togglePlayPause();

			const callbacks = playerRegistry.get(playerId);
			callbacks?.onPlay();
		} catch (err) {
			console.error('[QuizAudioContext] Error playing audio:', err);
			currentPlayerId = null;
		}
	},

	/**
	 * Stop the currently playing soundbite (if it belongs to this player).
	 */
	stop(playerId: string): void {
		if (currentPlayerId !== playerId) return;

		const audioEngine = getEngine();
		if (!audioEngine) return;

		audioEngine.stopAndReset();
		currentPlayerId = null;

		const callbacks = playerRegistry.get(playerId);
		callbacks?.onStop();
	},

	/**
	 * Get the analyser node for visualization.
	 * Only the active player should use this.
	 */
	getAnalyser(): AnalyserNode | null {
		return engine?.getAnalyser() ?? null;
	},

	/**
	 * Get the current player ID (reactive).
	 */
	get currentPlayerId() {
		return currentPlayerId;
	},

	/**
	 * Check if engine is in error state (reactive).
	 */
	get isEngineError() {
		return isEngineError;
	},

	/**
	 * Get the shared engine instance (for advanced operations like seek).
	 * Only call methods on this when you are the current player.
	 */
	get engine(): SingleTrackAudioEngine | null {
		return engine;
	}
};
