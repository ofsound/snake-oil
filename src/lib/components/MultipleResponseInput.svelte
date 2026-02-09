<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import AnswerPrompt from './AnswerPrompt.svelte';
	import { shuffleOptions } from '$lib/variant-client-utils';
	import type { MultipleResponseOption } from '$lib/variant-types';

	// Module-level cache to maintain consistent shuffle order per soundbite
	const shuffleCache = new SvelteMap<string, MultipleResponseOption[]>();

	type Props = {
		soundbiteId: string;
		options: MultipleResponseOption[];
		selectedOptionIds: string[];
		onselect: (optionIds: string[]) => void;
		disabled?: boolean;
	};

	let { soundbiteId, options, selectedOptionIds, onselect, disabled = false }: Props = $props();

	// Initialize cache in $effect to avoid state mutation during render
	let shuffledOptions = $state<MultipleResponseOption[]>([]);

	$effect(() => {
		if (!shuffleCache.has(soundbiteId)) {
			shuffleCache.set(soundbiteId, shuffleOptions(options));
		}
		shuffledOptions = shuffleCache.get(soundbiteId)!;
	});

	function toggleOption(optionId: string) {
		if (disabled) return;

		const isSelected = selectedOptionIds.includes(optionId);
		if (isSelected) {
			// Remove from selection
			onselect(selectedOptionIds.filter((id) => id !== optionId));
		} else {
			// Add to selection
			onselect([...selectedOptionIds, optionId]);
		}
	}
</script>

<div class="flex flex-col gap-2">
	<AnswerPrompt text="Your answer (select all that apply):" />
	<div class="flex flex-col gap-2">
		{#each shuffledOptions as option (option.id)}
			{@const isSelected = selectedOptionIds.includes(option.id)}
			<label
				class="flex cursor-pointer items-center gap-3 rounded-sm border border-neutral-200 bg-white p-3 font-medium"
				class:bg-emerald-50={isSelected}
				class:border-emerald-300={isSelected}
			>
				<input
					type="checkbox"
					name={`answer-${soundbiteId}`}
					value={option.id}
					checked={isSelected}
					onchange={() => toggleOption(option.id)}
					{disabled}
					class="h-4 w-4 text-emerald-600"
				/>
				<span class="text-sm">{option.text}</span>
			</label>
		{/each}
	</div>
</div>
