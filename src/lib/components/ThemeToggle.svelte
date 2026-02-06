<script lang="ts">
	import { setMode, userPrefersMode } from 'mode-watcher';
</script>

<div
	class="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800"
>
	<button
		type="button"
		onclick={() => setMode('system')}
		class="relative rounded-full px-3 py-1.5 text-sm transition-all duration-200 {userPrefersMode.current ===
		'system'
			? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
			: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
		aria-label="System preference"
		title="System preference"
	>
		<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
			/>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
			/>
		</svg>
	</button>
	<button
		type="button"
		onclick={() => setMode('light')}
		class="relative rounded-full px-3 py-1.5 text-sm transition-all duration-200 {userPrefersMode.current ===
		'light'
			? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
			: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
		aria-label="Light mode"
		title="Light mode"
	>
		<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
			/>
		</svg>
	</button>
	<button
		type="button"
		onclick={() => setMode('dark')}
		class="relative rounded-full px-3 py-1.5 text-sm transition-all duration-200 {userPrefersMode.current ===
		'dark'
			? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
			: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}"
		aria-label="Dark mode"
		title="Dark mode"
	>
		<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
			/>
		</svg>
	</button>
</div>
