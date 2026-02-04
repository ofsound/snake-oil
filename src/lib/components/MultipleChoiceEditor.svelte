<script lang="ts">
	import type { MultipleChoiceOption } from '$lib/variant-types';
	import { createEmptyOption } from '$lib/variant-client-utils';

	type Props = {
		options: MultipleChoiceOption[];
		onchange: (options: MultipleChoiceOption[]) => void;
		idPrefix?: string;
	};

	let { options, onchange, idPrefix = 'mc-option' }: Props = $props();

	function addOption() {
		if (options.length >= 10) return;
		onchange([...options, createEmptyOption()]);
	}

	function removeOption(optionId: string) {
		if (options.length <= 2) return;
		onchange(options.filter((opt) => opt.id !== optionId));
	}

	function updateOptionText(optionId: string, text: string) {
		onchange(options.map((opt) => (opt.id === optionId ? { ...opt, text } : opt)));
	}

	function setCorrectOption(optionId: string) {
		onchange(options.map((opt) => ({ ...opt, isCorrect: opt.id === optionId })));
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center justify-between">
		<span class="text-sm font-medium text-gray-700">Answer Options</span>
		<button
			type="button"
			class="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
			onclick={addOption}
			disabled={options.length >= 10}
		>
			Add Option
		</button>
	</div>

	<div class="flex flex-col gap-2">
		{#each options as option, index (option.id)}
			<div class="flex items-center gap-2">
				<input
					type="radio"
					name={`${idPrefix}-correct`}
					checked={option.isCorrect}
					onchange={() => setCorrectOption(option.id)}
					class="h-4 w-4 text-emerald-600"
					title="Mark as correct answer"
				/>
				<input
					type="text"
					id={`${idPrefix}-${option.id}`}
					class="sm flex-1 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
					placeholder={`Option ${index + 1}`}
					value={option.text}
					oninput={(e) => updateOptionText(option.id, e.currentTarget.value)}
					required
				/>
				<button
					type="button"
					class="text-xs text-gray-400 hover:text-gray-600"
					onclick={() => removeOption(option.id)}
					disabled={options.length <= 2}
					title="Remove option"
				>
					&times;
				</button>
			</div>
		{/each}
	</div>
	<p class="text-xs text-gray-500">Select the radio button next to the correct answer.</p>
</div>
