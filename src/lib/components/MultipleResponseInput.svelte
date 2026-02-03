<script lang="ts" module>
	import type { MultipleResponseOption } from '$lib/variant-types';
	import { shuffleOptions } from '$lib/variant-client-utils';

	// Module-level cache to maintain consistent shuffle order per soundbite
	const shuffleCache = new Map<string, MultipleResponseOption[]>();

	function getShuffledOptions(
		soundbiteId: string,
		options: MultipleResponseOption[]
	): MultipleResponseOption[] {
		if (!shuffleCache.has(soundbiteId)) {
			shuffleCache.set(soundbiteId, shuffleOptions(options));
		}
		return shuffleCache.get(soundbiteId)!;
	}
</script>

<script lang="ts">
	type Props = {
		soundbiteId: string;
		options: MultipleResponseOption[];
		selectedOptionIds: string[];
		onselect: (optionIds: string[]) => void;
		disabled?: boolean;
	};

	let { soundbiteId, options, selectedOptionIds, onselect, disabled = false }: Props = $props();

	// Get shuffled options from cache (creates if not exists)
	let shuffledOptions = $derived(getShuffledOptions(soundbiteId, options));

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
	<span class="text-sm font-medium text-gray-700">Your answer (select all that apply):</span>
	<div class="space-y-2">
		{#each shuffledOptions as option (option.id)}
			{@const isSelected = selectedOptionIds.includes(option.id)}
			<label
				class="flex cursor-pointer items-center gap-3 rounded-md border border-gray-200 p-3 hover:bg-gray-50"
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
