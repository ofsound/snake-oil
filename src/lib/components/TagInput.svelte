<script lang="ts">
	import { onMount } from 'svelte';
	import { fly, scale } from 'svelte/transition';
	import { elasticOut, backOut } from 'svelte/easing';

	interface Tag {
		id: string;
		label: string;
		slug: string;
		useCount?: number;
	}

	interface Props {
		tags: Tag[];
		maxTags?: number;
		placeholder?: string;
		disabled?: boolean;
		onChange?: (tags: Tag[]) => void;
	}

	let {
		tags = $bindable([]),
		maxTags = 10,
		placeholder = 'Add tags...',
		disabled = false,
		onChange
	}: Props = $props();

	let inputValue = $state('');
	// svelte-ignore non_reactive_update
	let inputElement: HTMLInputElement;
	let suggestions: Tag[] = $state([]);
	let isOpen = $state(false);
	let activeIndex = $state(-1);
	let containerElement: HTMLDivElement;
	let isLoading = $state(false);
	let recentlyAdded = $state<string | null>(null);
	let createError = $state<string | null>(null);

	function debounce(fn: (query: string) => Promise<void>, delay: number) {
		let timeoutId: ReturnType<typeof setTimeout>;
		return (query: string) => {
			clearTimeout(timeoutId);
			timeoutId = setTimeout(() => fn(query), delay);
		};
	}

	async function fetchSuggestions(query: string) {
		if (!query.trim()) {
			suggestions = [];
			isOpen = false;
			return;
		}

		isLoading = true;
		try {
			const response = await fetch(`/api/tags/suggest?q=${encodeURIComponent(query)}&limit=8`);
			if (response.ok) {
				const data = await response.json();
				suggestions = data.tags.filter((t: Tag) => !tags.some((st) => st.id === t.id));
				isOpen = suggestions.length > 0;
				activeIndex = -1;
			}
		} catch (error) {
			console.error('Failed to fetch suggestions:', error);
		} finally {
			isLoading = false;
		}
	}

	const debouncedFetch = debounce(fetchSuggestions, 150);

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		inputValue = target.value;
		createError = null;
		debouncedFetch(inputValue);
	}

	function addTag(tag: Tag) {
		if (tags.length >= maxTags) return;
		if (tags.some((t) => t.id === tag.id)) return;

		tags = [...tags, tag];
		recentlyAdded = tag.id;
		setTimeout(() => (recentlyAdded = null), 300);

		inputValue = '';
		suggestions = [];
		isOpen = false;
		activeIndex = -1;
		onChange?.(tags);
	}

	function removeTag(tagId: string) {
		tags = tags.filter((t) => t.id !== tagId);
		onChange?.(tags);
		inputElement?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (disabled) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				if (!isOpen && inputValue.trim()) {
					fetchSuggestions(inputValue);
				} else if (isOpen) {
					activeIndex = (activeIndex + 1) % suggestions.length;
				}
				break;

			case 'ArrowUp':
				event.preventDefault();
				if (isOpen) {
					activeIndex = activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1;
				}
				break;

			case 'Enter':
				event.preventDefault();
				if (isOpen && activeIndex >= 0 && suggestions[activeIndex]) {
					addTag(suggestions[activeIndex]);
				} else if (inputValue.trim() && !isOpen) {
					createNewTag(inputValue.trim());
				}
				break;

			case 'Escape':
				isOpen = false;
				activeIndex = -1;
				break;

			case 'Backspace':
				if (!inputValue && tags.length > 0) {
					removeTag(tags[tags.length - 1].id);
				}
				break;

			case ',':
			case 'Tab':
				if (inputValue.trim()) {
					event.preventDefault();
					if (isOpen && activeIndex >= 0) {
						addTag(suggestions[activeIndex]);
					} else {
						createNewTag(inputValue.trim());
					}
				}
				break;
		}
	}

	async function createNewTag(label: string) {
		if (tags.length >= maxTags) return;

		isLoading = true;
		createError = null;
		try {
			const formData = new FormData();
			formData.append('label', label);

			const response = await fetch('/api/tags', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				const newTag = await response.json();
				addTag(newTag);
			} else if (response.status === 401) {
				createError = 'Please sign in to create new tags';
				console.error('Authentication required to create tags');
			} else {
				const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
				createError = errorData.message || 'Failed to create tag';
				console.error('Failed to create tag:', errorData);
			}
		} catch (error) {
			createError = 'Network error. Please try again.';
			console.error('Failed to create tag:', error);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		function handleClickOutside(event: MouseEvent) {
			if (containerElement && !containerElement.contains(event.target as Node)) {
				isOpen = false;
			}
		}

		document.addEventListener('click', handleClickOutside);
		return () => document.removeEventListener('click', handleClickOutside);
	});

	function handleContainerClick() {
		if (!disabled) {
			inputElement?.focus();
		}
	}

	type HighlightSegment = { text: string; highlight: boolean };

	function getHighlightSegments(text: string, query: string): HighlightSegment[] {
		if (!query.trim()) return [{ text, highlight: false }];
		const segments: HighlightSegment[] = [];
		let lastIndex = 0;
		let match: RegExpExecArray | null;
		const re = new RegExp(escapeRegex(query), 'gi');
		while ((match = re.exec(text)) !== null) {
			if (match.index > lastIndex) {
				segments.push({ text: text.slice(lastIndex, match.index), highlight: false });
			}
			segments.push({ text: match[0], highlight: true });
			lastIndex = match.index + match[0].length;
		}
		if (lastIndex < text.length) {
			segments.push({ text: text.slice(lastIndex), highlight: false });
		}
		return segments.length ? segments : [{ text, highlight: false }];
	}

	function escapeRegex(str: string) {
		return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	function getButtonClass(isActive: boolean) {
		return isActive
			? 'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-all duration-150 bg-indigo-50 text-indigo-900 dark:bg-indigo-900/50 dark:text-indigo-300'
			: 'flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-all duration-150 text-gray-700 dark:text-gray-300';
	}
</script>

<div class="relative w-full" bind:this={containerElement}>
	<!-- Input Container -->
	<div
		role="button"
		tabindex={disabled ? -1 : 0}
		aria-label="Focus tag input"
		class="group flex min-h-12 flex-wrap items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-3 py-2 transition-all duration-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:focus-within:border-indigo-400 dark:focus-within:ring-indigo-400/10 dark:hover:border-gray-600"
		class:opacity-50={disabled}
		class:cursor-not-allowed={disabled}
		onclick={handleContainerClick}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleContainerClick();
			}
		}}
	>
		{#each tags as tag, i (tag.id)}
			<span
				class="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium transition-all duration-200 {recentlyAdded ===
				tag.id
					? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
					: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'}"
				in:fly={{ y: 10, duration: 200, delay: i * 30, easing: elasticOut }}
				out:scale={{ duration: 150, start: 1, opacity: 0 }}
			>
				{tag.label}
				<button
					type="button"
					class="ml-1 rounded-full p-0.5 transition-colors hover:bg-indigo-200 dark:hover:bg-indigo-800"
					onclick={(e) => {
						e.stopPropagation();
						removeTag(tag.id);
					}}
					title="Remove tag"
				>
					<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</span>
		{/each}

		{#if tags.length < maxTags}
			<input
				bind:this={inputElement}
				type="text"
				{placeholder}
				value={inputValue}
				oninput={handleInput}
				onkeydown={handleKeydown}
				{disabled}
				class="min-w-[120px] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed dark:text-gray-100 dark:placeholder:text-gray-500"
				autocomplete="off"
				autocapitalize="off"
			/>
		{/if}
	</div>

	{#if createError}
		<div class="mt-2 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span>{createError}</span>
		</div>
	{/if}

	{#if tags.length > 0}
		<div class="mt-1.5 flex items-center justify-between text-xs text-gray-500">
			<span>{tags.length} {tags.length === 1 ? 'tag' : 'tags'}</span>
			{#if tags.length >= maxTags}
				<span class="text-amber-600">Maximum {maxTags} tags</span>
			{:else}
				<span>{maxTags - tags.length} remaining</span>
			{/if}
		</div>
	{/if}

	{#if isOpen}
		<div
			class="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800"
			in:fly={{ y: -10, duration: 200, easing: backOut }}
			out:fly={{ y: -10, duration: 150 }}
		>
			{#if isLoading}
				<div class="flex items-center justify-center gap-2 px-4 py-6 text-gray-500">
					<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<span class="text-sm">Loading suggestions...</span>
				</div>
			{:else if suggestions.length > 0}
				<ul class="max-h-64 overflow-y-auto py-2">
					{#each suggestions as suggestion, i (suggestion.id)}
						<li>
							<button
								type="button"
								class={getButtonClass(activeIndex === i)}
								onclick={() => addTag(suggestion)}
								onmouseenter={() => (activeIndex = i)}
							>
								<span class="font-medium">
									{#each getHighlightSegments(suggestion.label, inputValue) as segment, segIdx (suggestion.id + segIdx)}
										{#if segment.highlight}
											<mark
												class="bg-indigo-200 text-indigo-900 dark:bg-indigo-800 dark:text-indigo-200"
												>{segment.text}</mark
											>
										{:else}
											{segment.text}
										{/if}
									{/each}
								</span>
								{#if suggestion.useCount && suggestion.useCount > 0}
									<span class="text-xs text-gray-500">
										{suggestion.useCount} uses
									</span>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			{:else if inputValue.trim() && !isLoading}
				<div class="px-4 py-3 text-sm text-gray-500">
					<span
						>Press <kbd class="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs dark:bg-gray-700"
							>Enter</kbd
						> to create "</span
					>
					<span class="font-medium text-indigo-600 dark:text-indigo-400">{inputValue.trim()}</span>
					<span>"</span>
				</div>
			{/if}
		</div>
	{/if}
</div>
