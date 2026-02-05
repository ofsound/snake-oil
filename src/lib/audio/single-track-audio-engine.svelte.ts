/**
 * SingleTrackAudioEngine - Audio engine for single-track playback
 *
 * Extends BaseAudioEngine with logic for playing a single audio file.
 * Features:
 * - Load and play a single audio URL
 * - Seek, pause, resume with iOS click prevention
 * - Track naturally ending resets to start
 *
 * Usage:
 *   const engine = new SingleTrackAudioEngine();
 *   await engine.loadBuffer('/audio/song.mp3');
 *   engine.togglePlayPause();
 */

import { BaseAudioEngine } from './base-audio-engine.svelte';
import { PlaybackState, type LoadAudioParams } from './playback-state.svelte';
import { AUDIO_CONFIG } from './audio-config';

export class SingleTrackAudioEngine extends BaseAudioEngine {
	/**
	 * SINGLE-TRACK SPECIFIC STATE
	 */

	/** Whether audio buffer has been loaded */
	bufferLoaded = $state(false);

	/** The decoded audio buffer for the current track */
	private audioBuffer: AudioBuffer | null = null;

	/** URL of the currently loaded track */
	private trackUrl: string | null = null;

	/** Whether a load operation is in progress (prevents concurrent loads) */
	private loadInProgress = false;

	/** Operation ID counter for canceling superseded load operations */
	private loadOperationId = 0;

	/**
	 * State machine configuration
	 */
	protected stateMachineConfig = {
		hasContent: () => this.bufferLoaded,
		engineName: 'SingleTrackAudioEngine'
	};

	/**
	 * Abstract method implementation: load audio.
	 * For single-track, extracts URL from params and delegates to loadBuffer.
	 */
	async loadAudio(params: LoadAudioParams): Promise<void> {
		if (params.type !== 'single') {
			console.error('[SingleTrackAudioEngine] Invalid params type, expected "single"');
			return;
		}
		return this.loadBuffer(params.url);
	}

	/**
	 * Load a single audio file from URL.
	 *
	 * @param url - URL of the audio file to load
	 */
	async loadBuffer(url: string): Promise<void> {
		// Generate unique operation ID for this load attempt
		const operationId = ++this.loadOperationId;

		// Skip if already loaded this URL (but still allow re-load if explicitly requested)
		if (this.bufferLoaded && this.trackUrl === url && this.audioBuffer && !this.loadInProgress) {
			console.log('[SingleTrackAudioEngine] Buffer already loaded for this URL, skipping');
			return;
		}

		// Check if engine was destroyed before we started
		if (!this.isBrowser) {
			return;
		}

		// Initialize audio context if needed
		if (!this.ensureInitialized()) {
			// Only update state if this operation is still current
			if (this.loadOperationId === operationId) {
				this.error = 'Audio engine not initialized';
			}
			return;
		}

		const ctx = this.audioContext;
		if (!ctx) {
			if (this.loadOperationId === operationId) {
				this.error = 'Audio context not available';
			}
			return;
		}

		// Mark loading started for this operation
		if (this.loadOperationId === operationId) {
			this.loadInProgress = true;
			this.trackUrl = url;
			this.isLoading = true;
			this.error = null;
		}

		try {
			// Fetch audio data
			const response = await fetch(url);

			// Check if a newer load operation has superseded this one
			if (this.loadOperationId !== operationId) {
				console.log(`[SingleTrackAudioEngine] Load operation ${operationId} superseded, aborting`);
				return;
			}

			if (!response.ok) {
				throw new Error('Failed to fetch audio: ' + response.statusText);
			}

			const arrayBuffer = await response.arrayBuffer();

			// Check again after async operation
			if (this.loadOperationId !== operationId) {
				console.log(
					`[SingleTrackAudioEngine] Load operation ${operationId} superseded after fetch, aborting`
				);
				return;
			}

			// Context might have been destroyed during async fetch
			if (!this.audioContext) {
				throw new Error('Audio context was destroyed during load');
			}

			// Decode audio data
			const decodedBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

			// Final check before applying results
			if (this.loadOperationId !== operationId) {
				console.log(
					`[SingleTrackAudioEngine] Load operation ${operationId} superseded after decode, aborting`
				);
				return;
			}

			if (!decodedBuffer) {
				throw new Error('Failed to decode audio data');
			}

			// Update state and prepare for playback
			this.audioBuffer = decodedBuffer;
			this.bufferLoaded = true;
			this.duration = decodedBuffer.duration;
			this.armAudio();

			console.log(`[SingleTrackAudioEngine] Load operation ${operationId} completed successfully`);
		} catch (err) {
			// Only update error state if this operation is still current
			if (this.loadOperationId === operationId) {
				this.error = err instanceof Error ? err.message : 'Failed to load audio';
				console.error('[SingleTrackAudioEngine] Error loading buffer:', err);
				this.bufferLoaded = false;
			} else {
				console.log(
					`[SingleTrackAudioEngine] Error in superseded operation ${operationId}, ignoring`
				);
			}
		} finally {
			// Only clear loading state if this is the current operation
			if (this.loadOperationId === operationId) {
				this.isLoading = false;
				this.loadInProgress = false;
			}
		}
	}

	/**
	 * Retry loading the current track.
	 */
	async retryLoad(): Promise<void> {
		if (this.trackUrl) {
			await this.loadBuffer(this.trackUrl);
		}
	}

	/**
	 * Toggle play/pause based on current state.
	 * This is the main entry point for play/pause control.
	 */
	togglePlayPause(): void {
		// Reinitialize if context was closed
		const needsReinit = !this.audioContext || this.audioContext.state === 'closed';

		if (needsReinit) {
			console.log('[SingleTrackAudioEngine] AudioContext needs reinitialization...');
			const reinitSuccess = this.initialize();
			if (!reinitSuccess || !this.audioContext) {
				console.error('[SingleTrackAudioEngine] Failed to reinitialize audio context');
				this.error = 'Failed to initialize audio';
				return;
			}
			console.log('[SingleTrackAudioEngine] AudioContext reinitialized, reloading buffer...');
			if (this.trackUrl) {
				this.loadBuffer(this.trackUrl).then(() => {
					if (this.bufferLoaded) {
						console.log('[SingleTrackAudioEngine] Buffer reloaded after reinit');
					}
				});
			}
		}

		if (!this.audioContext || !this.bufferLoaded) {
			console.log('[SingleTrackAudioEngine] Cannot play: context or buffer not ready', {
				hasContext: !!this.audioContext,
				bufferLoaded: this.bufferLoaded
			});
			return;
		}

		const state = this.getCurrentState();
		console.log('[SingleTrackAudioEngine] State transition:', state);

		// Route to appropriate state transition
		if (state.playback === PlaybackState.PLAYING && state.contextState === 'running') {
			this.transitionToPaused();
		} else if (state.playback === PlaybackState.PAUSED) {
			this.transitionToPlayingFromPaused();
		} else if (state.isFirstPlay) {
			// Must check isFirstPlay before contextState - initial play needs full start sequence
			this.isFirstPlay = false;
			this.transitionToPlayingFromStart();
		} else if (state.contextState === 'suspended') {
			this.transitionToPlayingFromSuspended();
		} else {
			this.transitionToPlayingFromStart();
		}
	}

	/**
	 * STATE TRANSITION: STOPPED/READY → PLAYING
	 *
	 * iOS Strategy: Handle both suspended and running context states.
	 * Replace gain node, arm audio, fade in.
	 */
	private transitionToPlayingFromStart(): void {
		this.transitionToPlayingFromStartShared(() => {
			this.armAudio(() => {
				if (!this.source) {
					console.error('[SingleTrackAudioEngine] Failed to create audio source');
					return;
				}

				const audioCtx = this.audioContext;
				if (!audioCtx) {
					console.error('[SingleTrackAudioEngine] Audio context lost during playback start');
					return;
				}

				if (this.gainNode) {
					const t = audioCtx.currentTime;
					this.gainNode.gain.cancelScheduledValues(t);
					this.gainNode.gain.setValueAtTime(0, t);
				}

				if (this.analyser) {
					this.analyser.smoothingTimeConstant = 0;
				}

				this.source.start(0);
				this.sourceHasStarted = true;
				this.startTime = audioCtx.currentTime;
				this.isPlaying = true;
				this.fadeIn();

				if (this.analyser) {
					setTimeout(() => {
						if (this.analyser)
							this.analyser.smoothingTimeConstant = AUDIO_CONFIG.ANALYSER_SMOOTHING_TIME_CONSTANT;
					}, AUDIO_CONFIG.ANALYSER_SMOOTHING_RESTORE_DELAY_MS);
				}

				console.log('[SingleTrackAudioEngine] Playback started successfully');
			});
		});
	}

	/**
	 * STATE TRANSITION: PLAYING/PAUSED → STOPPED
	 *
	 * iOS Strategy: Fade out, disconnect source, DO NOT suspend context.
	 */
	stopAndReset(): void {
		if (!this.audioContext) return;

		this.fadeOut(() => {
			if (this.audioContext && this.gainNode) {
				const t = this.audioContext.currentTime;
				this.gainNode.gain.cancelScheduledValues(t);
				this.gainNode.gain.setValueAtTime(0, t);
			}

			if (this.source) {
				try {
					this.source.disconnect();
				} catch (err) {
					console.error('[SingleTrackAudioEngine] Failed to disconnect source during stop:', err);
				}
				this.source = null;
				this.sourceHasStarted = false;
			}

			this.isPlaying = false;
			this.currentTime = 0;
			this.isFirstPlay = true;
			this.pausedAt = 0;

			if (this.analyser) {
				this.analyser.smoothingTimeConstant = 0;
			}
		});
	}

	/**
	 * STATE TRANSITION: PAUSED → PLAYING
	 *
	 * Resume from paused position with proper offset.
	 */
	protected transitionToPlayingFromPaused(): void {
		const ctx = this.audioContext;
		const buffer = this.audioBuffer;

		if (!ctx || !buffer || !this.filterNode || !this.gainNode || !this.analyser) return;

		// Disconnect old source if exists
		if (this.source) {
			try {
				this.source.disconnect();
			} catch (err) {
				console.error('[SingleTrackAudioEngine] Failed to disconnect old source in resume:', err);
			}
		}

		// Create new source at paused position
		const newSource = ctx.createBufferSource();
		newSource.buffer = buffer;
		newSource
			.connect(this.filterNode)
			.connect(this.gainNode)
			.connect(this.analyser)
			.connect(ctx.destination);

		// Handle track naturally ending
		newSource.onended = () => {
			if (
				this.isPlaying &&
				this.currentTime >= this.duration - AUDIO_CONFIG.TRACK_END_THRESHOLD_S
			) {
				this.onTrackEnded();
			}
		};

		this.source = newSource;
		this.sourceHasStarted = true;

		// Start at paused position
		newSource.start(0, this.pausedAt);

		// Update startTime to account for the offset
		this.startTime = ctx.currentTime - this.pausedAt;
		this.isPlaying = true;

		// Reset analyser smoothing
		if (this.analyser) {
			this.analyser.smoothingTimeConstant = 0;
			setTimeout(() => {
				if (this.analyser)
					this.analyser.smoothingTimeConstant = AUDIO_CONFIG.ANALYSER_SMOOTHING_TIME_CONSTANT;
			}, AUDIO_CONFIG.ANALYSER_SMOOTHING_RESTORE_DELAY_MS);
		}

		// Replace gain node and fade in
		this.replaceGainNodeWithFresh();
		this.fadeIn();
	}

	/**
	 * Prepare audio source for playback.
	 * Creates buffer source, connects nodes, sets up onended callback.
	 *
	 * @param afterReady - Callback when source is ready (after fade-out if switching)
	 */
	private armAudio(afterReady?: () => void): void {
		const ctx = this.audioContext;
		const gain = this.gainNode;
		const analyser = this.analyser;
		const filter = this.filterNode;
		const buffer = this.audioBuffer;

		if (!ctx || !gain || !analyser || !filter || !buffer) return;

		const createNewSource = (): void => {
			// Reset gain before creating new source
			const t = ctx.currentTime;
			gain.gain.cancelScheduledValues(t);
			gain.gain.setValueAtTime(0, t);

			// Disconnect old source if exists
			if (this.source) {
				try {
					this.source.disconnect();
				} catch (err) {
					console.error('[SingleTrackAudioEngine] Failed to disconnect source in armAudio:', err);
				}
				this.source = null;
			}

			// Create new buffer source
			const newSource = ctx.createBufferSource();
			newSource.buffer = buffer;
			newSource.connect(filter).connect(gain).connect(analyser).connect(ctx.destination);

			// Handle track naturally ending
			newSource.onended = () => {
				if (
					this.isPlaying &&
					this.currentTime >= this.duration - AUDIO_CONFIG.TRACK_END_THRESHOLD_S
				) {
					this.onTrackEnded();
				}
			};

			this.source = newSource;
			this.sourceHasStarted = false;

			// Reset gain for fresh start
			const now = ctx.currentTime;
			gain.gain.cancelScheduledValues(now);
			gain.gain.setValueAtTime(0, now);

			afterReady?.();
		};

		// If currently playing, fade out first then create new source
		if (this.source && this.sourceHasStarted) {
			this.fadeOut(() => {
				try {
					this.source?.stop();
				} catch (err) {
					console.error('[SingleTrackAudioEngine] Failed to stop source during armAudio:', err);
				} finally {
					// Always clear references to prevent double-stop attempts
					this.source = null;
					this.sourceHasStarted = false;
				}
				createNewSource();
			});
		} else {
			createNewSource();
		}
	}

	/**
	 * Handle track naturally reaching the end.
	 * For single-track: reset to start and stop.
	 */
	protected onTrackEnded(): void {
		this.resetToStart();
	}

	/**
	 * Reset playback to the beginning of the track.
	 */
	private resetToStart(): void {
		this.isPlaying = false;
		this.currentTime = 0;
		this.isFirstPlay = true;

		if (this.audioBuffer) {
			this.armAudio();
		}
	}

	/**
	 * Seek to a specific time position.
	 *
	 * @param time - Time in seconds to seek to
	 */
	seek(time: number): void {
		const ctx = this.audioContext;
		const gain = this.gainNode;
		const filter = this.filterNode;
		const analyser = this.analyser;
		const buffer = this.audioBuffer;

		if (!buffer || !ctx || !gain || !filter || !analyser) return;

		const clampedTime = Math.max(0, Math.min(time, this.duration));

		const createAndStartSource = (): void => {
			const newSource = ctx.createBufferSource();
			newSource.buffer = buffer;
			newSource.connect(filter).connect(gain).connect(analyser).connect(ctx.destination);

			newSource.onended = () => {
				if (
					this.isPlaying &&
					this.currentTime >= this.duration - AUDIO_CONFIG.TRACK_END_THRESHOLD_S
				) {
					this.resetToStart();
				}
			};

			newSource.start(0, clampedTime);

			this.source = newSource;
			this.sourceHasStarted = true;
			this.startTime = ctx.currentTime - clampedTime;
			this.currentTime = clampedTime;
			this.isPlaying = true;
			this.isFirstPlay = false;
			gain.gain.setValueAtTime(0, ctx.currentTime);
			this.fadeIn();
		};

		const doSeek = (): void => {
			if (ctx.state === 'suspended') {
				ctx
					.resume()
					.then(() => createAndStartSource())
					.catch((err) => {
						console.error('[SingleTrackAudioEngine] Failed to resume for seek:', err);
					});
			} else {
				createAndStartSource();
			}
		};

		// If currently playing, fade out before seeking
		if (this.source && this.sourceHasStarted) {
			this.fadeOut(() => {
				try {
					this.source?.stop();
				} catch (err) {
					console.error('[SingleTrackAudioEngine] Failed to stop source during seek:', err);
				} finally {
					// Always clear references to prevent double-stop attempts
					this.source = null;
					this.sourceHasStarted = false;
				}
				doSeek();
			});
		} else {
			doSeek();
		}
	}
}
