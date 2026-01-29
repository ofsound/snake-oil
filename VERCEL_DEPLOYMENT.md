# Vercel Deployment Guide for snake-oil with Better Auth

## 🚀 Quick Deploy Steps

### 1. Generate Better Auth Secret

```bash
openssl rand -base64 32
```

### 2. Add Environment Variables in Vercel Dashboard

Add these to your Vercel project settings → Environment Variables:

```
DATABASE_URL=postgresql://neondb_owner:npg_tgpxFvPnkM19@ep-long-star-af5uy9vx-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
VITE_NEON_AUTH_URL=https://ep-long-star-af5uy9vx.neonauth.c-2.us-west-2.aws.neon.tech/neondb/auth
BETTER_AUTH_SECRET=your-generated-secret-here
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_jgWOsEsbQL1isLZ5_DIRKvj4PFF96pYxibVlN0V9eEtJFcb
```

### 3. Deploy to Vercel

```bash
npm run build
vercel --prod
```

## 🔧 What's Configured

- ✅ **Option A - Direct Neon Auth**: Using absolute production auth URL
- ✅ **Database**: Neon PostgreSQL via Drizzle adapter
- ✅ **Auth Routes**: Handled by Neon Auth service directly
- ✅ **Environment**: Production-ready configuration
- ✅ **Vercel Config**: Pre-configured for SvelteKit deployment

## 📝 Local vs Production URLs

**Development**: `http://localhost:5173` (comment out production URL in .env)
**Production**: `https://your-app.vercel.app` (uncomment production URL in .env)

## 🛡️ Security Notes

- Better Auth Secret is required for production
- All environment variables should be set in Vercel dashboard
- No localhost URLs in production deployment

## 🎯 After Deployment

1. Test sign-up/sign-in flows at `https://your-app.vercel.app`
2. Verify session persistence across page refreshes
3. Test server-side authentication (SSR)
4. Monitor Vercel logs for any auth-related errors

---
