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

	onMount(() => {
		if (canvas) {
			ctx = canvas.getContext('2d');
		}
		return () => {
			stopDrawing();
		};
	});

	function stopDrawing() {
		isDrawing = false;
		if (animationId) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}
		if (ctx && canvas) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
		}
	}

	function startDrawing(currentAnalyser: AnalyserNode) {
		if (!ctx || !canvas || isDrawing) return;

		isDrawing = true;
		const bufferLength = currentAnalyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		const barWidth = canvas.width / bufferLength;

		const draw = () => {
			if (!isDrawing || !ctx || !canvas) return;

			animationId = requestAnimationFrame(draw);
			currentAnalyser.getByteFrequencyData(dataArray);

			// Clear with semi-transparent black for trail effect
			ctx.fillStyle = 'rgb(23, 23, 23)';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Draw bars - only use first half of frequency data for better visualization
			const displayBins = Math.min(bufferLength, 64);
			const displayBarWidth = canvas.width / displayBins;

			for (let i = 0; i < displayBins; i++) {
				// Skip every other bin for display
				const dataIndex = Math.floor(i * (bufferLength / displayBins));
				const barHeight = (dataArray[dataIndex] / 255) * canvas.height * 0.9;
				const x = i * displayBarWidth;

				// Create gradient
				const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
				gradient.addColorStop(0, 'rgb(37, 99, 235)');
				gradient.addColorStop(0.5, 'rgb(147, 51, 234)');
				gradient.addColorStop(1, 'rgb(236, 72, 153)');

				ctx.fillStyle = gradient;
				ctx.fillRect(x + 1, canvas.height - barHeight, displayBarWidth - 2, barHeight);
			}
		};

		draw();
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

<canvas bind:this={canvas} width={300} height={40} class="mb-3 hidden w-full rounded bg-neutral-900"
></canvas>
