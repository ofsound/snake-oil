<script lang="ts">
	interface Props {
		checked?: boolean;
		onchange?: (checked: boolean) => void;
		label?: string;
		leftLabel?: string;
		rightLabel?: string;
		id?: string;
		name?: string;
		disabled?: boolean;
	}

	let {
		checked = $bindable(false),
		onchange,
		label,
		leftLabel = 'Unlisted',
		rightLabel = 'Public',
		id,
		name,
		disabled = false
	}: Props = $props();

	function handleToggle() {
		if (disabled) return;
		checked = !checked;
		onchange?.(checked);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (disabled) return;
		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			handleToggle();
		}
	}
</script>

<div class="flex flex-col gap-2">
	{#if label}
		<span class="text-sm font-medium text-gray-700 opacity-0">{label}</span>
	{/if}

	<div class="flex items-center gap-3">
		<span
			class="text-sm text-gray-500 transition-colors duration-200 {checked
				? 'text-gray-400'
				: 'font-medium text-gray-700'}"
		>
			{leftLabel}
		</span>

		<button
			type="button"
			role="switch"
			aria-checked={checked}
			{id}
			{name}
			{disabled}
			onclick={handleToggle}
			onkeydown={handleKeyDown}
			class="
				relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full
				transition-all duration-200 ease-in-out focus:outline-none focus-visible:ring-2
				focus-visible:ring-green-500 focus-visible:ring-offset-2
				{checked
				? 'bg-linear-to-r from-green-400 to-green-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]'
				: 'bg-linear-to-r from-gray-300 to-gray-400 shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)]'}
				{disabled ? 'cursor-not-allowed opacity-50' : ''}
			"
		>
			<span class="sr-only">{checked ? rightLabel : leftLabel}</span>
			<span
				class="
					pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg
					transition-all duration-200 ease-in-out
					{checked ? 'translate-x-7' : 'translate-x-1'}
				"
				style="box-shadow: 0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1);"
			></span>
		</button>

		<span
			class="text-sm transition-colors duration-200 {checked
				? 'font-medium text-green-700'
				: 'text-gray-400'}"
		>
			{rightLabel}
		</span>
	</div>
</div>
