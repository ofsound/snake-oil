<script lang="ts">
	import AnswerPrompt from './AnswerPrompt.svelte';

	import { shuffleOptions } from '$lib/variant-client-utils';

	import type { ImageChoiceOption } from '$lib/variant-types';
	interface Props {
		soundbiteId: string;
		options: ImageChoiceOption[];
		selectedOptionId: string;
		onselect: (optionId: string) => void;
		disabled?: boolean;
	}

	let { soundbiteId, options, selectedOptionId, onselect, disabled = false }: Props = $props();

	// Shuffle options once on component mount, not on every render
	// This prevents images from jumping around when user interacts with them
	let shuffledOptions = $state<ImageChoiceOption[]>([]);

	// Only shuffle once when component initializes
	$effect(() => {
		if (shuffledOptions.length === 0 && options.length > 0) {
			shuffledOptions = shuffleOptions(options);
		}
	});

	function handleSelect(optionId: string) {
		if (disabled) return;
		onselect(optionId);
	}
</script>

<div class="flex flex-col gap-3">
	<AnswerPrompt />

	<!-- Image Grid -->
	<div
		class="grid gap-3"
		class:grid-cols-2={options.length <= 4}
		class:grid-cols-3={options.length > 4 && options.length <= 6}
		class:grid-cols-4={options.length > 6 && options.length <= 8}
		class:grid-cols-5={options.length > 8}
		class:sm:grid-cols-3={options.length <= 4}
		class:sm:grid-cols-4={options.length > 4 && options.length <= 6}
		class:md:grid-cols-4={options.length > 6}
		class:lg:grid-cols-5={options.length > 8}
		role="radiogroup"
		aria-label="Image choices"
	>
		{#each shuffledOptions as option (option.id)}
			<button
				type="button"
				class="group relative aspect-square w-full overflow-hidden rounded-lg border-2 transition-all hover:border-border-muted"
				class:border-accent-emerald-border={selectedOptionId === option.id}
				class:border-border={selectedOptionId !== option.id}
				class:ring-2={selectedOptionId === option.id}
				class:ring-accent-emerald-border={selectedOptionId === option.id}
				class:ring-offset-2={selectedOptionId === option.id}
				class:opacity-50={disabled}
				onclick={() => handleSelect(option.id)}
				{disabled}
				role="radio"
				aria-checked={selectedOptionId === option.id}
				aria-label={option.label}
			>
				<img
					src={option.imageUrl}
					alt={option.label}
					class="h-full w-full object-cover"
					loading="lazy"
					onerror={(e) => {
						// Replace with placeholder on error
						const target = e.currentTarget as HTMLImageElement;
						target.style.display = 'none';
						const parent = target.parentElement;
						if (parent) {
							parent.classList.add('bg-surface-muted');
						}
					}}
				/>

				<!-- Selection Indicator -->
				{#if selectedOptionId === option.id}
					<div class="absolute inset-0 flex items-start justify-end p-2">
						<div
							class="flex h-6 w-6 items-center justify-center rounded-full bg-accent-emerald-bg text-text-inverse shadow-md"
						>
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
								<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
							</svg>
						</div>
					</div>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Hidden input for form submission -->
	<input type="hidden" name={`answer-${soundbiteId}`} value={selectedOptionId} />
</div>
