<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Editor, type JSONContent } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Link from '@tiptap/extension-link';

	import TiptapToolbar from './TiptapToolbar.svelte';

	interface Props {
		content?: JSONContent;
		onChange?: (json: JSONContent) => void;
		placeholder?: string;
		maxLength?: number;
	}

	let { content, onChange, placeholder = 'Write something...', maxLength = 2000 }: Props = $props();

	let element = $state<HTMLElement | null>(null);
	let editor = $state<Editor | null>(null);
	let currentLength = $state(0);
	let isEmpty = $state(true);

	$effect(() => {
		if (element && !editor) {
			editor = new Editor({
				element,
				extensions: [
					StarterKit.configure({
						heading: {
							levels: [1, 2]
						}
					}),
					Link.configure({
						openOnClick: false,
						linkOnPaste: true
					})
				],
				content,
				editorProps: {
					attributes: {
						class:
							'prose dark:prose-invert prose-sm max-w-none min-h-[150px] p-3 focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5'
					}
				},
				onUpdate: ({ editor }) => {
					const json = editor.getJSON();
					const text = editor.getText();
					currentLength = text.length;
					isEmpty = editor.isEmpty;
					if (onChange) {
						onChange(json);
					}
				},
				onCreate: ({ editor }) => {
					currentLength = editor.getText().length;
					isEmpty = editor.isEmpty;
				}
			});
		}
	});

	onDestroy(() => {
		if (editor) {
			editor.destroy();
		}
	});

	export function getJSON(): JSONContent {
		return editor?.getJSON() || { type: 'doc', content: [] };
	}

	export function setJSON(json: JSONContent): void {
		editor?.commands.setContent(json);
	}
</script>

<div
	class="overflow-hidden rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
>
	{#if editor}
		<TiptapToolbar {editor} />
	{/if}
	<div bind:this={element} class="relative">
		{#if !editor || isEmpty}
			<div class="pointer-events-none absolute top-3 left-3 text-gray-400 dark:text-gray-500">
				{placeholder}
			</div>
		{/if}
	</div>
	<div
		class="border-t border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
	>
		{currentLength} / {maxLength} characters
	</div>
</div>
