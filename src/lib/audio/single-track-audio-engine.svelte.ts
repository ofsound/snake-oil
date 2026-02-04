export class SingleTrackAudioEngine {
	// Reactive state using Svelte 5 runes
	isPlaying = $state(false);
	isLoading = $state(false);
	isBuffering = $state(false);
	error = $state<string | null>(null);
	currentTime = $state(0);
	duration = $state(0);
	volume = $state(1);
	filterFrequency = $state(20000); // Default: no filter (full spectrum)
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

	constructor() {
		// Defer initialization to when initialize() is called
		// This prevents SSR errors
	}

	initialize(): boolean {
		// Must be in browser environment
		if (typeof window === 'undefined') {
			return false;
		}

		const needsReinit =
			!this.isInitialized || !this.audioContext || this.audioContext.state === 'closed';

		if (!needsReinit) {
			return true;
		}

		try {
			// Clean up any existing closed context
			if (this.audioContext?.state === 'closed') {
				this.cleanup();
			}

			this.audioContext = new window.AudioContext();
			this.audioContext.suspend();

			// Create analyser for visualizer
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 256;

			// Create gain node for volume
			this.gainNode = this.audioContext.createGain();
			this.gainNode.gain.value = this.volume;

			// Create low-pass filter
			this.filterNode = this.audioContext.createBiquadFilter();
			this.filterNode.type = 'lowpass';
			this.filterNode.frequency.value = this.filterFrequency;
			this.filterNode.Q.value = 0.707; // Butterworth response

			// Chain: source -> filter -> gain -> analyser -> destination
			// (Will be connected when source is created)

			// Listen for state changes
			this.audioContext.addEventListener('statechange', () => {
				if (this.audioContext) {
					this.isPlaying = this.audioContext.state === 'running';
				}
			});

			// Start the time update loop
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

	// Helper to ensure audio context is initialized and not closed
	private ensureInitialized(): boolean {
		// Check if we're in a browser environment
		if (typeof window === 'undefined') {
			return false;
		}

		const needsInit =
			!this.isInitialized || !this.audioContext || this.audioContext.state === 'closed';

		if (needsInit) {
			const success = this.initialize();
			// Double-check that the context was actually created
			return success && this.audioContext !== null;
		}
		return this.audioContext !== null;
	}

	// Track if load is in progress to prevent concurrent loads
	private loadInProgress = false;

	// Load a single audio buffer from URL
	async loadBuffer(url: string): Promise<void> {
		// Prevent concurrent loads
		if (this.loadInProgress) {
			console.log('Load already in progress, skipping');
			return;
		}

		// Don't reload if already loaded with this URL
		if (this.bufferLoaded && this.trackUrl === url && this.audioBuffer) {
			console.log('Buffer already loaded for this URL, skipping');
			return;
		}

		if (!this.ensureInitialized()) {
			this.error = 'Audio engine not initialized';
			return;
		}

		// Double-check that audioContext exists before proceeding
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
				throw new Error(`Failed to fetch audio: ${response.statusText}`);
			}
			const arrayBuffer = await response.arrayBuffer();

			// Check context still exists before decoding (it might have been destroyed)
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

	// Retry loading buffer
	async retryLoad(): Promise<void> {
		if (this.trackUrl) {
			await this.loadBuffer(this.trackUrl);
		}
	}

	// Arm audio (prepare source but don't start)
	private armAudio(): void {
		if (!this.audioContext || !this.gainNode || !this.analyser || !this.filterNode) return;
		if (!this.audioBuffer) return;

		// Stop any existing source
		if (this.source && this.sourceHasStarted) {
			try {
				this.source.stop();
			} catch {
				// Source might already be stopped
			}
		}

		this.source = this.audioContext.createBufferSource();
		this.source.buffer = this.audioBuffer;

		// Chain: source -> filter -> gain -> analyser -> destination
		this.source
			.connect(this.filterNode)
			.connect(this.gainNode)
			.connect(this.analyser)
			.connect(this.audioContext.destination);

		// Handle track ending
		this.source.onended = () => {
			// Only handle natural ending (not when we manually stop)
			if (this.isPlaying && this.currentTime >= this.duration - 0.1) {
				this.resetToStart();
			}
		};

		this.sourceHasStarted = false;
	}

	// Toggle play/pause
	togglePlayPause(): void {
		// Check if we need to reinitialize
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
			// After reinit, we need to reload buffer - but for iOS we need to handle this
			// asynchronously without blocking the user gesture
			if (this.trackUrl) {
				// For iOS, we need to start playback immediately with what's available
				// The buffer will be reloaded in the background
				this.loadBuffer(this.trackUrl).then(() => {
					if (this.bufferLoaded) {
						console.log('Buffer reloaded after reinit');
					}
				});
				// Don't return here - try to continue with playback
			}
		}

		if (!this.audioContext || !this.bufferLoaded) {
			console.log('Cannot play: context or buffer not ready', {
				hasContext: !!this.audioContext,
				bufferLoaded: this.bufferLoaded
			});
			return;
		}

		if (this.isFirstPlay) {
			this.isFirstPlay = false;
			this.startFromBeginning();
		} else if (this.audioContext.state === 'running') {
			this.audioContext.suspend().catch((err) => {
				console.error('Failed to suspend audio context:', err);
			});
			this.isPlaying = false;
		} else if (this.audioContext.state === 'suspended') {
			// For iOS: Re-arm audio before resuming to ensure fresh source
			this.armAudio();

			// This must be called synchronously for iOS
			this.audioContext
				.resume()
				.then(() => {
					this.isPlaying = true;
				})
				.catch((err) => {
					console.error('Failed to resume audio context:', err);
				});
			// Set playing state immediately for responsiveness
			this.isPlaying = true;
		}
	}

	// Start playback from beginning
	private startFromBeginning(): void {
		if (!this.audioContext) return;
		if (this.audioContext.state === 'closed') return;

		// iOS fix: Create the source AFTER the context is resumed
		// Sources created while context is suspended may not play
		const startPlayback = () => {
			// Re-arm the audio to create a fresh source
			this.armAudio();

			if (!this.source) {
				console.error('Failed to create audio source');
				return;
			}

			this.source.start(0);
			this.sourceHasStarted = true;
			this.startTime = this.audioContext!.currentTime;
			this.isPlaying = true;
			console.log('Playback started successfully');
		};

		// On iOS, context must be running BEFORE creating/starting the source
		if (this.audioContext.state === 'suspended') {
			console.log('Context suspended, resuming first...');
			this.audioContext
				.resume()
				.then(() => {
					console.log('Context resumed, starting playback...');
					startPlayback();
				})
				.catch((err) => {
					console.error('Failed to resume audio context:', err);
				});
		} else {
			console.log('Context running, starting playback immediately...');
			startPlayback();
		}
	}

	// Stop playback and reset to beginning
	stopAndReset(): void {
		if (!this.audioContext) return;

		// Suspend first
		if (this.audioContext.state === 'running') {
			this.audioContext.suspend().catch((err) => {
				console.error('Failed to suspend audio context:', err);
			});
		}

		this.resetToStart();
	}

	// Reset to beginning (called when track ends naturally or via stop)
	private resetToStart(): void {
		this.isPlaying = false;
		this.currentTime = 0;
		this.isFirstPlay = true;

		// Re-arm the audio for next play
		if (this.audioBuffer) {
			this.armAudio();
		}
	}

	// Seek to a specific time in seconds
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

		// Stop current source if playing
		if (this.source && this.sourceHasStarted) {
			try {
				this.source.stop();
			} catch {
				// Source might already be stopped
			}
		}

		// iOS fix: Function to create and start source
		const createAndStartSource = () => {
			// Create new source
			this.source = this.audioContext!.createBufferSource();
			this.source.buffer = this.audioBuffer;
			this.source
				.connect(this.filterNode!)
				.connect(this.gainNode!)
				.connect(this.analyser!)
				.connect(this.audioContext!.destination);

			this.source.onended = () => {
				if (this.isPlaying && this.currentTime >= this.duration - 0.1) {
					this.resetToStart();
				}
			};

			// Start from new position
			this.source.start(0, clampedTime);
			this.sourceHasStarted = true;
			this.startTime = this.audioContext!.currentTime - clampedTime;
			this.currentTime = clampedTime;
			this.isPlaying = true;
			this.isFirstPlay = false;
		};

		// iOS fix: Context must be running before creating source
		if (this.audioContext.state === 'suspended') {
			this.audioContext
				.resume()
				.then(() => {
					createAndStartSource();
				})
				.catch((err) => {
					console.error('Failed to resume audio context:', err);
				});
		} else {
			createAndStartSource();
		}
	}

	// Set volume
	setVolume(value: number): void {
		this.volume = Math.max(0, Math.min(1, value));
		if (this.gainNode) {
			this.gainNode.gain.value = this.volume;
		}
	}

	// Set filter frequency (logarithmic scale handling done in UI)
	setFilterFrequency(value: number): void {
		this.filterFrequency = Math.max(20, Math.min(20000, value));
		if (this.filterNode) {
			this.filterNode.frequency.value = this.filterFrequency;
		}
	}

	// Get analyser node for visualizer
	getAnalyser(): AnalyserNode | null {
		return this.analyser;
	}

	// Get current time from audio context
	private getCurrentTime(): number {
		if (!this.audioContext) return 0;
		return this.audioContext.currentTime;
	}

	// Time update loop for progress bar
	private updateTimeLoop(): void {
		const update = () => {
			if (this.isPlaying && this.sourceHasStarted) {
				this.currentTime = this.getCurrentTime() - this.startTime;
				// Clamp to duration
				if (this.currentTime > this.duration) {
					this.currentTime = this.duration;
				}
			}
			this.animationFrameId = requestAnimationFrame(update);
		};
		update();
	}

	// Cleanup
	private cleanup(): void {
		if (this.source) {
			try {
				this.source.stop();
			} catch {
				// Ignore
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
		// Close the context first, then cleanup
		if (this.audioContext && this.audioContext.state !== 'closed') {
			this.audioContext.close().catch(() => {
				// Ignore errors during cleanup
			});
		}
		this.cleanup();
	}
}

// Factory function to create audio engine instance
export function createSingleTrackAudioEngine(): SingleTrackAudioEngine {
	return new SingleTrackAudioEngine();
}