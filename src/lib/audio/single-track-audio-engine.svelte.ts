/**
 * SingleTrackAudioEngine - State Machine Implementation
 * 
 * This engine manages single-track audio playback with iOS-specific optimizations
 * to prevent audio clicks and artifacts. The implementation uses an explicit state
 * machine to manage playback states and transitions.
 * 
 * iOS Audio Strategy:
 * - Never suspend AudioContext on pause/stop (avoids suspend→resume click)
 * - Use 20ms fade in/out ramps on all state changes
 * - Replace gain nodes when starting from stop/pause (clears automation history)
 * - Analyser smoothing reset on stop, restored 50ms after play starts
 * - 10ms delays before source creation to prevent connection spikes
 */

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

interface AudioState {
	playback: PlaybackState;
	contextState: AudioContextState | null;
	hasSource: boolean;
	sourceStarted: boolean;
	isFirstPlay: boolean;
}

export class SingleTrackAudioEngine {
	// Reactive state using Svelte 5 runes
	isPlaying = $state(false);
	isLoading = $state(false);
	isBuffering = $state(false);
	error = $state<string | null>(null);
	currentTime = $state(0);
	duration = $state(0);
	volume = $state(1);
	filterFrequency = $state(20000);
	progress = $derived(this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0);
	bufferLoaded = $state(false);
	isInitialized = $state(false);

	// Web Audio API internals
	private audioContext: AudioContext | null = null;
	private analyser: AnalyserNode | null = null;
	private gainNode: GainNode | null = null;
	private filterNode: BiquadFilterNode | null = null;
	private source: AudioBufferSourceNode | null = null;
	private audioBuffer: AudioBuffer | null = null;
	private startTime = 0;
	private sourceHasStarted = false;
	private animationFrameId: number | null = null;
	private isFirstPlay = true;
	private trackUrl: string | null = null;
	private loadInProgress = false;

	private static readonly FADE_DURATION_S = 0.02;

	constructor() {
		// Defer initialization to when initialize() is called
		// This prevents SSR errors
	}

	initialize(): boolean {
		if (typeof window === 'undefined') {
			return false;
		}

		const needsReinit =
			!this.isInitialized || !this.audioContext || this.audioContext.state === 'closed';

		if (!needsReinit) {
			return true;
		}

		try {
			if (this.audioContext?.state === 'closed') {
				this.cleanup();
			}

			this.audioContext = new window.AudioContext();
			this.audioContext.suspend();

			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 256;

			this.gainNode = this.audioContext.createGain();
			this.gainNode.gain.value = this.volume;

			this.filterNode = this.audioContext.createBiquadFilter();
			this.filterNode.type = 'lowpass';
			this.filterNode.frequency.value = this.filterFrequency;
			this.filterNode.Q.value = 0.707;

			this.audioContext.addEventListener('statechange', () => {
				if (this.audioContext) {
					if (this.audioContext.state === 'running' && this.source && this.sourceHasStarted) {
						this.isPlaying = true;
					} else if (this.audioContext.state !== 'running') {
						this.isPlaying = false;
					}
				}
			});

			this.updateTimeLoop();
			this.isInitialized = true;
			return true;
		} catch (err) {
			this.error = 'Failed to initialize audio engine';
			console.error('SingleTrackAudioEngine initialization failed:', err);
			this.isInitialized = false;
			return false;
		}
	}

	private ensureInitialized(): boolean {
		if (typeof window === 'undefined') {
			return false;
		}

		const needsInit =
			!this.isInitialized || !this.audioContext || this.audioContext.state === 'closed';

		if (needsInit) {
			const success = this.initialize();
			return success && this.audioContext !== null;
		}
		return this.audioContext !== null;
	}

	async loadBuffer(url: string): Promise<void> {
		if (this.loadInProgress) {
			console.log('Load already in progress, skipping');
			return;
		}

		if (this.bufferLoaded && this.trackUrl === url && this.audioBuffer) {
			console.log('Buffer already loaded for this URL, skipping');
			return;
		}

		if (!this.ensureInitialized()) {
			this.error = 'Audio engine not initialized';
			return;
		}

		if (!this.audioContext) {
			this.error = 'Audio context not available';
			return;
		}

		this.loadInProgress = true;
		this.trackUrl = url;
		this.isLoading = true;
		this.error = null;

		try {
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error('Failed to fetch audio: ' + response.statusText);
			}
			const arrayBuffer = await response.arrayBuffer();

			if (!this.audioContext) {
				throw new Error('Audio context was destroyed during load');
			}

			this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

			if (!this.audioBuffer) {
				throw new Error('Failed to decode audio data');
			}

			this.bufferLoaded = true;
			this.duration = this.audioBuffer.duration;
			this.armAudio();
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load audio';
			console.error('Error loading buffer:', err);
			this.bufferLoaded = false;
		} finally {
			this.isLoading = false;
			this.loadInProgress = false;
		}
	}

	async retryLoad(): Promise<void> {
		if (this.trackUrl) {
			await this.loadBuffer(this.trackUrl);
		}
	}

	/**
	 * State Machine: Determines current playback state based on all internal flags
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
	 * State Machine: Main toggle handler
	 * Routes to appropriate transition based on current state
	 */
	togglePlayPause(): void {
		const needsReinit = !this.audioContext || this.audioContext.state === 'closed';

		if (needsReinit) {
			console.log('AudioContext needs reinitialization...');
			const reinitSuccess = this.initialize();
			if (!reinitSuccess || !this.audioContext) {
				console.error('Failed to reinitialize audio context');
				this.error = 'Failed to initialize audio';
				return;
			}
			console.log('AudioContext reinitialized, reloading buffer...');
			if (this.trackUrl) {
				this.loadBuffer(this.trackUrl).then(() => {
					if (this.bufferLoaded) {
						console.log('Buffer reloaded after reinit');
					}
				});
			}
		}

		if (!this.audioContext || !this.bufferLoaded) {
			console.log('Cannot play: context or buffer not ready', {
				hasContext: !!this.audioContext,
				bufferLoaded: this.bufferLoaded
			});
			return;
		}

		const state = this.getCurrentState();
		console.log('State transition:', state);

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
	 * State Transition: PLAYING → PAUSED
	 * iOS: Fade out only, do NOT suspend context
	 */
	private transitionToPaused(): void {
		this.fadeOut(() => {
			this.isPlaying = false;
		});
	}

	/**
	 * State Transition: SUSPENDED → PLAYING
	 * iOS: Must resume context, replace gain node, fade in
	 */
	private transitionToPlayingFromSuspended(): void {
		if (!this.audioContext || !this.gainNode) return;

		const t = this.audioContext.currentTime;
		this.gainNode.gain.cancelScheduledValues(t);
		this.gainNode.gain.setValueAtTime(0, t);

		this.audioContext
			.resume()
			.then(() => {
				this.isPlaying = true;
				this.replaceGainNodeWithFresh();
				setTimeout(() => this.fadeIn(), 10);
			})
			.catch((err) => {
				console.error('Failed to resume audio context:', err);
			});
		this.isPlaying = true;
	}

	/**
	 * State Transition: PAUSED → PLAYING
	 * iOS: Context already running, replace gain node, fade in
	 */
	private transitionToPlayingFromPaused(): void {
		this.replaceGainNodeWithFresh();
		this.fadeIn();
		this.isPlaying = true;
	}

	/**
	 * State Transition: STOPPED/READY → PLAYING
	 * iOS: Handles both suspended and running context states
	 */
	private transitionToPlayingFromStart(): void {
		if (!this.audioContext) return;
		if (this.audioContext.state === 'closed') return;

		const startPlayback = () => {
			this.replaceGainNodeWithFresh();
			this.armAudio(() => {
				if (!this.source) {
					console.error('Failed to create audio source');
					return;
				}
				if (this.audioContext && this.gainNode) {
					const t = this.audioContext.currentTime;
					this.gainNode.gain.cancelScheduledValues(t);
					this.gainNode.gain.setValueAtTime(0, t);
				}
				if (this.analyser) {
					this.analyser.smoothingTimeConstant = 0;
				}
				this.source.start(0);
				this.sourceHasStarted = true;
				this.startTime = this.audioContext!.currentTime;
				this.isPlaying = true;
				this.fadeIn();
				if (this.analyser) {
					setTimeout(() => {
						if (this.analyser) this.analyser.smoothingTimeConstant = 0.8;
					}, 50);
				}
				console.log('Playback started successfully');
			});
		};

		if (this.audioContext.state === 'suspended') {
			console.log('Context suspended, resuming first...');
			if (this.audioContext && this.gainNode) {
				const t = this.audioContext.currentTime;
				this.gainNode.gain.cancelScheduledValues(t);
				this.gainNode.gain.setValueAtTime(0, t);
			}
			this.audioContext
				.resume()
				.then(() => {
					console.log('Context resumed, starting playback...');
					if (this.audioContext && this.gainNode) {
						const t = this.audioContext.currentTime;
						this.gainNode.gain.cancelScheduledValues(t);
						this.gainNode.gain.setValueAtTime(0, t);
					}
					setTimeout(() => startPlayback(), 10);
				})
				.catch((err) => {
					console.error('Failed to resume audio context:', err);
				});
		} else {
			if (this.audioContext && this.gainNode) {
				const t = this.audioContext.currentTime;
				this.gainNode.gain.cancelScheduledValues(t);
				this.gainNode.gain.setValueAtTime(0, t);
			}
			setTimeout(() => startPlayback(), 10);
		}
	}

	/**
	 * State Transition: PLAYING/PAUSED → STOPPED
	 * iOS: Fade out, disconnect source, DO NOT suspend context
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
				} catch {
					console.debug('Source already disconnected');
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

	private armAudio(afterReady?: () => void): void {
		if (!this.audioContext || !this.gainNode || !this.analyser || !this.filterNode) return;
		if (!this.audioBuffer) return;

		const createNewSource = (): void => {
			if (this.audioContext && this.gainNode) {
				const t = this.audioContext.currentTime;
				this.gainNode.gain.cancelScheduledValues(t);
				this.gainNode.gain.setValueAtTime(0, t);
			}
			if (this.source) {
				try {
					this.source.disconnect();
				} catch {
					console.debug('Source already disconnected');
				}
				this.source = null;
			}
			this.source = this.audioContext!.createBufferSource();
			this.source!.buffer = this.audioBuffer;

			this.source!
				.connect(this.filterNode!)
				.connect(this.gainNode!)
				.connect(this.analyser!)
				.connect(this.audioContext!.destination);

			this.source!.onended = () => {
				if (this.isPlaying && this.currentTime >= this.duration - 0.1) {
					this.resetToStart();
				}
			};

			this.sourceHasStarted = false;
			const t = this.audioContext!.currentTime;
			this.gainNode!.gain.cancelScheduledValues(t);
			this.gainNode!.gain.setValueAtTime(0, t);
			afterReady?.();
		};

		if (this.source && this.sourceHasStarted) {
			this.fadeOut(() => {
				try {
					this.source?.stop();
				} catch {
					console.debug('Source already stopped');
				}
				this.source = null;
				this.sourceHasStarted = false;
				createNewSource();
			});
		} else {
			createNewSource();
		}
	}

	private replaceGainNodeWithFresh(): void {
		if (!this.audioContext || !this.filterNode || !this.analyser) return;
		const oldGain = this.gainNode;
		if (!oldGain) return;

		const newGain = this.audioContext.createGain();
		const t = this.audioContext.currentTime;
		newGain.gain.setValueAtTime(0, t);

		this.filterNode.disconnect();
		oldGain.disconnect();
		this.filterNode.connect(newGain);
		newGain.connect(this.analyser);
		this.gainNode = newGain;
	}

	private fadeIn(): void {
		if (!this.audioContext || !this.gainNode) return;
		const now = this.audioContext.currentTime;
		this.gainNode.gain.setValueAtTime(0, now);
		this.gainNode.gain.linearRampToValueAtTime(
			this.volume,
			now + SingleTrackAudioEngine.FADE_DURATION_S
		);
	}

	private fadeOut(onComplete?: () => void): void {
		if (!this.audioContext || !this.gainNode) return;
		const now = this.audioContext.currentTime;
		this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
		this.gainNode.gain.linearRampToValueAtTime(
			0,
			now + SingleTrackAudioEngine.FADE_DURATION_S
		);
		const ms = SingleTrackAudioEngine.FADE_DURATION_S * 1000;
		setTimeout(() => onComplete?.(), ms);
	}

	private resetToStart(): void {
		this.isPlaying = false;
		this.currentTime = 0;
		this.isFirstPlay = true;

		if (this.audioBuffer) {
			this.armAudio();
		}
	}

	seek(time: number): void {
		if (
			!this.audioBuffer ||
			!this.audioContext ||
			!this.gainNode ||
			!this.filterNode ||
			!this.analyser
		)
			return;

		const clampedTime = Math.max(0, Math.min(time, this.duration));

		const createAndStartSource = (): void => {
			this.source = this.audioContext!.createBufferSource();
			this.source!.buffer = this.audioBuffer;
			this.source!
				.connect(this.filterNode!)
				.connect(this.gainNode!)
				.connect(this.analyser!)
				.connect(this.audioContext!.destination);

			this.source!.onended = () => {
				if (this.isPlaying && this.currentTime >= this.duration - 0.1) {
					this.resetToStart();
				}
			};

			this.source.start(0, clampedTime);
			this.sourceHasStarted = true;
			this.startTime = this.audioContext!.currentTime - clampedTime;
			this.currentTime = clampedTime;
			this.isPlaying = true;
			this.isFirstPlay = false;
			this.gainNode!.gain.setValueAtTime(0, this.audioContext!.currentTime);
			this.fadeIn();
		};

		const doSeek = (): void => {
			if (this.audioContext!.state === 'suspended') {
				this.audioContext!
					.resume()
					.then(() => createAndStartSource())
					.catch((err) => {
						console.error('Failed to resume audio context:', err);
					});
			} else {
				createAndStartSource();
			}
		};

		if (this.source && this.sourceHasStarted) {
			this.fadeOut(() => {
				try {
					this.source?.stop();
				} catch {
					console.debug('Source already stopped');
				}
				this.source = null;
				this.sourceHasStarted = false;
				doSeek();
			});
		} else {
			doSeek();
		}
	}

	setVolume(value: number): void {
		this.volume = Math.max(0, Math.min(1, value));
		if (this.gainNode) {
			this.gainNode.gain.value = this.volume;
		}
	}

	setFilterFrequency(value: number): void {
		this.filterFrequency = Math.max(20, Math.min(20000, value));
		if (this.filterNode) {
			this.filterNode.frequency.value = this.filterFrequency;
		}
	}

	getAnalyser(): AnalyserNode | null {
		return this.analyser;
	}

	private getCurrentTime(): number {
		if (!this.audioContext) return 0;
		return this.audioContext.currentTime;
	}

	private updateTimeLoop(): void {
		const update = () => {
			if (this.isPlaying && this.sourceHasStarted) {
				this.currentTime = this.getCurrentTime() - this.startTime;
				if (this.currentTime > this.duration) {
					this.currentTime = this.duration;
				}
			}
			this.animationFrameId = requestAnimationFrame(update);
		};
		update();
	}

	private cleanup(): void {
		if (this.source) {
			try {
				this.source.stop();
			} catch {
				console.debug('Source already stopped during cleanup');
			}
			this.source = null;
		}
		this.sourceHasStarted = false;
		this.audioContext = null;
		this.analyser = null;
		this.gainNode = null;
		this.filterNode = null;
		this.isInitialized = false;
		this.loadInProgress = false;
	}

	destroy(): void {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		if (this.audioContext && this.audioContext.state !== 'closed') {
			this.audioContext.close().catch(() => {
				console.debug('Error closing audio context during destroy');
			});
		}
		this.cleanup();
	}
}

export function createSingleTrackAudioEngine(): SingleTrackAudioEngine {
	return new SingleTrackAudioEngine();
}
