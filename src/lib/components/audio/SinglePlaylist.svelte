<script lang="ts">
	import type { AudioTrack } from '$lib/audio/playback-state.svelte';
	interface Props {
		tracks: AudioTrack[];
		currentTrackIndex: number;
		isVisible: boolean;
		onTrackSelect: (index: number) => void;
		onClose: () => void;
	}

	let { tracks, currentTrackIndex, isVisible, onTrackSelect, onClose }: Props = $props();
</script>

{#if isVisible}
	<div
		class="fixed right-0 bottom-0 left-0 z-50 max-h-[70vh] overflow-y-auto bg-white shadow-2xl transition-transform duration-300 ease-out md:relative md:max-h-full md:w-full md:max-w-md"
	>
		<!-- Drag handle (mobile only) -->
		<div class="flex justify-center pt-3 pb-2 md:hidden">
			<div class="h-1 w-12 rounded-full bg-gray-400"></div>
		</div>

		<!-- Header with close button -->
		<div class="flex items-center justify-between px-4 py-2">
			<h2 class="text-lg font-semibold text-gray-800">Playlist</h2>
			<button
				onclick={onClose}
				class="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
				aria-label="Close playlist"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<!-- Track list -->
		<div class="pb-safe">
			{#each tracks as track, index (track.id)}
				{@const isCurrent = index === currentTrackIndex}
				<button
					onclick={() => onTrackSelect(index)}
					class="flex min-h-14 w-full items-center gap-3 border-b border-gray-400 px-4 py-3 text-left transition-colors {isCurrent
						? 'bg-gray-800 text-white hover:bg-gray-700'
						: 'bg-[repeating-linear-gradient(45deg,_#e1e1e1_0,_#e1e1e1_1px,_transparent_0,_transparent_50%)] bg-[size:10px_10px] text-gray-400 hover:bg-gray-200'}"
				>
					<!-- Track number -->
					<span class="min-w-[1.5rem] text-center text-xs font-bold">
						{index + 1}
					</span>

					<!-- Track name -->
					<span class="flex-1 truncate text-sm font-medium">
						{track.name}
					</span>

					<!-- Playing indicator (current track only) -->
					{#if isCurrent}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
							/>
						</svg>
					{/if}
				</button>
			{/each}
		</div>
	</div>
{/if}
