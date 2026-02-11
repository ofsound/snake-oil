<script lang="ts">
	import type { Editor } from '@tiptap/core';

	import Icon from './Icon.svelte';

	interface Props {
		editor: Editor;
	}

	let { editor }: Props = $props();
</script>

<div class="flex flex-wrap gap-1 border-b border-border-muted bg-surface-muted p-2">
	<button
		type="button"
		class="rounded p-2 text-sm font-medium transition-colors {editor.isActive('bold')
			? 'bg-accent-indigo-bg text-text-inverse'
			: 'bg-surface text-text-secondary hover:bg-interactive-bg'}"
		onclick={() => editor.chain().focus().toggleBold().run()}
		title="Bold"
	>
		<Icon name="bold" size="sm" />
	</button>

	<button
		type="button"
		class="rounded p-2 text-sm font-medium transition-colors {editor.isActive('italic')
			? 'bg-accent-indigo-bg text-text-inverse'
			: 'bg-surface-elevated text-text-primary hover:bg-interactive-bg'}"
		onclick={() => editor.chain().focus().toggleItalic().run()}
		title="Italic"
	>
		<Icon name="italic" size="sm" />
	</button>

	<div class="mx-1 w-px bg-border-muted"></div>

	<button
		type="button"
		class="rounded p-2 text-sm font-medium transition-colors {editor.isActive('heading', {
			level: 1
		})
			? 'bg-accent-indigo-bg text-text-inverse'
			: 'bg-surface-elevated text-text-primary hover:bg-interactive-bg'}"
		onclick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
		title="Heading 1"
	>
		<Icon name="heading" size="sm" />
	</button>

	<button
		type="button"
		class="rounded p-2 text-sm font-medium transition-colors {editor.isActive('heading', {
			level: 2
		})
			? 'bg-accent-indigo-bg text-text-inverse'
			: 'bg-surface-elevated text-text-primary hover:bg-interactive-bg'}"
		onclick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
		title="Heading 2"
	>
		<span class="text-xs font-bold">H2</span>
	</button>

	<div class="mx-1 w-px bg-border-muted"></div>

	<button
		type="button"
		class="rounded p-2 text-sm font-medium transition-colors {editor.isActive('bulletList')
			? 'bg-accent-indigo-bg text-text-inverse'
			: 'bg-surface-elevated text-text-primary hover:bg-interactive-bg'}"
		onclick={() => editor.chain().focus().toggleBulletList().run()}
		title="Bullet List"
	>
		<Icon name="list-bullet" size="sm" />
	</button>

	<button
		type="button"
		class="rounded p-2 text-sm font-medium transition-colors {editor.isActive('orderedList')
			? 'bg-accent-indigo-bg text-text-inverse'
			: 'bg-surface-elevated text-text-primary hover:bg-interactive-bg'}"
		onclick={() => editor.chain().focus().toggleOrderedList().run()}
		title="Numbered List"
	>
		<Icon name="list-number" size="sm" />
	</button>

	<div class="mx-1 w-px bg-border-muted"></div>

	<button
		type="button"
		class="rounded p-2 text-sm font-medium transition-colors {editor.isActive('link')
			? 'bg-accent-indigo-bg text-text-inverse'
			: 'bg-surface-elevated text-text-primary hover:bg-interactive-bg'}"
		onclick={() => {
			const previousUrl = editor.getAttributes('link').href;
			const url = window.prompt('Enter URL:', previousUrl);
			if (url === null) return;
			if (url === '') {
				editor.chain().focus().extendMarkRange('link').unsetLink().run();
			} else {
				editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
			}
		}}
		title="Link"
	>
		<Icon name="link" size="sm" />
	</button>
</div>

<style>
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
