<script lang="ts">
	interface Props {
		onComplete: () => void;
	}

	let { onComplete }: Props = $props();

	let count = $state(3);
	let isVisible = $state(true);

	$effect(() => {
		const interval = setInterval(() => {
			if (count > 1) {
				count--;
			} else {
				// Show "1" for a full second, then transition
				clearInterval(interval);
				// Wait 1 second to show "1", then fade out and complete
				setTimeout(() => {
					isVisible = false;
					// Small delay after fade out before starting the game
					setTimeout(onComplete, 300);
				}, 1000);
			}
		}, 1000);

		return () => clearInterval(interval);
	});

	// Compute background color based on count
	const bgColorClass = $derived(
		count === 3 ? 'bg-amber-500/30' : count === 2 ? 'bg-orange-500/30' : 'bg-green-500/30'
	);

	// Compute text color based on count
	const textColorClass = $derived(
		count === 3 ? 'text-amber-400' : count === 2 ? 'text-orange-400' : 'text-green-400'
	);
</script>

{#if isVisible}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
		class:animate-fade-out={count === 1}
	>
		<div class="relative">
			<!-- Background glow effect -->
			<div class="absolute inset-0 rounded-full blur-3xl {bgColorClass}"></div>

			<!-- Count number -->
			<div
				class="relative text-[20rem] leading-none font-black {textColorClass} animate-pulse-scale"
			>
				{count}
			</div>

			<!-- Label -->
			<div class="mt-4 text-center text-2xl font-bold text-white/80">
				{#if count === 3}
					Get Ready...
				{:else if count === 2}
					Set...
				{:else}
					1
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes pulse-scale {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
	}

	.animate-pulse-scale {
		animation: pulse-scale 0.5s ease-in-out;
	}

	@keyframes fade-out {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}

	.animate-fade-out {
		animation: fade-out 0.3s ease-out forwards;
	}
</style>
