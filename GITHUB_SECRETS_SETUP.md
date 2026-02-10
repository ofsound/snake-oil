# GitHub Secrets Setup for E2E Tests

## What You Need to Add

Go to: `https://github.com/ofsound/snake-oil/settings/secrets/actions`

Add these **Repository Secrets**:

### Required Secrets

```
DATABASE_URL
BETTER_AUTH_SECRET
BLOB_READ_WRITE_TOKEN
```

## ⚠️ CRITICAL: Use a Test Database!

**DO NOT use your production database for CI tests!**

Your e2e tests create real quizzes, users, and submissions. You don't want test data polluting your production database.

### Option 1: Create a Separate Test Database (Recommended)

1. Go to your [Neon dashboard](https://neon.tech)
2. Create a new database (e.g., `snakeoil-test`)
3. Copy the connection string
4. Use that for `DATABASE_URL` in GitHub secrets

### Option 2: Use a Database Branch

Neon supports database branching - create a branch for testing.

### Option 3: Same Database, Different Schema (Advanced)

Configure tests to use a separate schema, then clean it up after.

## What Values to Use

### DATABASE_URL

```
postgresql://user:password@host/dbname?sslmode=require
```

### BETTER_AUTH_SECRET

```
qx+gdi30J181eFuIIiZFPiWrps5HhFYWESbxq12mNWE=
```

(Your existing secret - same for test is fine)

### BLOB_READ_WRITE_TOKEN

```
vercel_blob_rw_...
```

(Your existing Vercel blob token)

## After Adding Secrets

1. Push any commit to trigger CI
2. Go to Actions tab to watch it run
3. e2e tests will run after unit tests pass
4. Should take ~2-3 minutes total

## Troubleshooting

**If e2e tests fail:**

- Check the Actions logs for specific errors
- Make sure the test database is accessible from GitHub's IPs
- Verify all secrets are set correctly
- Check if test data cleanup is working

**Test data cleanup:**
Your `e2e/global-teardown.ts` should clean up test users, but you might need to periodically clean up test quizzes manually or add cleanup logic.

## Cost Considerations

- GitHub Actions: 2,000 minutes/month free (your tests run in ~3 mins, so ~600 runs/month)
- Neon database: Free tier has limits, monitor usage
- Vercel Blob: Charges for storage, test files get uploaded

## Alternative: Skip E2E in CI

If setup is too complex right now, just run e2e locally before major releases:

```bash
npm run test:e2e
```

But having it in CI means you'll catch integration bugs immediately!
