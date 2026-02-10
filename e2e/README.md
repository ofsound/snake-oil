# E2E Testing with Playwright

This directory contains end-to-end tests for the Snake Oil application using Playwright.

## Test Structure

```
e2e/
├── fixtures/           # Test files (MP3s, images)
├── helpers/            # Test utility functions
├── tests/              # Test files
│   ├── auth.setup.ts   # Authentication setup
│   ├── create-mega-quiz.spec.ts    # Test 1: Create 7-variant quiz
│   └── submit-mega-quiz.spec.ts    # Test 2: Submit quiz answers
└── README.md
```

## Test Files

- **test-audio.mp3**: Small test MP3 file for audio uploads
- **test-image.png**: Small test PNG file for image uploads

## Running Tests

### 1. Install Playwright Browsers (first time only)

```bash
npx playwright install chromium
```

### 2. Run All E2E Tests

```bash
npm run test:e2e
```

### 3. Run Tests in Headed Mode (see the browser)

```bash
npm run test:e2e:headed
```

### 4. Run Tests with UI Mode (interactive debugging)

```bash
npm run test:e2e:ui
```

### 5. Run a Specific Test File

```bash
npx playwright test e2e/tests/create-mega-quiz.spec.ts
```

### 6. Run Tests in Debug Mode

```bash
npx playwright test --debug
```

## Test Scenarios

### Test 1: Create Mega Quiz

Creates a quiz with all 7 soundbite variant types:

1. Simple Guess - Text answer
2. Multiple Choice - Radio button selection
3. Multiple Response - Checkbox selection
4. Sequence - Buzz the correct track
5. Rank - Drag-and-drop ordering
6. Multiple Match - Drag-and-drop matching
7. Image Choice - Select from images

Each question includes file uploads (MP3s and images).

### Test 2: Submit Mega Quiz

Takes the created quiz and:

- Answers all questions correctly (perfect score test)
- Answers some questions incorrectly (partial score test)
- Verifies score calculation and results display

## Environment Variables

The tests use environment variables from your `.env` file:

- `DATABASE_URL` - Database connection
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage
- `BETTER_AUTH_SECRET` - Auth secret
- `PUBLIC_BETTER_AUTH_BASE_URL` - Auth base URL

## Authentication

Tests use a test user that's created during the setup phase (`auth.setup.ts`). The session is stored in `playwright/.auth/user.json` and reused across tests for efficiency.

## Troubleshooting

### Tests fail to start

- Ensure your development server can start: `npm run dev`
- Check that all environment variables are set
- Verify the database is accessible

### File upload failures

- Check that `BLOB_READ_WRITE_TOKEN` is set correctly
- Verify test fixtures exist in `e2e/fixtures/`

### Authentication failures

- Check Better Auth configuration
- Ensure the signup form fields match the test expectations

## CI/CD Integration

For CI environments, the tests will:

1. Start the dev server automatically
2. Run in headless mode
3. Retry failed tests up to 2 times
4. Generate HTML reports in `playwright-report/`

## Adding New Tests

1. Create a new `.spec.ts` file in `e2e/tests/`
2. Import helpers from `e2e/helpers/` as needed
3. Use the test fixtures for file uploads
4. Follow the existing test patterns for consistency
