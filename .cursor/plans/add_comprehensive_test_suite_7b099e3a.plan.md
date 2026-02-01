---
name: Add comprehensive test suite
overview: Add real Vitest tests covering utility functions, database operations, Svelte components, server-side logic, authentication flows, and data validation. Replace the placeholder demo.spec.ts with meaningful tests.
todos:
  - id: delete-demo
    content: Delete placeholder demo.spec.ts file
    status: pending
  - id: test-utils-slugify
    content: Create src/lib/utils.spec.ts with tests for slugify() function
    status: pending
  - id: test-slug-utils
    content: Create src/lib/server/db/slug-utils.spec.ts with tests for generateUniqueSlug() and findUniqueSlug()
    status: pending
  - id: test-create-server
    content: Create src/routes/create/+page.server.spec.ts with validation and form helper tests
    status: pending
  - id: test-slug-server
    content: Create src/routes/[slug]/+page.server.spec.ts with answer payload and validation tests
    status: pending
  - id: test-quiz-server
    content: Create src/routes/quizzes/[quizId]/+page.server.spec.ts with soundbite and validation tests
    status: pending
  - id: test-create-component
    content: Create src/routes/create/+page.svelte.spec.ts with component rendering and interaction tests
    status: pending
  - id: test-slug-component
    content: Create src/routes/[slug]/+page.svelte.spec.ts with component rendering tests
    status: pending
  - id: test-hooks-auth
    content: Create src/hooks.server.spec.ts with authentication flow tests
    status: pending
isProject: false
---

# Add Comprehensive Test Suite

This plan adds real Vitest tests across 6 key areas of the application, replacing the placeholder `demo.spec.ts` with meaningful test coverage.

## Test Files to Create

### 1. Utility Function Tests

**File:** `src/lib/utils.spec.ts`

- Test `slugify()` function:
  - Converts text to lowercase
  - Replaces spaces and special characters with hyphens
  - Trims leading/trailing hyphens
  - Handles empty strings
  - Handles special characters and unicode
  - Handles multiple consecutive spaces/special chars

**File:** `src/lib/server/db/slug-utils.spec.ts`

- Test `generateUniqueSlug()`:
  - Returns base slug when available
  - Appends counter when slug exists (quiz-2, quiz-3, etc.)
  - Handles unique constraint violations correctly
  - Respects max retries limit
  - Throws non-constraint errors immediately
- Test `findUniqueSlug()`:
  - Returns base slug if unique
  - Appends counter for existing slugs
  - Excludes quiz ID when updating (excludeQuizId parameter)
  - Handles empty base slug
  - Respects max retries

### 2. Server-Side Logic Tests

**File:** `src/routes/create/+page.server.spec.ts`

- Test form validation helpers:
  - `getSoundbiteValues()` extracts descriptions and files correctly
  - `validateFiles()`:
    - Requires at least one file
    - Validates file size > 0
    - Validates MP3/audio type
    - Returns appropriate error messages
- Test action validation:
  - Requires authentication (401 if no user)
  - Validates title required
  - Validates description required
  - Validates title length <= 200 chars
  - Validates description length <= 2000 chars
  - Validates soundbite descriptions match files count
  - Validates file types

**File:** `src/routes/[slug]/+page.server.spec.ts`

- Test `buildAnswersPayload()`:
  - Extracts soundbite IDs correctly
  - Builds answers object with correct keys
  - Handles missing answers
- Test action validation:
  - Requires displayName for anonymous users
  - Requires at least one answer
  - Validates quiz exists (404 if not found)

**File:** `src/routes/quizzes/[quizId]/+page.server.spec.ts`

- Test `getExistingSoundbites()`:
  - Extracts IDs, descriptions, files, removed flags
- Test `getNewSoundbites()`:
  - Extracts new descriptions and files
- Test `validateFiles()`:
  - Validates when files required vs optional
  - Validates MP3 type
- Test action validation:
  - Requires authentication
  - Validates title and description required
  - Validates soundbite descriptions match IDs
  - Validates new soundbites have matching descriptions/files

### 3. Svelte Component Tests

**File:** `src/routes/create/+page.svelte.spec.ts`

- Test component rendering:
  - Renders form with all fields
  - Shows success message when form.success is true
  - Shows error message when form.message exists
- Test reactive behavior:
  - Auto-generates slug from title
  - Updates slug when title changes (if not manually edited)
  - Preserves manual slug edits
  - Disables submit button when submitting
- Test soundbite management:
  - Can add new soundbite
  - Can remove soundbite (but not last one)
  - Soundbites have unique IDs

**File:** `src/routes/[slug]/+page.svelte.spec.ts`

- Test component rendering:
  - Displays quiz title and description
  - Renders all soundbites with audio players
  - Shows display name input for anonymous users
  - Shows signed-in user info when authenticated
- Test form behavior:
  - Disables submit when submitting
  - Shows error messages
  - Reveals answers after successful submission

### 4. Authentication Flow Tests

**File:** `src/hooks.server.spec.ts`

- Test session handling:
  - Populates `event.locals.user` when session exists
  - Populates `event.locals.session` when session exists
  - Leaves locals empty when no session
  - Calls svelteKitHandler correctly

**File:** `src/routes/create/+page.server.spec.ts` (auth checks)

- Test load function:
  - Redirects unauthenticated users (302)
  - Allows authenticated users through

**File:** `src/routes/quizzes/[quizId]/+page.server.spec.ts` (auth checks)

- Test load function:
  - Redirects unauthenticated users to /login
  - Returns 404 if quiz doesn't exist
  - Returns 404 if quiz belongs to different user
  - Returns quiz data for owner

### 5. Database Operation Tests

**Note:** These tests will require database mocking or a test database setup. For now, focus on testing the logic around database operations rather than actual DB calls.

**File:** `src/lib/server/db/slug-utils.spec.ts` (already covered above)

- Tests the database interaction logic for slug generation

### 6. Data Validation Tests

**File:** `src/routes/create/+page.server.spec.ts` (validation)

- Test input sanitization:
  - Trims whitespace from title, slug, description
  - Handles empty strings correctly
  - Converts form data to strings safely

**File:** `src/routes/[slug]/+page.server.spec.ts` (validation)

- Test answer payload building:
  - Trims answer values
  - Handles missing answers gracefully

## Implementation Details

### Test Setup Requirements

1. **Mocking Strategy:**

- Mock `@vercel/blob` for file upload tests
- Mock database operations using Drizzle's query builder mocks or a test DB
- Mock `$env/dynamic/private` for environment variables
- Mock `@sveltejs/kit` functions (redirect, error, fail)

1. **Test Utilities:**

- Create helper functions for creating mock FormData
- Create helper functions for creating mock RequestEvent
- Create helper functions for creating mock user/session objects

1. **File Organization:**

- Place server-side tests next to their corresponding files (`.spec.ts`)
- Place component tests next to components (`.svelte.spec.ts`)
- Keep utility tests with their utilities

### Files to Modify

- Delete: `src/demo.spec.ts` (placeholder)
- Create: 8 new test files as listed above

### Testing Approach

- **Unit tests** for pure functions (utils, validation helpers)
- **Integration tests** for server actions (with mocked dependencies)
- **Component tests** using `vitest-browser-svelte` for Svelte components
- **Focus on business logic** rather than framework internals

## Testing Priorities

1. **High Priority:** Utility functions (slugify, slug-utils) - pure functions, easy to test
2. **High Priority:** Form validation logic - critical for data integrity
3. **Medium Priority:** Component rendering and interactions
4. **Medium Priority:** Authentication checks
5. **Lower Priority:** Database operation mocks (can be added incrementally)

## Notes

- Tests should use Vitest's built-in mocking capabilities
- For database tests, consider using Drizzle's test utilities or a test database
- Component tests use the browser environment configured in `vite.config.ts`
- Server tests use the Node environment
- All tests should be fast and isolated (no shared state between tests)
