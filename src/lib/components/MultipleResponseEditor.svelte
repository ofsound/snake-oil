<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import type { MultipleResponseOption } from '$lib/variant-types';
	import { createEmptyOption } from '$lib/variant-client-utils';

	type Props = {
		options: MultipleResponseOption[];
		onchange: (options: MultipleResponseOption[]) => void;
		idPrefix?: string;
	};

	let { options, onchange, idPrefix = 'mr-option' }: Props = $props();

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

	function toggleCorrectOption(optionId: string) {
		onchange(
			options.map((opt) => (opt.id === optionId ? { ...opt, isCorrect: !opt.isCorrect } : opt))
		);
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<span class="text-sm font-medium text-gray-700">Answer Options</span>
		<Button variant="outline" size="xs" onclick={addOption} disabled={options.length >= 10}>
			Add Option
		</Button>
	</div>

	<div class="space-y-2">
		{#each options as option, index (option.id)}
			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					checked={option.isCorrect}
					onchange={() => toggleCorrectOption(option.id)}
					class="h-4 w-4 text-emerald-600"
					title="Mark as correct answer"
				/>
				<input
					type="text"
					id={`${idPrefix}-${option.id}`}
					class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
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
	<p class="text-xs text-gray-500">
		Check the checkbox next to each correct answer. Quiz takers must select ALL correct answers (and
		no incorrect ones) to be marked correct.
	</p>
</div>
