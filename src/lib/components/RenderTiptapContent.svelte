<script lang="ts">
	import type { JSONContent } from '@tiptap/core';
	import RenderTiptapContent from './RenderTiptapContent.svelte';

	interface Props {
		content: JSONContent | null | undefined;
	}

	let { content }: Props = $props();

	function getMarkAttributes(node: JSONContent): Record<string, string> {
		const attrs: Record<string, string> = {};
		if (node.marks) {
			for (const mark of node.marks) {
				if (mark.type === 'link' && mark.attrs?.href) {
					attrs.href = mark.attrs.href as string;
					attrs.target = '_blank';
					attrs.rel = 'noopener noreferrer nofollow';
				}
			}
		}
		return attrs;
	}

	function isMarkActive(node: JSONContent, markType: string): boolean {
		return !!(node.marks && node.marks.some((m) => m.type === markType));
	}
</script>

{#if content}
	{#if content.type === 'doc'}
		{#each content.content || [] as node (node)}
			<RenderTiptapContent content={node} />
		{/each}
	{:else if content.type === 'paragraph'}
		<p class="mb-3 last:mb-0">
			{#each content.content || [] as child (child)}
				<RenderTiptapContent content={child} />
			{/each}
		</p>
	{:else if content.type === 'heading'}
		{#if content.attrs?.level === 1}
			<h1 class="mb-3 text-2xl font-bold last:mb-0">
				{#each content.content || [] as child (child)}
					<RenderTiptapContent content={child} />
				{/each}
			</h1>
		{:else}
			<h2 class="mb-3 text-xl font-bold last:mb-0">
				{#each content.content || [] as child (child)}
					<RenderTiptapContent content={child} />
				{/each}
			</h2>
		{/if}
	{:else if content.type === 'bulletList'}
		<ul class="mb-3 list-disc pl-5 last:mb-0">
			{#each content.content || [] as child (child)}
				<RenderTiptapContent content={child} />
			{/each}
		</ul>
	{:else if content.type === 'orderedList'}
		<ol class="mb-3 list-decimal pl-5 last:mb-0">
			{#each content.content || [] as child (child)}
				<RenderTiptapContent content={child} />
			{/each}
		</ol>
	{:else if content.type === 'listItem'}
		<li class="mb-1">
			{#each content.content || [] as child (child)}
				<RenderTiptapContent content={child} />
			{/each}
		</li>
	{:else if content.type === 'text'}
		{@const isBold = isMarkActive(content, 'bold') || isMarkActive(content, 'strong')}
		{@const isItalic = isMarkActive(content, 'italic') || isMarkActive(content, 'em')}
		{@const isLink = isMarkActive(content, 'link')}
		{@const linkAttrs = getMarkAttributes(content)}

		{#if isLink}
			<a
				href={linkAttrs.href}
				target={linkAttrs.target}
				rel={linkAttrs.rel}
				class="text-accent-indigo-text hover:text-accent-indigo-text hover:underline"
			>
				{#if isBold && isItalic}
					<strong><em>{content.text}</em></strong>
				{:else if isBold}
					<strong>{content.text}</strong>
				{:else if isItalic}
					<em>{content.text}</em>
				{:else}
					{content.text}
				{/if}
			</a>
		{:else if isBold && isItalic}
			<strong><em>{content.text}</em></strong>
		{:else if isBold}
			<strong>{content.text}</strong>
		{:else if isItalic}
			<em>{content.text}</em>
		{:else}
			{content.text}
		{/if}
	{:else if content.content}
		{#each content.content || [] as child (child)}
			<RenderTiptapContent content={child} />
		{/each}
	{/if}
{/if}
