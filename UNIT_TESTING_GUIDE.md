# Unit Testing Guide for Snake Oil

## Overview

You've got **67 unit tests** covering 5 critical functions. These aren't trivial tests—they catch real bugs in complex logic that could break your quizzes or create security vulnerabilities.

## Where Tests Live

Tests are **co-located** with the code they test (modern best practice):

```
src/lib/
├── utils.ts                      # Original code
├── utils.test.ts                 # Tests for utils ⭐ NEW
├── variant-display.ts            # Original code
├── variant-display.test.ts       # Tests for variant-display ⭐ NEW
└── server/
    ├── variant-utils.ts          # Original code
    └── variant-utils.test.ts     # Tests for variant-utils ⭐ NEW
```

This makes tests easy to find and encourages developers to write them.

## How to Run Tests

```bash
# Run all tests once (CI mode)
npm run test

# Run tests in watch mode (during development)
npm run test:unit

# Run only server tests (pure utilities)
npm run test:unit -- --project server

# Run a specific test file
npm run test:unit -- src/lib/utils.test.ts

# Run with coverage report
npm run test:unit -- --coverage
```

## What We're Testing (And Why)

### 1. **validateRedirectUrl** (`utils.test.ts`)

**Why it matters:** Prevents attackers from stealing user sessions via malicious redirects.

**What could break:**

- Someone adds support for `//evil.com` (protocol-relative URLs)
- Whitespace handling changed
- Someone allows `javascript:` URLs for "legitimate" use cases

**Key tests:**

- Rejects `http://evil.com`, `https://phishing.com`
- Rejects `//evil.com` (inherits current protocol)
- Rejects `javascript:alert(1)`
- Rejects `/foo:http://evil.com` (colon injection)
- Allows `/dashboard`, `/quiz?id=123`
- Returns default URL when input is invalid

### 2. **calculateKendallTauScore** (`variant-display.test.ts`)

**Why it matters:** Statistical algorithm for ranking questions. A bug gives users wrong scores.

**What could break:**

- Algorithm implementation error
- Edge cases with empty/single-item arrays
- Division by zero

**Key tests:**

- Empty arrays → returns 0
- Different lengths → returns 0
- Perfect match → score 1
- Completely reversed → score 0
- Partial matches → correct math

**What Kendall Tau is:** Counts how many pairs are in the wrong order. If you rank [A,B,C] but correct is [C,A,B], it counts inversions.

### 3. **calculateMultipleMatchScore** (`variant-display.test.ts`)

**Why it matters:** Simple scoring for "match items to positions" questions.

**Key tests:**

- All correct → 100%
- None correct → 0%
- Half correct → 50%
- Rounding behavior

### 4. **getCorrectAnswerText** (`variant-display.test.ts`)

**Why it matters:** Shows users the correct answer after they finish. A bug here shows the WRONG answer.

**What could break:**

- New variant type added but this function not updated
- Edge cases with missing data
- Logic error in a specific variant

**Key tests:**

- **simple_guess:** Joins all correct answers with ", "
- **multiple_choice:** Finds the one correct option
- **multiple_response:** Joins all correct options
- **sequence:** Gets track at correct index
- **rank:** Orders items by correctOrder indices
- **multiple_match:** Joins answerLabels in item order
- **image_choice:** Gets correct option's label
- **Edge cases:** Missing data, empty arrays, invalid indices

### 5. **validateVariantConfig** (`variant-utils.test.ts`)

**Why it matters:** Prevents invalid quiz data from being saved. A bug here could:

- Allow saving quizzes with no correct answers
- Allow malformed data that crashes the app
- Allow duplicate indices in ranking questions

**What we're testing:**

#### Rank Variant (Most Complex)

The `correctOrder` array must be a **valid permutation** of indices.

```typescript
// Valid: [0, 1, 2] for 3 items
// Valid: [2, 0, 1] for 3 items (scrambled)
// Invalid: [0, 0, 2] - duplicate 0, missing 1
// Invalid: [0, 2] - missing 1, wrong length
// Invalid: [0, 1, 5] - 5 is out of range for 3 items
```

**Key tests:**

- Valid rank configs pass
- Too few/many items rejected
- Missing/empty fields rejected
- **Invalid permutations rejected** (this is the critical one)

## Test Structure (Best Practices)

```typescript
describe('functionName', () => {
  describe('specific scenario', () => {
    it('does something specific', () => {
      // Arrange: Set up test data
      const input = { ... };

      // Act: Call the function
      const result = functionName(input);

      // Assert: Check the result
      expect(result).toBe(expected);
    });
  });
});
```

### Why This Structure?

1. **`describe` blocks** group related tests
2. **`it` blocks** describe behavior in plain English
3. **Comments explain** business logic, not code mechanics
4. **One assertion per test** (mostly) makes failures clear

## Adding New Tests

### When to Write Tests

**Always test:**

- Functions with multiple code paths (if/else, switch)
- Functions with edge cases (empty input, malformed data)
- Functions with business logic (scoring, validation)
- Security-sensitive functions (input sanitization)
- Functions used by multiple features

**Don't test:**

- Trivial one-liners (`x => x * 2`)
- Framework code (Svelte, Vitest itself)
- Type-only code (TypeScript interfaces)

### Example: Adding a Test

```typescript
// In src/lib/your-module.test.ts
import { describe, it, expect } from 'vitest';
import { yourFunction } from './your-module';

describe('yourFunction', () => {
	it('handles normal case', () => {
		expect(yourFunction('normal input')).toBe('expected output');
	});

	it('handles empty input', () => {
		expect(yourFunction('')).toBe('default');
	});

	it('handles edge case', () => {
		expect(yourFunction(null)).toBe('default');
	});
});
```

## Test Coverage

To see coverage:

```bash
npm run test:unit -- --coverage
```

This shows:

- Which lines are covered by tests
- Which branches (if/else paths) are tested
- Overall coverage percentage

**Goal:** 80%+ coverage for utility functions, 100% for security-critical code.

## Common Patterns

### Testing Multiple Similar Cases

```typescript
it.each([
	['input1', 'expected1'],
	['input2', 'expected2'],
	['input3', 'expected3']
])('transforms %s to %s', (input, expected) => {
	expect(transform(input)).toBe(expected);
});
```

### Testing Async Functions

```typescript
it('fetches data', async () => {
	const result = await fetchData();
	expect(result).toEqual({ data: 'value' });
});
```

### Testing Errors

```typescript
it('throws on invalid input', () => {
  expect(() => function('bad')).toThrow('error message');
});
```

## Debugging Failed Tests

When a test fails:

1. **Run just that test:**

   ```bash
   npm run test:unit -- src/lib/specific.test.ts -t "test name"
   ```

2. **Add console.log** temporarily:

   ```typescript
   it('test', () => {
     const result = function(input);
     console.log('Result:', result);
     expect(result).toBe(expected);
   });
   ```

3. **Use `.only` to skip other tests:**
   ```typescript
   describe.only('specific suite', () => {
   	// Only these tests run
   });
   ```

## CI/CD Integration

Your tests run automatically on:

- Pull requests
- Before deployments

A failed test blocks deployment. This catches bugs before they reach production.

## Next Steps

Now that you have solid foundations:

1. **Export `checkMultipleResponseCorrect`** from `variant-utils.ts` and add real tests (currently documented but not tested directly)

2. **Add tests for other validators:**
   - `validateSimpleGuess`
   - `validateMultipleChoice`
   - `validateSequence`
   - `validateMultipleMatch`
   - `validateImageChoice`

3. **Test server-side functions:**
   - Permission checking functions
   - Score calculation functions
   - Data transformation functions

4. **Add integration tests** for complete user flows (using your existing Playwright setup)

5. **Set up coverage thresholds** to prevent coverage from dropping

## Resources

- **Vitest docs:** https://vitest.dev/
- **Testing best practices:** https://testing.googleblog.com/
- **Your config:** `vite.config.ts` (shows two test projects: server and client)

---

You've got production-ready unit tests. They're not fluff—they catch real bugs. Run them before every commit and you'll catch issues before your users do.
