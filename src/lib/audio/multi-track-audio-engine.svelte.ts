/**
 * MultiTrackAudioEngine - Audio engine for playlist/queue playback
 *
 * Extends BaseAudioEngine with logic for managing multiple tracks:
 * - Load and play multiple audio files
 * - Next/previous track navigation
 * - Auto-advance when track ends
 * - Shuffle mode with history tracking
 * - Skip failed tracks automatically
 *
 * Usage:
 *   const engine = new MultiTrackAudioEngine();
 *   await engine.loadBuffers([track1, track2, track3]);
 *   engine.togglePlayPause();
 *   engine.nextTrack();
 *   engine.toggleShuffle();
 */

import type { tracks } from '$lib/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';
import { BaseAudioEngine } from './base-audio-engine.svelte';
import { PlaybackState, type LoadAudioParams } from './playback-state.svelte';

/** Track type from database schema */
type Track = InferSelectModel<typeof tracks>;

export class MultiTrackAudioEngine extends BaseAudioEngine {
	/**
	 * PLAYLIST STATE
	 */

	/** Array of track metadata from database */
	tracks = $state<Track[]>([]);

	/** Decoded audio buffers for all tracks */
	private buffers: AudioBuffer[] = [];

	/** Index of currently playing track */
	currentTrackIndex = $state(0);

	/** Whether all buffers have been loaded */
	buffersLoaded = $state(false);

	/** Whether a load operation is in progress */
	private loadInProgress = false;

	/** Operation ID counter for canceling superseded load operations */
	private loadOperationId = 0;

	/**
	 * State machine configuration
	 */
	protected stateMachineConfig = {
		hasContent: () => this.buffersLoaded && this.buffers.length > 0,
		engineName: 'MultiTrackAudioEngine'
	};

	/**
	 * SHUFFLE STATE
	 */

	/** Whether shuffle mode is enabled */
	isShuffleEnabled = $state(false);

	/** History of played track indices for shuffle back-navigation */
	private playedIndices: number[] = [];

	/**
	 * Load multiple audio tracks from an array of track metadata.
	 * Automatically skips tracks that fail to load.
	 * Extracts tracks from params and delegates to loadBuffers.
	 */
	async loadAudio(params: LoadAudioParams): Promise<void> {
		if (params.type !== 'multi') {
			console.error('[MultiTrackAudioEngine] Invalid params type, expected "multi"');
			return;
		}
		return this.loadBuffers(params.tracks as Track[]);
	}

	/**
	 * Load multiple audio tracks.
	 *
	 * @param trackList - Array of track metadata objects
	 */
	async loadBuffers(trackList: Track[]): Promise<void> {
		// Generate unique operation ID for this load attempt
		const operationId = ++this.loadOperationId;

		// Check if engine was destroyed before we started
		if (!this.isBrowser) {
			return;
		}

		// Initialize if needed
		if (!this.ensureInitialized()) {
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
			this.tracks = trackList;
			this.isLoading = true;
			this.error = null;
		}

		try {
			// Load tracks with limited concurrency (4 parallel) to prevent connection pool exhaustion
			// Browser typically limits to 6 concurrent connections per domain
			const MAX_CONCURRENCY = 4;
			const results: (AudioBuffer | null)[] = new Array(trackList.length).fill(null);
			let currentIndex = 0;

			const loadTrack = async (trackIndex: number): Promise<void> => {
				const track = trackList[trackIndex];
				try {
					const response = await fetch(track.url);

					// Check if superseded after each async operation
					if (this.loadOperationId !== operationId) {
						return;
					}

					if (!response.ok) {
						throw new Error(`Failed to fetch ${track.name}: ${response.statusText}`);
					}

					const arrayBuffer = await response.arrayBuffer();

					// Check again after async operation
					if (this.loadOperationId !== operationId) {
						return;
					}

					// Context might have been destroyed during fetch
					if (!this.audioContext) {
						throw new Error('Audio context destroyed during load');
					}

					const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
					results[trackIndex] = buffer;
				} catch (err) {
					console.error(`[MultiTrackAudioEngine] Error loading track ${track.name}:`, err);
					// results[trackIndex] remains null
				}
			};

			const worker = async (): Promise<void> => {
				while (currentIndex < trackList.length) {
					const trackIndex = currentIndex++;
					await loadTrack(trackIndex);
				}
			};

			// Start MAX_CONCURRENCY workers
			const workers: Promise<void>[] = [];
			for (let i = 0; i < Math.min(MAX_CONCURRENCY, trackList.length); i++) {
				workers.push(worker());
			}
			await Promise.all(workers);

			// Final check before applying results
			if (this.loadOperationId !== operationId) {
				console.log(
					`[MultiTrackAudioEngine] Load operation ${operationId} superseded after decode, aborting`
				);
				return;
			}

			this.buffers = results.filter((buffer): buffer is AudioBuffer => buffer !== null);

			if (this.buffers.length === 0) {
				this.error = 'Failed to load any audio tracks';
			} else if (this.buffers.length < trackList.length) {
				console.warn(
					`[MultiTrackAudioEngine] Loaded ${this.buffers.length} of ${trackList.length} tracks`
				);
			}

			this.buffersLoaded = true;

			// Set duration of first track
			if (this.buffers[0]) {
				this.duration = this.buffers[0].duration;
			}

			// Arm audio for first track
			this.armAudio(0);

			console.log(`[MultiTrackAudioEngine] Load operation ${operationId} completed successfully`);
		} catch (err) {
			// Only update error state if this operation is still current
			if (this.loadOperationId === operationId) {
				this.error = err instanceof Error ? err.message : 'Failed to load audio';
				console.error('[MultiTrackAudioEngine] Error loading buffers:', err);
				this.buffersLoaded = false;
			} else {
				console.log(
					`[MultiTrackAudioEngine] Error in superseded operation ${operationId}, ignoring`
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
	 * Retry loading all tracks.
	 */
	async retryLoad(): Promise<void> {
		await this.loadBuffers(this.tracks);
	}

	/**
	 * Toggle play/pause based on current state.
	 */
	togglePlayPause(): void {
		// Reinitialize if context was closed
		const needsReinit = !this.audioContext || this.audioContext.state === 'closed';

		if (needsReinit) {
			console.log('[MultiTrackAudioEngine] AudioContext needs reinitialization...');
			const reinitSuccess = this.initialize();
			if (!reinitSuccess || !this.audioContext) {
				console.error('[MultiTrackAudioEngine] Failed to reinitialize audio context');
				this.error = 'Failed to initialize audio';
				return;
			}
			console.log('[MultiTrackAudioEngine] AudioContext reinitialized, reloading buffers...');
			if (this.tracks.length > 0) {
				this.loadBuffers(this.tracks);
				return;
			}
		}

		if (!this.audioContext || !this.buffersLoaded || this.buffers.length === 0) {
			console.log('[MultiTrackAudioEngine] Cannot play: context or buffers not ready', {
				hasContext: !!this.audioContext,
				buffersLoaded: this.buffersLoaded
			});
			return;
		}

		const state = this.getCurrentState();
		console.log('[MultiTrackAudioEngine] State transition:', state);

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
	 * STATE TRANSITION: STOPPED/READY → PLAYING
	 *
	 * iOS Strategy: Handle both suspended and running context states.
	 * Replace gain node, arm audio, fade in.
	 */
	private transitionToPlayingFromStart(): void {
		const ctx = this.audioContext;
		if (!ctx) return;
		if (ctx.state === 'closed') return;

		const currentIndex = this.currentTrackIndex;
		const buffer = this.buffers[currentIndex];

		if (!buffer) {
			console.error('[MultiTrackAudioEngine] No buffer available for current track');
			return;
		}

		const startPlayback = () => {
			this.replaceGainNodeWithFresh();
			this.armAudio(currentIndex, () => {
				if (!this.source) {
					console.error('[MultiTrackAudioEngine] Failed to create audio source');
					return;
				}

				const audioCtx = this.audioContext;
				if (!audioCtx) {
					console.error('[MultiTrackAudioEngine] Audio context lost during playback start');
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

				console.log('[MultiTrackAudioEngine] Playback started successfully');
			});
		};

		if (ctx.state === 'suspended') {
			console.log('[MultiTrackAudioEngine] Context suspended, resuming first...');
			if (this.gainNode) {
				const t = ctx.currentTime;
				this.gainNode.gain.cancelScheduledValues(t);
				this.gainNode.gain.setValueAtTime(0, t);
			}
			ctx
				.resume()
				.then(() => {
					console.log('[MultiTrackAudioEngine] Context resumed, starting playback...');
					const audioCtx = this.audioContext;
					if (audioCtx && this.gainNode) {
						const t = audioCtx.currentTime;
						this.gainNode.gain.cancelScheduledValues(t);
						this.gainNode.gain.setValueAtTime(0, t);
					}
					setTimeout(() => startPlayback(), 10);
				})
				.catch((err) => {
					console.error('[MultiTrackAudioEngine] Failed to resume audio context:', err);
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
					console.error('[MultiTrackAudioEngine] Failed to disconnect source during stop:', err);
				}
				this.source = null;
				this.sourceHasStarted = false;
			}

			this.isPlaying = false;
			this.currentTime = 0;
			this.currentTrackIndex = 0;
			this.isFirstPlay = true;
			this.playedIndices = [];
			this.pausedAt = 0;

			if (this.analyser) {
				this.analyser.smoothingTimeConstant = 0;
			}

			// Reset duration to first track
			if (this.buffers[0]) {
				this.duration = this.buffers[0].duration;
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
		const buffer = this.buffers[this.currentTrackIndex];

		if (!ctx || !buffer || !this.filterNode || !this.gainNode || !this.analyser) return;

		// Create new source at paused position
		const newSource = ctx.createBufferSource();
		newSource.buffer = buffer;
		newSource
			.connect(this.filterNode)
			.connect(this.gainNode)
			.connect(this.analyser)
			.connect(ctx.destination);

		// Handle track naturally ending - auto-advance to next
		newSource.onended = () => {
			if (this.isPlaying && this.currentTime >= this.duration - 0.1) {
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
				if (this.analyser) this.analyser.smoothingTimeConstant = 0.8;
			}, 50);
		}

		// Replace gain node and fade in
		this.replaceGainNodeWithFresh();
		this.fadeIn();
	}

	/**
	 * Prepare audio source for a specific track.
	 *
	 * @param index - Index of track to prepare
	 * @param afterReady - Callback when source is ready
	 */
	private armAudio(index: number, afterReady?: () => void): void {
		const ctx = this.audioContext;
		const gain = this.gainNode;
		const analyser = this.analyser;
		const filter = this.filterNode;
		const buffer = this.buffers[index];

		if (!ctx || !gain || !analyser || !filter || !buffer) return;

		const createNewSource = (): void => {
			const t = ctx.currentTime;
			gain.gain.cancelScheduledValues(t);
			gain.gain.setValueAtTime(0, t);

			if (this.source) {
				try {
					this.source.disconnect();
				} catch (err) {
					console.error('[MultiTrackAudioEngine] Failed to disconnect source in armAudio:', err);
				}
				this.source = null;
			}

			const newSource = ctx.createBufferSource();
			newSource.buffer = buffer;
			newSource.connect(filter).connect(gain).connect(analyser).connect(ctx.destination);

			// Handle track naturally ending - auto-advance to next
			newSource.onended = () => {
				if (this.isPlaying && this.currentTime >= this.duration - 0.1) {
					this.onTrackEnded();
				}
			};

			this.source = newSource;
			this.sourceHasStarted = false;

			const now = ctx.currentTime;
			gain.gain.cancelScheduledValues(now);
			gain.gain.setValueAtTime(0, now);

			afterReady?.();
		};

		if (this.source && this.sourceHasStarted) {
			this.fadeOut(() => {
				try {
					this.source?.stop();
				} catch (err) {
					console.error('[MultiTrackAudioEngine] Failed to stop source during armAudio:', err);
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
	 * Auto-advance to next track in playlist.
	 */
	protected onTrackEnded(): void {
		this.playedIndices.push(this.currentTrackIndex);
		this.transitionToNextTrack();
	}

	/**
	 * Transition to the next track with fade.
	 */
	private transitionToNextTrack(): void {
		const nextIndex = this.getNextTrackIndex();

		this.fadeOut(() => {
			this.currentTrackIndex = nextIndex;
			this.currentTime = 0;

			// Update duration for new track
			if (this.buffers[nextIndex]) {
				this.duration = this.buffers[nextIndex].duration;
			}

			// Check if we've reached end of playlist
			if (nextIndex === 0 && this.playedIndices.length >= this.buffers.length) {
				// Playlist finished, stop
				this.isPlaying = false;
				this.isFirstPlay = true;
				this.playedIndices = [];
				if (this.analyser) {
					this.analyser.smoothingTimeConstant = 0;
				}
				return;
			}

			// Arm and start next track
			this.armAudio(nextIndex, () => {
				if (this.source && this.audioContext) {
					this.source.start(0);
					this.sourceHasStarted = true;
					this.startTime = this.audioContext.currentTime;
					this.isPlaying = true;
					this.fadeIn();
				}
			});
		});
	}

	/**
	 * Calculate the next track index (respects shuffle mode).
	 */
	private getNextTrackIndex(): number {
		if (this.isShuffleEnabled) {
			return this.getRandomUnplayedTrack();
		}
		// Sequential: wrap to start at end
		return (this.currentTrackIndex + 1) % this.buffers.length;
	}

	/**
	 * Calculate the previous track index (respects shuffle mode).
	 */
	private getPreviousTrackIndex(): number {
		if (this.isShuffleEnabled && this.playedIndices.length > 0) {
			// Go back through shuffle history
			this.playedIndices.pop(); // Remove current from history
			return this.playedIndices.pop() ?? 0; // Return previous, or 0 if empty
		}
		// Sequential: wrap to end at start
		return this.currentTrackIndex > 0 ? this.currentTrackIndex - 1 : this.buffers.length - 1;
	}

	/**
	 * Get a random unplayed track for shuffle mode.
	 */
	private getRandomUnplayedTrack(): number {
		const unplayed = this.buffers.map((_, i) => i).filter((i) => !this.playedIndices.includes(i));

		if (unplayed.length === 0) {
			// All tracks played, reset history
			this.playedIndices = [this.currentTrackIndex];
			return Math.floor(Math.random() * this.buffers.length);
		}

		return unplayed[Math.floor(Math.random() * unplayed.length)];
	}

	/**
	 * PLAYLIST CONTROLS
	 */

	/**
	 * Start playing a specific track by index.
	 *
	 * @param index - Index of track to play
	 */
	startTrack(index: number): void {
		if (index < 0 || index >= this.buffers.length) return;

		this.fadeOut(() => {
			this.currentTrackIndex = index;
			this.currentTime = 0;

			if (this.buffers[index]) {
				this.duration = this.buffers[index].duration;
			}

			this.armAudio(index, () => {
				if (this.source && this.audioContext) {
					this.source.start(0);
					this.sourceHasStarted = true;
					this.startTime = this.audioContext.currentTime;
					this.isPlaying = true;
					this.fadeIn();
				}
			});
		});
	}

	/**
	 * Skip to next track.
	 */
	nextTrack(): void {
		this.playedIndices.push(this.currentTrackIndex);
		const nextIndex = this.getNextTrackIndex();
		this.startTrack(nextIndex);
	}

	/**
	 * Go to previous track.
	 */
	previousTrack(): void {
		const prevIndex = this.getPreviousTrackIndex();
		this.startTrack(prevIndex);
	}

	/**
	 * Toggle shuffle mode on/off.
	 */
	toggleShuffle(): void {
		this.isShuffleEnabled = !this.isShuffleEnabled;
		if (this.isShuffleEnabled) {
			// Initialize shuffle history with current track
			this.playedIndices = [this.currentTrackIndex];
			console.log('[MultiTrackAudioEngine] Shuffle mode enabled');
		} else {
			console.log('[MultiTrackAudioEngine] Shuffle mode disabled');
		}
	}

	/**
	 * Get metadata for the currently playing track.
	 */
	getCurrentTrack(): Track | null {
		return this.tracks[this.currentTrackIndex] ?? null;
	}

	/**
	 * Seek to a specific time position in the current track.
	 *
	 * @param time - Time in seconds to seek to
	 */
	seek(time: number): void {
		const ctx = this.audioContext;
		const gain = this.gainNode;
		const filter = this.filterNode;
		const analyser = this.analyser;
		const buffer = this.buffers[this.currentTrackIndex];

		if (!buffer || !ctx || !gain || !filter || !analyser) return;

		const clampedTime = Math.max(0, Math.min(time, this.duration));

		const createAndStartSource = (): void => {
			const newSource = ctx.createBufferSource();
			newSource.buffer = buffer;
			newSource.connect(filter).connect(gain).connect(analyser).connect(ctx.destination);

			newSource.onended = () => {
				if (this.isPlaying && this.currentTime >= this.duration - 0.1) {
					this.onTrackEnded();
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
						console.error('[MultiTrackAudioEngine] Failed to resume for seek:', err);
					});
			} else {
				createAndStartSource();
			}
		};

		if (this.source && this.sourceHasStarted) {
			this.fadeOut(() => {
				try {
					this.source?.stop();
				} catch (err) {
					console.error('[MultiTrackAudioEngine] Failed to stop source during seek:', err);
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
