<script lang="ts">
	import { onMount } from 'svelte';
	import gsap from 'gsap';

	// Props
	interface Props {
		analyser: AnalyserNode | null;
		isPlaying?: boolean;
	}

	let { analyser, isPlaying = true }: Props = $props();

	// Canvas refs
	let canvas: HTMLCanvasElement | undefined = $state(undefined);
	let ctx: CanvasRenderingContext2D | null = null;
	let animationId: number | null = null;
	let isDrawing = false;

	// Frequency bin definitions - configuration only (not reactive current values)
	interface BinConfig {
		name: string;
		low: number;
		high: number;
		threshold: number;
	}

	const binConfigs: BinConfig[] = [
		{ name: 'Bass', low: 0, high: 10, threshold: 2000 },
		{ name: 'Low-Mid', low: 10, high: 50, threshold: 1500 },
		{ name: 'Mid', low: 50, high: 200, threshold: 1200 },
		{ name: 'High', low: 200, high: 500, threshold: 1000 }
	];

	// Reactive state for displaying current values in the UI
	let binCurrents = $state<number[]>(binConfigs.map(() => 0));

	// Animation refs - use $state for reactivity when binding with bind:this
	let binElements = $state<HTMLDivElement[]>([]);
	let resizeObserver: ResizeObserver | null = null;

	// Logical size (CSS pixels) - used for calculations
	let canvasWidth = $state(600);
	let canvasHeight = $state(150);

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

	function stopDrawing(clearDisplay = false) {
		isDrawing = false;
		if (animationId) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}
		if (clearDisplay && ctx && canvas) {
			ctx.fillStyle = 'rgb(0, 0, 0)';
			ctx.fillRect(0, 0, canvasWidth, canvasHeight);
			binCurrents = binConfigs.map(() => 0);
		}
	}

	function startDrawing(currentAnalyser: AnalyserNode) {
		if (!ctx || !canvas || isDrawing) return;

		isDrawing = true;
		const bufferLength = currentAnalyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		const barWidth = canvasWidth / bufferLength;

		// Local array for bin totals (not reactive)
		const binTotals = new Array(binConfigs.length).fill(0);

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

			// Clear canvas
			ctx.fillStyle = 'rgb(0, 0, 0)';
			ctx.fillRect(0, 0, canvasWidth, canvasHeight);

			// Reset bin totals
			binTotals.fill(0);

			// Draw bars and calculate bin totals
			for (let i = 0; i < bufferLength; i++) {
				const barHeight = dataArray[i];
				const x = i * barWidth;

				// Update bin totals
				for (let b = 0; b < binConfigs.length; b++) {
					const bin = binConfigs[b];
					if (i >= bin.low && i < bin.high) {
						binTotals[b] += barHeight;
					}
				}

				// Draw bar with gradient
				const r = barHeight + 100;
				ctx.fillStyle = `rgb(${r}, 50, 50)`;
				ctx.fillRect(x, canvasHeight - barHeight / 2, barWidth - 1, barHeight / 2);
			}

			// Update reactive state once per frame (not inside the loop)
			binCurrents = [...binTotals];

			// Check thresholds and trigger animations
			binConfigs.forEach((bin, index) => {
				if (binTotals[index] > bin.threshold && binElements[index]) {
					gsap.to(binElements[index], {
						x: '+=5',
						duration: 0.1,
						yoyo: true,
						repeat: 1,
						ease: 'power2.out'
					});
				}
			});
		};

		draw(performance.now());
	}

	// Watch for analyser and isPlaying changes
	$effect(() => {
		if (analyser && ctx && canvas && isPlaying) {
			stopDrawing(false);
			startDrawing(analyser);
		} else {
			stopDrawing(true);
		}
	});
</script>

<div class="w-full max-w-2xl">
	<canvas bind:this={canvas} class="block h-[150px] w-full bg-black"></canvas>

	<div class="bg-white p-10">
		<div class="grid grid-cols-2 gap-4">
			{#each binConfigs as bin, i (bin.name)}
				<div bind:this={binElements[i]} class="rounded border border-gray-200 p-4 transition-all">
					<div class="font-bold text-gray-800">{bin.name}</div>
					<div class="text-sm text-gray-600">
						Range: {bin.low} - {bin.high}
					</div>
					<div class="text-sm text-gray-600">
						Threshold: {bin.threshold}
					</div>
					<div
						class="text-lg font-bold"
						class:text-red-500={binCurrents[i] > bin.threshold}
						class:text-gray-800={binCurrents[i] <= bin.threshold}
					>
						Total: {Math.round(binCurrents[i])}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
