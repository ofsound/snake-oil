<script lang="ts" module>
	import { SvelteMap } from 'svelte/reactivity';

	import { shuffleOptions } from '$lib/variant-client-utils';

	import type { MultipleChoiceOption } from '$lib/variant-types';
	// Module-level cache to maintain consistent shuffle order per soundbite
	const shuffleCache = new SvelteMap<string, MultipleChoiceOption[]>();
</script>

<script lang="ts">
	import AnswerPrompt from './AnswerPrompt.svelte';

	type Props = {
		soundbiteId: string;
		options: MultipleChoiceOption[];
		selectedOptionId: string;
		onselect: (optionId: string) => void;
		disabled?: boolean;
	};

	let { soundbiteId, options, selectedOptionId, onselect, disabled = false }: Props = $props();

	// State to hold shuffled options
	let shuffledOptions = $state<MultipleChoiceOption[]>([]);

	// Use effect to populate cache (side effects are allowed here)
	$effect(() => {
		if (!shuffleCache.has(soundbiteId)) {
			shuffleCache.set(soundbiteId, shuffleOptions(options));
		}
		shuffledOptions = shuffleCache.get(soundbiteId)!;
	});
</script>

<div class="flex flex-col gap-2">
	<AnswerPrompt />
	<div class="flex flex-col gap-2">
		{#each shuffledOptions as option (option.id)}
			<label
				class="flex cursor-pointer items-center gap-3 rounded-sm border border-neutral-200 bg-white p-3 font-medium"
				class:bg-emerald-50={selectedOptionId === option.id}
				class:border-emerald-300={selectedOptionId === option.id}
			>
				<input
					type="radio"
					name={`answer-${soundbiteId}`}
					value={option.id}
					checked={selectedOptionId === option.id}
					onchange={() => onselect(option.id)}
					{disabled}
					class="h-4 w-4 text-emerald-600"
				/>
				<span class="text-sm">{option.text}</span>
			</label>
		{/each}
	</div>
	<!-- Hidden input to submit the selected option ID -->
	<input type="hidden" name={`answer-${soundbiteId}`} value={selectedOptionId} />
</div>
