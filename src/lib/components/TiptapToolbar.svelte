<script lang="ts">
	import type { Editor } from '@tiptap/core';

	interface Props {
		editor: Editor;
	}

	let { editor }: Props = $props();
</script>

<div
	class="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-800"
>
	<button
		type="button"
		class="rounded px-2 py-1 text-sm font-medium transition-colors {editor.isActive('bold')
			? 'bg-indigo-600 text-white'
			: 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
		onclick={() => editor.chain().focus().toggleBold().run()}
	>
		Bold
	</button>

	<button
		type="button"
		class="rounded px-2 py-1 text-sm font-medium transition-colors {editor.isActive('italic')
			? 'bg-indigo-600 text-white'
			: 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
		onclick={() => editor.chain().focus().toggleItalic().run()}
	>
		Italic
	</button>

	<div class="mx-1 w-px bg-gray-300 dark:bg-gray-600"></div>

	<button
		type="button"
		class="rounded px-2 py-1 text-sm font-medium transition-colors {editor.isActive('heading', {
			level: 1
		})
			? 'bg-indigo-600 text-white'
			: 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
		onclick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
	>
		H1
	</button>

	<button
		type="button"
		class="rounded px-2 py-1 text-sm font-medium transition-colors {editor.isActive('heading', {
			level: 2
		})
			? 'bg-indigo-600 text-white'
			: 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
		onclick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
	>
		H2
	</button>

	<div class="mx-1 w-px bg-gray-300 dark:bg-gray-600"></div>

	<button
		type="button"
		class="rounded px-2 py-1 text-sm font-medium transition-colors {editor.isActive('bulletList')
			? 'bg-indigo-600 text-white'
			: 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
		onclick={() => editor.chain().focus().toggleBulletList().run()}
	>
		• List
	</button>

	<button
		type="button"
		class="rounded px-2 py-1 text-sm font-medium transition-colors {editor.isActive('orderedList')
			? 'bg-indigo-600 text-white'
			: 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
		onclick={() => editor.chain().focus().toggleOrderedList().run()}
	>
		1. List
	</button>

	<div class="mx-1 w-px bg-gray-300 dark:bg-gray-600"></div>

	<button
		type="button"
		class="rounded px-2 py-1 text-sm font-medium transition-colors {editor.isActive('link')
			? 'bg-indigo-600 text-white'
			: 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}"
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
	>
		Link
	</button>
</div>

<style>
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
