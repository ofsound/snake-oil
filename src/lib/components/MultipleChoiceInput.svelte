<script lang="ts" module>
	import type { MultipleChoiceOption } from '$lib/variant-types';
	import { shuffleOptions } from '$lib/variant-client-utils';

	// Module-level cache to maintain consistent shuffle order per soundbite
	const shuffleCache = new Map<string, MultipleChoiceOption[]>();

	function getShuffledOptions(
		soundbiteId: string,
		options: MultipleChoiceOption[]
	): MultipleChoiceOption[] {
		if (!shuffleCache.has(soundbiteId)) {
			shuffleCache.set(soundbiteId, shuffleOptions(options));
		}
		return shuffleCache.get(soundbiteId)!;
	}
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

	// Get shuffled options from cache (creates if not exists)
	let shuffledOptions = $derived(getShuffledOptions(soundbiteId, options));
</script>

<div class="flex flex-col gap-2">
	<AnswerPrompt />
	<div class="space-y-2">
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
