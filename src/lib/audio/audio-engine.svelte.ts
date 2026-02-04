import type { tracks } from '$lib/server/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

type Track = InferSelectModel<typeof tracks>;

export class AudioEngine {
	// Reactive state using Svelte 5 runes
	isPlaying = $state(false);
	isLoading = $state(false);
	isBuffering = $state(false);
	error = $state<string | null>(null);
	currentTrackIndex = $state(0);
	currentTime = $state(0);
	duration = $state(0);
	volume = $state(1);
	progress = $derived(this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0);
	tracks = $state<Track[]>([]);
	buffersLoaded = $state(false);
	isInitialized = $state(false);

	// Web Audio API internals
	private audioContext: AudioContext | null = null;
	private analyser: AnalyserNode | null = null;
	private gainNode: GainNode | null = null;
	private source: AudioBufferSourceNode | null = null;
	private buffers: AudioBuffer[] = [];
	private audioBuffer: AudioBuffer | null = null;
	private startTime = 0;
	private sourceHasStarted = false;
	private animationFrameId: number | null = null;
	private isFirstPlay = true;

	constructor() {
		// Defer initialization to when initialize() is called
		// This prevents SSR errors
	}

	initialize(): boolean {
		// Check if we need to reinitialize (either not initialized, or context was closed)
		const needsReinit =
			!this.isInitialized || !this.audioContext || this.audioContext.state === 'closed';

		if (!needsReinit || typeof window === 'undefined') {
			return this.isInitialized;
		}

		try {
			// Clean up any existing closed context
			if (this.audioContext?.state === 'closed') {
				this.audioContext = null;
				this.analyser = null;
				this.gainNode = null;
				this.isInitialized = false;
			}

			this.audioContext = new window.AudioContext();
			this.audioContext.suspend();

			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 256;

			this.gainNode = this.audioContext.createGain();
			this.gainNode.gain.value = this.volume;

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
			console.error('AudioEngine initialization failed:', err);
			return false;
		}
	}

	// Helper to ensure audio context is initialized and not closed
	private ensureInitialized(): boolean {
		const needsInit =
			!this.isInitialized || !this.audioContext || this.audioContext.state === 'closed';

		if (needsInit) {
			return this.initialize();
		}
		return true;
	}

	// Load audio buffers from URLs
	async loadBuffers(trackList: Track[]): Promise<void> {
		if (!this.ensureInitialized()) {
			this.error = 'Audio engine not initialized';
			return;
		}

		this.tracks = trackList;
		this.isLoading = true;
		this.error = null;

		try {
			const bufferPromises = trackList.map(async (track) => {
				try {
					const response = await fetch(track.url);
					if (!response.ok) {
						throw new Error(`Failed to fetch ${track.name}: ${response.statusText}`);
					}
					const arrayBuffer = await response.arrayBuffer();
					return this.audioContext!.decodeAudioData(arrayBuffer);
				} catch (err) {
					console.error(`Error loading or decoding ${track.name}:`, err);
					return null;
				}
			});

			const results = await Promise.all(bufferPromises);
			this.buffers = results.filter((buffer): buffer is AudioBuffer => buffer !== null);

			if (this.buffers.length === 0) {
				this.error = 'Failed to load any audio tracks';
			} else if (this.buffers.length < trackList.length) {
				console.warn(`Loaded ${this.buffers.length} of ${trackList.length} tracks`);
			}

			this.buffersLoaded = true;
			this.armAudio(0);
			this.updateDuration();
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load audio';
			console.error('Error loading buffers:', err);
		} finally {
			this.isLoading = false;
		}
	}

	// Retry loading buffers
	async retryLoad(): Promise<void> {
		await this.loadBuffers(this.tracks);
	}

	// Arm audio for a specific track index
	armAudio(index: number): void {
		if (!this.audioContext || !this.gainNode || !this.analyser) return;

		if (this.source && this.sourceHasStarted) {
			try {
				this.source.stop();
			} catch {
				// Source might already be stopped
			}
		}

		this.source = this.audioContext.createBufferSource();

		if (this.buffers[index]) {
			this.source.buffer = this.buffers[index];
			this.audioBuffer = this.buffers[index];
		}

		this.source
			.connect(this.gainNode)
			.connect(this.analyser)
			.connect(this.audioContext.destination);
		this.sourceHasStarted = false;
	}

	// Start audio playback
	startAudio(): void {
		if (!this.source || !this.audioContext) return;

		// Check if context is closed - can't resume a closed context
		if (this.audioContext.state === 'closed') {
			console.warn('Cannot start audio: AudioContext is closed');
			return;
		}

		this.source.start(0);
		this.sourceHasStarted = true;

		// Resume if suspended, but check actual state, not reactive isPlaying
		if (this.audioContext.state === 'suspended') {
			this.audioContext.resume().catch((err) => {
				console.error('Failed to resume audio context:', err);
			});
		}

		this.startTime = this.audioContext.currentTime;
	}

	// Toggle play/pause
	togglePlayPause(): void {
		// If context is closed or not initialized, try to reinitialize
		if (!this.audioContext || this.audioContext.state === 'closed') {
			console.log('AudioContext closed, attempting to reinitialize...');
			const reinitSuccess = this.initialize();
			if (!reinitSuccess) {
				console.error('Failed to reinitialize audio context');
				return;
			}
			// After reinit, we need to reload buffers since the old ones are invalid
			if (this.tracks.length > 0) {
				this.loadBuffers(this.tracks);
				return;
			}
		}

		if (!this.audioContext) return;

		if (this.isFirstPlay) {
			this.isFirstPlay = false;
			this.startTrack(this.currentTrackIndex);
		} else if (this.audioContext.state === 'running') {
			this.audioContext.suspend().catch((err) => {
				console.error('Failed to suspend audio context:', err);
			});
		} else if (this.audioContext.state === 'suspended') {
			this.audioContext.resume().catch((err) => {
				console.error('Failed to resume audio context:', err);
			});
		}
	}

	// Start a specific track
	startTrack(index: number): void {
		if (index < 0 || index >= this.tracks.length) return;

		this.currentTrackIndex = index;
		this.isBuffering = true;

		this.armAudio(index);
		this.startAudio();
		this.updateDuration();
		this.startTime = this.getCurrentTime();

		this.isBuffering = false;
	}

	// Play next track
	nextTrack(): void {
		if (this.currentTrackIndex < this.tracks.length - 1) {
			this.startTrack(this.currentTrackIndex + 1);
		}
	}

	// Play previous track
	previousTrack(): void {
		if (this.currentTrackIndex > 0) {
			this.startTrack(this.currentTrackIndex - 1);
		}
	}

	// Seek to a position by percentage (0-100)
	seekTo(percentage: number): void {
		if (!this.audioBuffer || !this.source || !this.audioContext || !this.gainNode) return;

		const startOffset = this.audioBuffer.duration * (percentage / 100);

		if (this.source && this.sourceHasStarted) {
			try {
				this.source.stop();
			} catch {
				// Source might already be stopped
			}
		}

		this.source = this.audioContext.createBufferSource();
		this.source.buffer = this.audioBuffer;
		this.source.connect(this.gainNode).connect(this.audioContext.destination);
		this.source.start(0, startOffset);

		this.updateDuration();
		this.startTime = this.getCurrentTime() - startOffset;
	}

	// Seek to a specific time in seconds
	seek(time: number): void {
		if (!this.audioBuffer || !this.source || this.duration === 0) return;

		const percentage = (time / this.duration) * 100;
		this.seekTo(percentage);
	}

	// Get current time from audio context
	getCurrentTime(): number {
		if (!this.audioContext) return 0;
		return this.audioContext.currentTime;
	}

	// Get audio buffer duration
	getDuration(): number {
		return this.audioBuffer?.duration ?? 0;
	}

	// Update duration state
	private updateDuration(): void {
		this.duration = this.getDuration();
	}

	// Get analyser node for visualizers
	getAnalyser(): AnalyserNode | null {
		return this.analyser;
	}

	// Set volume
	setVolume(value: number): void {
		this.volume = value;
		if (this.gainNode) {
			this.gainNode.gain.value = value;
		}
	}

	// Get current track
	getCurrentTrack(): Track | null {
		return this.tracks[this.currentTrackIndex] ?? null;
	}

	// Time update loop for progress bar
	private updateTimeLoop(): void {
		const update = () => {
			if (this.isPlaying) {
				this.currentTime = this.getCurrentTime() - this.startTime;
			}
			this.animationFrameId = requestAnimationFrame(update);
		};
		update();
	}

	// Cleanup
	destroy(): void {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
		}
		if (this.source) {
			try {
				this.source.stop();
			} catch {
				// Ignore
			}
		}
		if (this.audioContext) {
			this.audioContext.close();
		}
	}
}

// Factory function to create audio engine instance
export function createAudioEngine(): AudioEngine {
	return new AudioEngine();
}
