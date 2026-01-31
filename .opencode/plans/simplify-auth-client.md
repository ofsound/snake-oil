# Simplify auth-client.ts wrapper

## Current State (51 lines)

The file has a 35-line type-safe wrapper with:

- Complex type definitions (SessionData, SessionStore, UseSessionOptions)
- Extensive JSDoc comments explaining the workaround
- Type assertion through interface casting
- Multiple layers of type conversion

## Simplified Version (5 lines)

Replace the entire wrapper section with:

```typescript
/**
 * Wrapper for useSession that accepts initial server-side session data.
 *
 * Better Auth's useSession accepts initial data at runtime, but TypeScript types
 * don't reflect this yet. Using `as any` is a pragmatic workaround.
 */
export function useSessionWithInitialData(initialData: { session: unknown; user: unknown } | null) {
	return authClient.useSession({ data: initialData as any });
}
```

## Benefits

1. **73% reduction** in code (35 lines → 5 lines)
2. **No runtime change** - function behaves identically
3. **More maintainable** - simple type assertion vs complex interface gymnastics
4. **Clear intent** - the comment explains why `as any` is acceptable
5. **Easier to update** when Better Auth fixes their types

## Trade-offs

- **Slightly less type safety** - but the types weren't accurate anyway
- **Uses `any`** - but it's localized and documented

## Files to Update

- `/Users/ben/Dev/SVELTE/snake-oil-private/src/lib/auth-client.ts` (lines 16-50)

## Verification Steps

1. TypeScript should still compile without errors
2. All existing usages of `useSessionWithInitialData` should continue working
3. No runtime behavior changes expected
