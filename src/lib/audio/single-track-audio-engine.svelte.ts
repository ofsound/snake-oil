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

// Playback states for the state machine
enum PlaybackState {
	IDLE = 'idle',
	LOADING = 'loading',
	READY = 'ready',
	PLAYING = 'playing',
	PAUSED = 'paused',
	STOPPED = 'stopped',
	SEEKING = 'seeking',
	ERROR = 'error'
}

// Internal state representation
interface AudioState {
	playback: PlaybackState;
	contextState: AudioContextState | null;
	hasSource: boolean;
	sourceStarted: boolean;
	isFirstPlay: boolean;
}

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

	/** Whether this is the first play (affects initialization flow) */
	private isFirstPlay = true;

	/**
	 * Abstract method implementation: load audio.
	 * For single-track, delegates to loadBuffer with the URL.
	 */
	async loadAudio(url: string): Promise<void> {
		return this.loadBuffer(url);
	}

	/**
	 * Load a single audio file from URL.
	 *
	 * @param url - URL of the audio file to load
	 */
	async loadBuffer(url: string): Promise<void> {
		// Prevent concurrent load operations
		if (this.loadInProgress) {
			console.log('[SingleTrackAudioEngine] Load already in progress, skipping');
			return;
		}

		// Skip if already loaded this URL
		if (this.bufferLoaded && this.trackUrl === url && this.audioBuffer) {
			console.log('[SingleTrackAudioEngine] Buffer already loaded for this URL, skipping');
			return;
		}

		// Initialize audio context if needed
		if (!this.ensureInitialized()) {
			this.error = 'Audio engine not initialized';
			return;
		}

		const ctx = this.audioContext;
		if (!ctx) {
			this.error = 'Audio context not available';
			return;
		}

		this.loadInProgress = true;
		this.trackUrl = url;
		this.isLoading = true;
		this.error = null;

		try {
			// Fetch audio data
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error('Failed to fetch audio: ' + response.statusText);
			}
			const arrayBuffer = await response.arrayBuffer();

			// Context might have been destroyed during async fetch
			if (!this.audioContext) {
				throw new Error('Audio context was destroyed during load');
			}

			// Decode audio data
			this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

			if (!this.audioBuffer) {
				throw new Error('Failed to decode audio data');
			}

			// Update state and prepare for playback
			this.bufferLoaded = true;
			this.duration = this.audioBuffer.duration;
			this.armAudio();
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load audio';
			console.error('[SingleTrackAudioEngine] Error loading buffer:', err);
			this.bufferLoaded = false;
		} finally {
			this.isLoading = false;
			this.loadInProgress = false;
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
	 * Determine current playback state based on internal flags.
	 * Used by the state machine to decide which transition to execute.
	 */
	private getCurrentState(): AudioState {
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
	private determinePlaybackState(): PlaybackState {
		if (this.error) return PlaybackState.ERROR;
		if (this.isLoading) return PlaybackState.LOADING;
		if (!this.bufferLoaded) return PlaybackState.IDLE;
		if (this.isBuffering) return PlaybackState.SEEKING;

		if (this.isPlaying && this.sourceHasStarted) {
			return PlaybackState.PLAYING;
		}

		if (!this.isPlaying && this.source && this.sourceHasStarted) {
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
		if (state.isFirstPlay) {
			this.isFirstPlay = false;
			this.transitionToPlayingFromStart();
		} else if (state.playback === PlaybackState.PLAYING && state.contextState === 'running') {
			this.transitionToPaused();
		} else if (state.contextState === 'suspended') {
			this.transitionToPlayingFromSuspended();
		} else if (state.hasSource && state.sourceStarted) {
			this.transitionToPlayingFromPaused();
		} else {
			this.transitionToPlayingFromStart();
		}
	}

	/**
	 * STATE TRANSITION: PLAYING → PAUSED
	 *
	 * iOS Strategy: Fade out only, do NOT suspend context.
	 * Keeping context running avoids the suspend→resume click.
	 */
	private transitionToPaused(): void {
		this.fadeOut(() => {
			this.isPlaying = false;
		});
	}

	/**
	 * STATE TRANSITION: SUSPENDED → PLAYING
	 *
	 * iOS Strategy: Must resume context, replace gain node, fade in.
	 * This is for initial play after page load.
	 */
	private transitionToPlayingFromSuspended(): void {
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
				console.error('[SingleTrackAudioEngine] Failed to resume audio context:', err);
			});
		this.isPlaying = true;
	}

	/**
	 * STATE TRANSITION: PAUSED → PLAYING
	 *
	 * iOS Strategy: Context already running, replace gain node, fade in.
	 * No context.resume() needed since we never suspended.
	 */
	private transitionToPlayingFromPaused(): void {
		this.replaceGainNodeWithFresh();
		this.fadeIn();
		this.isPlaying = true;
	}

	/**
	 * STATE TRANSITION: STOPPED/READY → PLAYING
	 *
	 * iOS Strategy: Handle both suspended and running context states.
	 * Replace gain node, arm audio, fade in.
	 */
	private transitionToPlayingFromStart(): void {
		const ctx = this.audioContext;
		if (!ctx) return;
		if (ctx.state === 'closed') return;

		const startPlayback = () => {
			this.replaceGainNodeWithFresh();
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
						if (this.analyser) this.analyser.smoothingTimeConstant = 0.8;
					}, 50);
				}

				console.log('[SingleTrackAudioEngine] Playback started successfully');
			});
		};

		if (ctx.state === 'suspended') {
			console.log('[SingleTrackAudioEngine] Context suspended, resuming first...');
			if (this.gainNode) {
				const t = ctx.currentTime;
				this.gainNode.gain.cancelScheduledValues(t);
				this.gainNode.gain.setValueAtTime(0, t);
			}
			ctx
				.resume()
				.then(() => {
					console.log('[SingleTrackAudioEngine] Context resumed, starting playback...');
					const audioCtx = this.audioContext;
					if (audioCtx && this.gainNode) {
						const t = audioCtx.currentTime;
						this.gainNode.gain.cancelScheduledValues(t);
						this.gainNode.gain.setValueAtTime(0, t);
					}
					setTimeout(() => startPlayback(), 10);
				})
				.catch((err) => {
					console.error('[SingleTrackAudioEngine] Failed to resume audio context:', err);
				});
		} else {
			if (this.gainNode) {
				const t = ctx.currentTime;
				this.gainNode.gain.cancelScheduledValues(t);
				this.gainNode.gain.setValueAtTime(0, t);
			}
			setTimeout(() => startPlayback(), 10);
		}
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

			if (this.analyser) {
				this.analyser.smoothingTimeConstant = 0;
			}
		});
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
				if (this.isPlaying && this.currentTime >= this.duration - 0.1) {
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
				}
				this.source = null;
				this.sourceHasStarted = false;
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
				if (this.isPlaying && this.currentTime >= this.duration - 0.1) {
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
				}
				this.source = null;
				this.sourceHasStarted = false;
				doSeek();
			});
		} else {
			doSeek();
		}
	}
}
