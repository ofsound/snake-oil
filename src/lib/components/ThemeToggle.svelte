<script lang="ts">
	import { setMode, userPrefersMode } from 'mode-watcher';

	import Icon from './Icon.svelte';
</script>

<div class="inline-flex items-center rounded-full border border-border bg-surface-muted p-1">
	<button
		type="button"
		onclick={() => setMode('system')}
		class="relative rounded-full px-3 py-1.5 text-sm transition-all duration-200 {userPrefersMode.current ===
		'system'
			? 'bg-surface text-text-primary shadow-sm'
			: 'text-text-muted hover:text-text-secondary'}"
		aria-label="System preference"
		title="System preference"
	>
		<Icon name="monitor" size="sm" />
	</button>
	<button
		type="button"
		onclick={() => setMode('light')}
		class="relative rounded-full px-3 py-1.5 text-sm transition-all duration-200 {userPrefersMode.current ===
		'light'
			? 'bg-surface-elevated text-text-primary shadow-sm'
			: 'text-text-muted hover:text-text-secondary'}"
		aria-label="Light mode"
		title="Light mode"
	>
		<Icon name="sun" size="sm" />
	</button>
	<button
		type="button"
		onclick={() => setMode('dark')}
		class="relative rounded-full px-3 py-1.5 text-sm transition-all duration-200 {userPrefersMode.current ===
		'dark'
			? 'bg-surface-elevated text-text-primary shadow-sm'
			: 'text-text-muted hover:text-text-secondary'}"
		aria-label="Dark mode"
		title="Dark mode"
	>
		<Icon name="moon" size="sm" />
	</button>
</div>
