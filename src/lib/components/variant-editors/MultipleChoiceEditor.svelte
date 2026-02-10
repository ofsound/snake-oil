<script lang="ts">
	import Button from '$lib/components/Button.svelte';

	import {
		MAX_MULTIPLE_CHOICE_OPTIONS,
		MIN_MULTIPLE_CHOICE_OPTIONS
	} from '$lib/constants/variants';
	import { createEmptyOption } from '$lib/variant-client-utils';

	import type { VariantEditorProps } from '$lib/types/soundbite';
	let { soundbite, onChange, editorId = 'mc-option' }: VariantEditorProps = $props();

	const options = $derived(soundbite.multipleChoiceOptions);

	function addOption() {
		if (options.length >= MAX_MULTIPLE_CHOICE_OPTIONS) return;
		onChange({ multipleChoiceOptions: [...options, createEmptyOption()] });
	}

	function removeOption(optionId: string) {
		if (options.length <= MIN_MULTIPLE_CHOICE_OPTIONS) return;
		onChange({ multipleChoiceOptions: options.filter((opt) => opt.id !== optionId) });
	}

	function updateOptionText(optionId: string, text: string) {
		onChange({
			multipleChoiceOptions: options.map((opt) => (opt.id === optionId ? { ...opt, text } : opt))
		});
	}

	function setCorrectOption(optionId: string) {
		onChange({
			multipleChoiceOptions: options.map((opt) => ({
				...opt,
				isCorrect: opt.id === optionId
			}))
		});
	}
</script>

<div class="flex flex-col gap-2">
	<div class="text-sm font-medium text-text-primary">Answer Options</div>
	<div class="flex flex-col gap-2">
		{#each options as option, index (option.id)}
			<div class="flex items-center gap-2">
				<input
					type="radio"
					name={`${editorId}-correct`}
					checked={option.isCorrect}
					onchange={() => setCorrectOption(option.id)}
					class="h-4 w-4 text-accent-emerald-text"
					title="Mark as correct answer"
				/>
				<input
					type="text"
					id={`${editorId}-${option.id}`}
					class="sm flex-1 rounded-sm border border-border bg-surface-elevated px-2 py-2 text-sm"
					placeholder={`Option ${index + 1}`}
					value={option.text}
					oninput={(e) => updateOptionText(option.id, e.currentTarget.value)}
					required
				/>
				<button
					type="button"
					class="cursor-pointer text-sm text-text-secondary hover:text-text-muted"
					onclick={() => removeOption(option.id)}
					disabled={options.length <= MIN_MULTIPLE_CHOICE_OPTIONS}
					title="Remove option"
				>
					&times;
				</button>
			</div>
		{/each}
		<div class="mt-1 ml-auto w-max">
			<Button
				variant="outline"
				size="xs"
				type="button"
				onclick={addOption}
				disabled={options.length >= MAX_MULTIPLE_CHOICE_OPTIONS}
			>
				Add Option
			</Button>
		</div>
	</div>
	<p class="m-1 text-xs">Select the radio button next to the correct answer.</p>
</div>
