/**
 * BaseAudioEngine - Abstract base class for all audio engines
 *
 * This base class contains all shared functionality for audio playback:
 * - Web Audio API initialization and management
 * - iOS-specific optimizations (fade ramps, gain node replacement)
 * - Volume and filter controls
 * - Time tracking and animation loop
 * - Cleanup and lifecycle management
 * - Shared playback state machine
 *
 * Child classes (SingleTrackAudioEngine, MultiTrackAudioEngine) extend this
 * and implement track-specific logic (loading, switching, playlists).
 *
 * iOS Audio Strategy (applied consistently across all engines):
 * - Never suspend AudioContext on pause/stop (avoids suspend→resume click)
 * - Use 20ms fade in/out ramps on all state changes
 * - Replace gain nodes when starting from stop/pause (clears automation history)
 * - Analyser smoothing reset on stop, restored 50ms after play starts
 * - Synchronization via AudioContext.currentTime, not setTimeout
 */

import {
	PlaybackState,
	type AudioState,
	type StateMachineConfig,
	type LoadAudioParams
} from './playback-state.svelte';
import { AUDIO_CONFIG, AUDIO_DERIVED } from './audio-config';

export abstract class BaseAudioEngine {
	/**
	 * ============================================================================
	 * REACTIVE STATE (Svelte 5 Runes)
	 * ============================================================================
	 * These properties are reactive and will trigger UI updates when changed.
	 * All child classes inherit these and can add their own state.
	 */

	/** Whether audio is currently playing */
	isPlaying = $state(false);

	/** Whether audio is currently loading/buffering */
	isLoading = $state(false);

	/** Whether we're seeking or switching tracks */
	isBuffering = $state(false);

	/** Current error message, or null if no error */
	error = $state<string | null>(null);

	/** Current playback position in seconds */
	currentTime = $state(0);

	/** Total duration of current audio in seconds */
	duration = $state(0);

	/** Volume level (0-1) */
	volume = $state(1);

	/** Low-pass filter frequency in Hz (20-20000) */
	filterFrequency: number = $state(AUDIO_CONFIG.DEFAULT_FILTER_FREQUENCY_HZ);

	/** Playback progress as percentage (0-100) */
	progress = $derived(this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0);

	/** Whether the audio engine has been initialized */
	isInitialized = $state(false);

	/**
	 * ============================================================================
	 * WEB AUDIO API NODES
	 * ============================================================================
	 * These are the core Web Audio API nodes used for audio processing.
	 * The chain is: source → filter → gain → analyser → destination
	 */

	/** The Web Audio API context - must be created after user interaction on iOS */
	protected audioContext: AudioContext | null = null;

	/** Analyser node for frequency visualization */
	protected analyser: AnalyserNode | null = null;

	/** Gain node for volume control */
	protected gainNode: GainNode | null = null;

	/** Biquad filter node for low-pass filtering */
	protected filterNode: BiquadFilterNode | null = null;

	/**
	 * ============================================================================
	 * PLAYBACK STATE
	 * ============================================================================
	 * Internal state tracking for the current audio source.
	 */

	/** The current audio buffer source node */
	protected source: AudioBufferSourceNode | null = null;

	/** Whether the source has been started (vs just created) */
	protected sourceHasStarted = false;

	/** AudioContext time when playback started (for calculating currentTime) */
	protected startTime = 0;

	/** Time position when paused (for resuming from exact position) */
	protected pausedAt = 0;

	/**
	 * ============================================================================
	 * TIMING & ANIMATION
	 * ============================================================================
	 */

	/** ID of the requestAnimationFrame loop */
	protected animationFrameId: number | null = null;

	/** When the current fade operation will complete (AudioContext time) */
	protected fadeCompleteTime: number | null = null;

	/** Callback to execute when fade completes */
	protected onFadeComplete: (() => void) | null = null;

	/**
	 * ============================================================================
	 * CONSTANTS & CONFIGURATION
	 * ============================================================================
	 */

	/** Whether we're running in a browser (for SSR safety) */
	protected readonly isBrowser: boolean;

	/** Queue for gain node replacement operations - ensures atomic serialized execution */
	private gainReplaceQueue: Array<() => void> = [];

	/** Whether gain node replacement is currently being processed */
	private isProcessingGainReplace = false;

	/**
	 * ============================================================================
	 * STATE MACHINE
	 * ============================================================================
	 */

	/** Whether this is the first play (affects initialization flow) */
	protected isFirstPlay = true;

	/** State machine configuration - must be set by child classes */
	protected abstract stateMachineConfig: StateMachineConfig;

	/**
	 * ============================================================================
	 * CONSTRUCTOR
	 * ============================================================================
	 */

	constructor() {
		// Check browser environment once during construction for SSR safety
		this.isBrowser = typeof window !== 'undefined';
	}

	/**
	 * ============================================================================
	 * INITIALIZATION
	 * ============================================================================
	 */

	/**
	 * Initialize the Web Audio API context and create all audio nodes.
	 * Must be called before any audio operations. Safe to call multiple times.
	 *
	 * @returns true if initialization succeeded, false otherwise
	 */
	initialize(): boolean {
		if (!this.isBrowser) {
			return false;
		}

		const needsReinit =
			!this.isInitialized || !this.audioContext || this.audioContext.state === 'closed';

		if (!needsReinit) {
			return true;
		}

		try {
			// Cancel any existing animation frame to prevent memory leaks
			// from overlapping RAF loops during rapid reinitializations
			if (this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
				this.animationFrameId = null;
			}

			// Clean up any existing closed context before creating new one
			if (this.audioContext?.state === 'closed') {
				this.cleanup();
			}

			// Create fresh AudioContext - suspended by default until user interaction
			this.audioContext = new window.AudioContext();
			this.audioContext.suspend();

			// Create analyser for frequency visualization (used by SpectrumVisualizer)
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = AUDIO_CONFIG.ANALYSER_FFT_SIZE;

			// Create gain node for volume control with initial value
			this.gainNode = this.audioContext.createGain();
			this.gainNode.gain.value = this.volume;

			// Create low-pass filter with default to full range (no filtering)
			this.filterNode = this.audioContext.createBiquadFilter();
			this.filterNode.type = 'lowpass';
			this.filterNode.frequency.value = this.filterFrequency;
			this.filterNode.Q.value = AUDIO_CONFIG.FILTER_Q; // Butterworth response

			// Listen for context state changes to sync reactive state
			// This handles cases where the browser pauses audio (e.g., app backgrounding)
			this.audioContext.addEventListener('statechange', () => {
				if (this.audioContext) {
					// Only reflect "playing" when context is running AND we have an active source
					// This prevents the play button from showing "pause" incorrectly
					if (this.audioContext.state === 'running' && this.source && this.sourceHasStarted) {
						this.isPlaying = true;
					} else if (this.audioContext.state !== 'running') {
						this.isPlaying = false;
					}
				}
			});

			// Start the time update loop for progress tracking
			this.updateTimeLoop();

			this.isInitialized = true;
			return true;
		} catch (err) {
			this.reportError('Failed to initialize audio engine', 'Initialization failed', err, true);
			this.isInitialized = false;
			return false;
		}
	}

	/**
	 * Ensure the audio engine is initialized before proceeding.
	 * Initializes if needed, returns success status.
	 */
	protected ensureInitialized(): boolean {
		const needsInit =
			!this.isInitialized || !this.audioContext || this.audioContext.state === 'closed';

		if (needsInit) {
			const success = this.initialize();
			return success && this.audioContext !== null;
		}
		return this.audioContext !== null;
	}

	/**
	 * ============================================================================
	 * ABSTRACT METHODS (Must be implemented by child classes)
	 * ============================================================================
	 */

	/**
	 * Toggle play/pause state. Child classes implement the specific state machine
	 * for their track management strategy (single vs playlist).
	 */
	abstract togglePlayPause(): void;

	/**
	 * Stop playback and reset to beginning of current track.
	 */
	abstract stopAndReset(): void;

	/**
	 * Seek to a specific time position in seconds.
	 */
	abstract seek(time: number): void;

	/**
	 * Load audio data. Implementation varies by engine type.
	 * Use discriminated union for type-safe parameters:
	 * - Single: { type: 'single', url: string }
	 * - Multi: { type: 'multi', tracks: AudioTrack[] }
	 */
	abstract loadAudio(params: LoadAudioParams): Promise<void>;

	/**
	 * Handle track naturally ending (reaching end of audio).
	 * Called by source.onended callback.
	 */
	protected abstract onTrackEnded(): void;

	/**
	 * ============================================================================
	 * STATE MACHINE
	 * ============================================================================
	 */

	/**
	 * Determine current playback state based on internal flags.
	 * Used by the state machine to decide which transition to execute.
	 */
	protected getCurrentState(): AudioState {
		return {
			playback: this.determinePlaybackState(),
			contextState: this.audioContext?.state ?? null,
			hasSource: this.source !== null,
			sourceStarted: this.sourceHasStarted,
			isFirstPlay: this.isFirstPlay
		};
	}

	/**
	 * Map internal flags to a PlaybackState enum value.
	 */
	protected determinePlaybackState(): PlaybackState {
		if (this.error) return PlaybackState.ERROR;
		if (this.isLoading) return PlaybackState.LOADING;
		if (!this.stateMachineConfig.hasContent()) return PlaybackState.IDLE;
		if (this.isBuffering) return PlaybackState.SEEKING;

		if (this.isPlaying && this.sourceHasStarted) {
			return PlaybackState.PLAYING;
		}

		if (!this.isPlaying && this.sourceHasStarted) {
			return PlaybackState.PAUSED;
		}

		if (!this.isPlaying && !this.source && !this.isFirstPlay) {
			return PlaybackState.STOPPED;
		}

		if (!this.isPlaying && this.isFirstPlay) {
			return PlaybackState.READY;
		}

		return PlaybackState.IDLE;
	}

	/**
	 * STATE TRANSITION: PLAYING → PAUSED
	 *
	 * iOS Strategy: Fade out, stop source, save position for resume.
	 * Keeping context running avoids suspend→resume click.
	 */
	protected transitionToPaused(): void {
		// Save current position immediately before async fade
		this.pausedAt = this.currentTime;
		this.isPlaying = false;

		// Stop: playback but keep sourceHasStarted = true so state machine recognizes PAUSED
		this.fadeOut(() => {
			// Stop: playback and disconnect source to prevent memory leak
			if (this.source) {
				try {
					this.source.stop();
					this.source.disconnect();
				} catch (err) {
					this.reportError('', 'Failed to stop source during pause', err, false);
				} finally {
					// Clear source reference but keep sourceHasStarted = true for PAUSED state recognition
					this.source = null;
					this.sourceHasStarted = true;
				}
			}
		});
	}

	/**
	 * STATE TRANSITION: SUSPENDED → PLAYING
	 *
	 * iOS Strategy: Must resume context, replace gain node, fade in.
	 * This is for initial play after page load.
	 */
	protected transitionToPlayingFromSuspended(): void {
		const ctx = this.audioContext;
		const gain = this.gainNode;
		if (!ctx || !gain) return;

		const t = ctx.currentTime;
		gain.gain.cancelScheduledValues(t);
		gain.gain.setValueAtTime(0, t);

		ctx
			.resume()
			.then(() => {
				this.isPlaying = true;
				this.replaceGainNodeWithFresh();
				setTimeout(() => this.fadeIn(), 10);
			})
			.catch((err) => {
				this.reportError(
					'Failed to start audio playback',
					'Failed to resume audio context',
					err,
					true
				);
			});
	}

	/**
	 * STATE TRANSITION: PAUSED → PLAYING
	 *
	 * iOS Strategy: Create new source at paused position, replace gain node, fade in.
	 * Implementation varies by engine (single vs multi-track buffer selection).
	 * No context.resume() needed since we never suspended.
	 */
	protected abstract transitionToPlayingFromPaused(): void;

	/**
	 * ============================================================================
	 * FADE OPERATIONS (iOS Click Prevention)
	 * ============================================================================
	 */

	/**
	 * Fade in audio over 20ms to prevent clicks on iOS.
	 * Ramps gain from 0 to current volume level.
	 */
	protected fadeIn(): void {
		const ctx = this.audioContext;
		const gain = this.gainNode;
		if (!ctx || !gain) return;

		const now = ctx.currentTime;
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(this.volume, now + AUDIO_DERIVED.FADE_DURATION_S);
	}

	/**
	 * Fade out audio over 20ms to prevent clicks on iOS.
	 * Schedules completion callback to run via animation loop (not setTimeout)
	 * for synchronization with AudioContext timeline.
	 *
	 * @param onComplete - Callback to execute when fade completes
	 */
	protected fadeOut(onComplete?: () => void): void {
		const ctx = this.audioContext;
		const gain = this.gainNode;

		if (!ctx || !gain) {
			// If audio system isn't ready, execute callback immediately
			onComplete?.();
			return;
		}

		const now = ctx.currentTime;
		gain.gain.setValueAtTime(gain.gain.value, now);
		gain.gain.linearRampToValueAtTime(0, now + AUDIO_DERIVED.FADE_DURATION_S);

		// Store fade completion time for animation loop to handle
		// This ensures sync with AudioContext instead of using setTimeout
		this.fadeCompleteTime = now + AUDIO_DERIVED.FADE_DURATION_S;
		this.onFadeComplete = onComplete ?? null;
	}

	/**
	 * Replace the gain node with a fresh one to clear automation history.
	 * Critical for iOS: prevents clicks from stale gain state when resuming playback.
	 * This operation is serialized via a queue to prevent race conditions during rapid play/pause toggles.
	 */
	protected replaceGainNodeWithFresh(): void {
		const ctx = this.audioContext;
		const filter = this.filterNode;
		const analyser = this.analyser;
		const oldGain = this.gainNode;

		if (!ctx || !filter || !analyser || !oldGain) return;

		// Queue the replacement operation
		this.gainReplaceQueue.push(() => {
			try {
				// Create new gain node with zero initial gain (will fade in after)
				const newGain = ctx.createGain();
				const t = ctx.currentTime;
				newGain.gain.setValueAtTime(0, t);

				// Rewire the audio chain: filter -> newGain -> analyser
				filter.disconnect();
				oldGain.disconnect();
				filter.connect(newGain);
				newGain.connect(analyser);

				// Update reference to new gain node
				this.gainNode = newGain;
			} catch (err) {
				this.reportError('', 'Failed to replace gain node', err, false);
				// Don't update gainNode reference if replacement failed
			}
		});

		// Process the queue if not already processing
		this.processGainReplaceQueue();
	}

	/**
	 * Process the gain replacement queue serially.
	 * This ensures atomic execution without race conditions.
	 */
	private processGainReplaceQueue(): void {
		// If already processing or queue is empty, return
		if (this.isProcessingGainReplace || this.gainReplaceQueue.length === 0) {
			return;
		}

		this.isProcessingGainReplace = true;

		// Process all queued operations in order
		while (this.gainReplaceQueue.length > 0) {
			const operation = this.gainReplaceQueue.shift();
			if (operation) {
				operation();
			}
		}

		this.isProcessingGainReplace = false;
	}

	/**
	 * ============================================================================
	 * SHARED STATE TRANSITIONS
	 * ============================================================================
	 */

	/**
	 * STATE TRANSITION: STOPPED/READY → PLAYING
	 *
	 * Shared implementation for starting playback from the beginning.
	 * Child classes provide buffer-specific arming logic via onArmed callback.
	 *
	 * iOS Strategy: Handle both suspended and running context states.
	 * Replace gain node, arm audio, fade in.
	 *
	 * @param onArmed - Callback to arm the audio source after gain node replacement
	 */
	protected transitionToPlayingFromStartShared(onArmed: () => void): void {
		const ctx = this.audioContext;
		if (!ctx) return;
		if (ctx.state === 'closed') return;

		const startPlayback = () => {
			this.replaceGainNodeWithFresh();
			onArmed();
		};

		if (ctx.state === 'suspended') {
			console.log(`[${this.stateMachineConfig.engineName}] Context suspended, resuming first...`);
			if (this.gainNode) {
				const t = ctx.currentTime;
				this.gainNode.gain.cancelScheduledValues(t);
				this.gainNode.gain.setValueAtTime(0, t);
			}
			ctx
				.resume()
				.then(() => {
					console.log(
						`[${this.stateMachineConfig.engineName}] Context resumed, starting playback...`
					);
					const audioCtx = this.audioContext;
					if (audioCtx && this.gainNode) {
						const t = audioCtx.currentTime;
						this.gainNode.gain.cancelScheduledValues(t);
						this.gainNode.gain.setValueAtTime(0, t);
					}
					setTimeout(() => startPlayback(), AUDIO_CONFIG.PLAYBACK_START_DELAY_MS);
				})
				.catch((err) => {
					console.error(
						`[${this.stateMachineConfig.engineName}] Failed to resume audio context:`,
						err
					);
				});
		} else {
			if (this.gainNode) {
				const t = ctx.currentTime;
				this.gainNode.gain.cancelScheduledValues(t);
				this.gainNode.gain.setValueAtTime(0, t);
			}
			setTimeout(() => startPlayback(), AUDIO_CONFIG.PLAYBACK_START_DELAY_MS);
		}
	}

	/**
	 * ============================================================================
	 * PUBLIC CONTROLS
	 * ============================================================================
	 */

	/**
	 * Set volume level (0-1).
	 * Updates both reactive state and gain node immediately.
	 */
	setVolume(value: number): void {
		this.volume = Math.max(0, Math.min(1, value));
		if (this.gainNode) {
			this.gainNode.gain.value = this.volume;
		}
	}

	/**
	 * Set low-pass filter frequency (20-20000 Hz).
	 * 20000 = no filtering (full spectrum), lower values cut high frequencies.
	 */
	setFilterFrequency(value: number): void {
		this.filterFrequency = Math.max(
			AUDIO_CONFIG.MIN_FILTER_FREQUENCY_HZ,
			Math.min(AUDIO_CONFIG.DEFAULT_FILTER_FREQUENCY_HZ, value)
		);
		if (this.filterNode) {
			this.filterNode.frequency.value = this.filterFrequency;
		}
	}

	/**
	 * Report an error with consistent handling.
	 * User-facing errors set this.error for UI display.
	 * Internal errors are logged only.
	 *
	 * @param message - Error message for user display (if userFacing)
	 * @param context - Context/category for the error
	 * @param err - Original error object
	 * @param userFacing - Whether this error should be shown to users
	 */
	protected reportError(message: string, context: string, err?: unknown, userFacing = true): void {
		const errorMessage = err instanceof Error ? err.message : String(err);
		const fullMessage = `[${this.stateMachineConfig.engineName}] ${context}: ${errorMessage}`;

		if (userFacing) {
			this.error = message;
		}
		console.error(fullMessage, err);
	}

	/**
	 * Clear the current error state.
	 */
	protected clearError(): void {
		this.error = null;
	}

	/**
	 * Get the analyser node for visualization components.
	 */
	getAnalyser(): AnalyserNode | null {
		return this.analyser;
	}

	/**
	 * ============================================================================
	 * TIME TRACKING
	 * ============================================================================
	 */

	/**
	 * Get current AudioContext time, or 0 if not available.
	 */
	protected getCurrentContextTime(): number {
		return this.audioContext?.currentTime ?? 0;
	}

	/**
	 * Animation loop for tracking playback progress and fade completion.
	 * Runs continuously via requestAnimationFrame.
	 */
	protected updateTimeLoop(): void {
		const update = () => {
			// Update currentTime when playing
			if (this.isPlaying && this.sourceHasStarted) {
				this.currentTime = this.getCurrentContextTime() - this.startTime;
				// Clamp to duration to prevent overshooting
				if (this.currentTime > this.duration) {
					this.currentTime = this.duration;
				}
			}

			// Check for fade completion based on AudioContext time
			// This keeps state changes synchronized with actual audio timeline
			if (this.fadeCompleteTime !== null && this.audioContext) {
				if (this.audioContext.currentTime >= this.fadeCompleteTime) {
					this.fadeCompleteTime = null;
					const callback = this.onFadeComplete;
					this.onFadeComplete = null;
					callback?.();
				}
			}

			this.animationFrameId = requestAnimationFrame(update);
		};
		update();
	}

	/**
	 * ============================================================================
	 * CLEANUP & LIFECYCLE
	 * ============================================================================
	 */

	/**
	 * Clean up audio resources. Called during reinitialization or destruction.
	 */
	protected cleanup(): void {
		if (this.source) {
			try {
				this.source.stop();
			} catch (err) {
				this.reportError('', 'Failed to stop source during cleanup', err, false);
			} finally {
				// Always clear reference to prevent double-stop attempts
				this.source = null;
			}
		}

		this.sourceHasStarted = false;
		this.audioContext = null;
		this.analyser = null;
		this.gainNode = null;
		this.filterNode = null;
		this.isInitialized = false;

		// Clear any pending fade to prevent orphaned callbacks
		this.fadeCompleteTime = null;
		this.onFadeComplete = null;

		// Clear gain replacement queue to prevent operations on destroyed context
		this.gainReplaceQueue = [];
		this.isProcessingGainReplace = false;
	}

	/**
	 * Destroy the audio engine and release all resources.
	 * Call this when the component using the engine is destroyed.
	 */
	destroy(): void {
		// Stop animation loop
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		// Close audio context
		if (this.audioContext && this.audioContext.state !== 'closed') {
			this.audioContext.close().catch((err) => {
				this.reportError('', 'Failed to close audio context during destroy', err, false);
			});
		}

		// Clean up remaining resources
		this.cleanup();
	}
}
