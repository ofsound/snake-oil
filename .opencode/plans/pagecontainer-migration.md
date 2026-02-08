# PageContainer Migration Plan

## Overview

Restructure root layout to allow full-width content while maintaining consistent constrained layout for most pages via a reusable `PageContainer` component.

## Files to Create

### 1. `/src/lib/components/PageContainer.svelte`

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
	}

	let { children, class: className = '' }: Props = $props();
</script>

<div class="mx-auto w-full max-w-5xl grow p-8 {className}">
	{@render children()}
</div>
```

## Files to Modify

### 2. `/src/routes/+layout.svelte`

**Current:**

```svelte
<div class="mx-auto w-full max-w-5xl grow p-8 transition-colors duration-200">
	{@render children()}
</div>
```

**New:**

```svelte
<!-- Remove the constrained wrapper - let children control their own layout -->
{@render children()}
```

### 3. `/src/routes/[owner]/[quiz_slug]/+layout.svelte`

Update to wrap page content in PageContainer while keeping nav full-width:

```svelte
{#if data.showOwnerNav}
	<nav class="full-width-strip">...</nav>
{/if}

<PageContainer>
	{@render children()}
</PageContainer>
```

### 4. `/src/routes/[owner]/[quiz_slug]/+page.svelte`

For Speed Run mode, render without PageContainer. For regular quiz mode, content is already wrapped by layout.

### 5. Admin Pages (add PageContainer)

- `/src/routes/admin/+page.svelte`
- `/src/routes/admin/users/+page.svelte`
- `/src/routes/admin/users/[userId]/+page.svelte`
- `/src/routes/admin/quizzes/+page.svelte`
- `/src/routes/admin/speed-runs/+page.svelte`
- `/src/routes/admin/tags/+page.svelte`
- `/src/routes/admin/audit-log/+page.svelte`

### 6. Content Pages (add PageContainer)

- `/src/routes/quizzes/+page.svelte`
- `/src/routes/quizzes/tags/+page.svelte`
- `/src/routes/quizzes/tag/[slug]/+page.svelte`
- `/src/routes/results/+page.svelte`

### 7. User Pages (add PageContainer)

- `/src/routes/user/[username]/+page.svelte`
- `/src/routes/profile/+page.svelte`

### 8. Auth Pages (add PageContainer)

- `/src/routes/login/+page.svelte`
- `/src/routes/signup/+page.svelte`

### 9. Other Pages (add PageContainer)

- `/src/routes/+page.svelte` (homepage)
- `/src/routes/create/+page.svelte`
- `/src/routes/player/+page.svelte`

## Implementation Order

1. **Create PageContainer component**
2. **Update root layout** (remove constraint)
3. **Update quiz inner layout** (nav full-width, content constrained)
4. **Update speed run page** (ensure full-width)
5. **Batch update all other pages** with PageContainer wrapper

## Testing Checklist

- [ ] Owner nav appears full-width below header
- [ ] Speed run mode is full-width (dark gradient background)
- [ ] Regular quiz mode has proper padding/constraints
- [ ] All admin pages maintain consistent layout
- [ ] All content pages maintain consistent layout
- [ ] Homepage maintains consistent layout
- [ ] No visual regressions in existing pages

## Migration Pattern

Each page update follows this pattern:

```svelte
<!-- Before -->
<div class="space-y-6">
	<h1>Page Title</h1>
	...
</div>

<!-- After -->
<PageContainer>
	<div class="space-y-6">
		<h1>Page Title</h1>
		...
	</div>
</PageContainer>
```

Or if page uses a top-level element:

```svelte
<!-- Before -->
<div class="mx-auto max-w-4xl">...</div>

<!-- After -->
<PageContainer class="max-w-4xl">...</PageContainer>
```
