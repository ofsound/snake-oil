<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		analyser: AnalyserNode | null;
		isPlaying: boolean;
	}

	let { analyser, isPlaying }: Props = $props();

	let canvas: HTMLCanvasElement | undefined = $state(undefined);
	let ctx: CanvasRenderingContext2D | null = null;
	let animationId: number | null = null;
	let isDrawing = false;
	let resizeObserver: ResizeObserver | null = null;

	// Logical size (CSS pixels) - used for calculations
	let canvasWidth = $state(300);
	let canvasHeight = $state(40);

	onMount(() => {
		if (canvas) {
			ctx = canvas.getContext('2d');
			setupCanvasSizing();
		}
		return () => {
			stopDrawing();
			resizeObserver?.disconnect();
		};
	});

	function setupCanvasSizing() {
		if (!canvas) return;

		// Initial sizing
		updateCanvasSize();

		// Setup resize observer for responsive sizing
		resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				canvasWidth = width;
				canvasHeight = height;
				updateCanvasSize();
			}
		});

		resizeObserver.observe(canvas);
	}

	function updateCanvasSize() {
		if (!canvas) return;

		// Get device pixel ratio for crisp rendering
		const dpr = window.devicePixelRatio || 1;

		// Set the actual canvas size in physical pixels
		canvas.width = Math.floor(canvasWidth * dpr);
		canvas.height = Math.floor(canvasHeight * dpr);

		// Scale the context so drawing operations use CSS pixels
		if (ctx) {
			ctx.scale(dpr, dpr);
		}
	}

	function stopDrawing() {
		isDrawing = false;
		if (animationId) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}
		if (ctx && canvas) {
			ctx.clearRect(0, 0, canvasWidth, canvasHeight);
		}
	}

	function startDrawing(currentAnalyser: AnalyserNode) {
		if (!ctx || !canvas || isDrawing) return;

		isDrawing = true;
		const bufferLength = currentAnalyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		const barWidth = canvasWidth / bufferLength;

		// Throttle to 30fps to reduce CPU/memory bandwidth usage
		// Audio analysis transfers data from audio thread to main thread
		let lastDrawTime = 0;
		const FRAME_INTERVAL = 1000 / 30; // 30fps = ~33.33ms

		const draw = (timestamp: number) => {
			if (!isDrawing || !ctx || !canvas) return;

			animationId = requestAnimationFrame(draw);

			// Skip frame if not enough time has passed
			if (timestamp - lastDrawTime < FRAME_INTERVAL) return;
			lastDrawTime = timestamp;

			currentAnalyser.getByteFrequencyData(dataArray);

			// Clear with semi-transparent black for trail effect
			ctx.fillStyle = 'rgb(23, 23, 23)';
			ctx.fillRect(0, 0, canvasWidth, canvasHeight);

			// Draw bars - only use first half of frequency data for better visualization
			const displayBins = Math.min(bufferLength, 64);
			const displayBarWidth = canvasWidth / displayBins;

			for (let i = 0; i < displayBins; i++) {
				// Skip every other bin for display
				const dataIndex = Math.floor(i * (bufferLength / displayBins));
				const barHeight = (dataArray[dataIndex] / 255) * canvasHeight * 0.9;
				const x = i * displayBarWidth;

				// Create gradient
				const gradient = ctx.createLinearGradient(0, canvasHeight, 0, canvasHeight - barHeight);
				gradient.addColorStop(0, 'rgb(37, 99, 235)');
				gradient.addColorStop(0.5, 'rgb(147, 51, 234)');
				gradient.addColorStop(1, 'rgb(236, 72, 153)');

				ctx.fillStyle = gradient;
				ctx.fillRect(x + 1, canvasHeight - barHeight, displayBarWidth - 2, barHeight);
			}
		};

		draw(performance.now());
	}

	// Watch for analyser and playing state changes
	$effect(() => {
		if (analyser && ctx && canvas && isPlaying) {
			stopDrawing();
			startDrawing(analyser);
		} else if ((!analyser || !isPlaying) && isDrawing) {
			stopDrawing();
		}
	});
</script>

<canvas bind:this={canvas} class="mb-3 block h-10 w-full rounded bg-neutral-900"></canvas>
