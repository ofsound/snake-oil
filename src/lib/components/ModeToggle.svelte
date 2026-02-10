<script lang="ts">
	interface Props {
		value: 'all' | 'quiz' | 'speedrun';
		onChange: (value: 'all' | 'quiz' | 'speedrun') => void;
		variant?: 'default' | 'minimal';
	}

	let { value, onChange, variant = 'default' }: Props = $props();

	const options = [
		{ value: 'all' as const, label: 'Both' },
		{ value: 'quiz' as const, label: 'Quizzes' },
		{ value: 'speedrun' as const, label: '⚡ Speed Runs' }
	] as const;
</script>

<div
	class="flex gap-4"
	class:mx-auto={variant === 'default'}
	class:w-max={variant === 'default'}
	class:rounded-lg={variant === 'default'}
	class:bg-accent-indigo-bg={variant === 'default'}
	class:p-1={variant === 'default'}
>
	{#each options as option (option.value)}
		<button
			type="button"
			class="transition-all"
			class:rounded-md={variant === 'default'}
			class:px-4={variant === 'default'}
			class:py-2={variant === 'default'}
			class:text-sm={variant === 'default'}
			class:font-medium={variant === 'default' || (variant === 'minimal' && value === option.value)}
			class:bg-surface-elevated={variant === 'default' && value === option.value}
			class:text-accent-indigo-text={variant === 'default'}
			class:shadow-sm={variant === 'default' && value === option.value}
			class:hover:bg-interactive-bg={variant === 'default' && value !== option.value}
			class:px-2={variant === 'minimal'}
			class:py-1={variant === 'minimal'}
			class:text-xs={variant === 'minimal'}
			class:border-b-2={variant === 'minimal' && value === option.value}
			class:border-text-primary={variant === 'minimal' && value === option.value}
			class:text-text-secondary={variant === 'minimal' && value === option.value}
			class:text-text-muted={variant === 'minimal' && value !== option.value}
			class:hover:text-text-secondary={variant === 'minimal' && value !== option.value}
			onclick={() => onChange(option.value)}
		>
			{option.label}
		</button>
	{/each}
</div>
