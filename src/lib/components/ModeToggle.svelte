<script lang="ts">
	interface Props {
		value: 'all' | 'quiz' | 'speedrun';
		onChange: (value: 'all' | 'quiz' | 'speedrun') => void;
	}

	let { value, onChange }: Props = $props();

	const options = [
		{ value: 'all' as const, label: 'Both' },
		{ value: 'quiz' as const, label: 'Quizzes' },
		{ value: 'speedrun' as const, label: '⚡ Speed Runs' }
	] as const;
</script>

<div class="mx-auto flex w-max rounded-lg bg-indigo-100 p-1">
	{#each options as option (option.value)}
		<button
			type="button"
			class="rounded-md px-4 py-2 text-sm font-medium transition-all"
			class:bg-white={value === option.value}
			class:text-indigo-700={value === option.value}
			class:shadow-sm={value === option.value}
			class:text-indigo-600={value !== option.value}
			class:hover:bg-indigo-50={value !== option.value}
			onclick={() => onChange(option.value)}
		>
			{option.label}
		</button>
	{/each}
</div>
