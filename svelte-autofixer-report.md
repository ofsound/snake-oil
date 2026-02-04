# Svelte-autofixer report

Summary of what the **svelte-autofixer** (Svelte MCP) reported across the project.

---

## Scope

Autofixer was run with **Svelte 5** and **desired_svelte_version: 5** on **28 of 29** `.svelte` files. One file was skipped (see below).

---

## Files with no issues and no suggestions (24 files)

- **Layout:** `src/routes/+layout.svelte`
- **Components:** `Button.svelte`, `Card.svelte`, `AnswerPrompt.svelte`, `FormField.svelte`, `AuthFormInput.svelte`, `AuthForm.svelte`, `VariantSelector.svelte`, `SimpleGuessInput.svelte`, `SimpleGuessEditor.svelte`, `AnswerResultCard.svelte`, `MultipleChoiceEditor.svelte`, `MultipleResponseEditor.svelte`, `SoundbiteEditor.svelte`, `SoundbiteFormSection.svelte`, `QuizRow.svelte`, `QuizList.svelte`
- **Pages:** `src/routes/+page.svelte`, `src/routes/users/[username]/+page.svelte`, `src/routes/profile/+page.svelte`, `src/routes/results/+page.svelte`, `src/routes/quizzes/+page.svelte`, `src/routes/[slug]/+page.svelte`

---

## Files with suggestions only (no issues) (4 files)

### 1. `src/lib/components/MultipleChoiceInput.svelte`

- **Suggestion:** Use `SvelteMap` instead of the built-in `Map` for the module-level shuffle cache.
- Location: line 6, column 23 (`const shuffleCache = new Map<...>()`).

### 2. `src/lib/components/MultipleResponseInput.svelte`

- **Suggestion:** Same as above — use `SvelteMap` instead of `Map` for the module-level cache.
- Location: line 6, column 23.

### 3. `src/routes/login/+page.svelte`

- **Suggestion:** "Found an unnecessary children snippet" at line 65, column 2 (the `{#snippet children()}` block).

### 4. `src/routes/signup/+page.svelte`

- **Suggestions:**
  - The stateful variable `slug` is assigned inside an `$effect`, which is generally considered bad practice; consider using `$derived` if possible.
  - Prefer a writable `$derived` instead of `$state` + `$effect` (around line 12, column 6).
  - "Found an unnecessary children snippet" at line 96, column 2.

### 5. `src/routes/create/+page.svelte`

- **Suggestion:** "The stateful variable `manualSlug` is assigned inside an `$effect` which is generally consider a malpractice. Consider using `$derived` if possible."

---

## File not run

### `src/routes/quizzes/[quizId]/+page.svelte`

- **Not run:** This file was not analyzed because of its size (~403 lines, ~15.5k characters when JSON-encoded). Autofixer was run on all other Svelte files.

---

## Summary table

| Category                              | Count                                          |
| ------------------------------------- | ---------------------------------------------- |
| No issues, no suggestions             | 24                                             |
| Suggestions only (Map → SvelteMap)    | 2 (MultipleChoiceInput, MultipleResponseInput) |
| Suggestions only (snippets / $effect) | 3 (login, signup, create)                      |
| Not run (size)                        | 1 (quizzes/[quizId]/+page.svelte)              |

- **Issues:** None; autofixer reported **0** issues across all analyzed files.
- **Suggestions:** Map vs SvelteMap (2 files), unnecessary children snippet (2 files), $effect/state (2 files).

No changes were applied; this is a report only.
