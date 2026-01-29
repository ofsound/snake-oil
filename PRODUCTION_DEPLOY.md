# Production Deployment Instructions

## 🚀 Deploy to Vercel (Option A - Direct Neon Auth)

### Step 1: Generate Better Auth Secret

```bash
openssl rand -base64 32
```

### Step 2: Update Environment

Comment out localhost URL and add production auth URL in `.env`:

```env
DATABASE_URL="postgresql://neondb_owner:npg_tgpxFvPnkM19@ep-long-star-af5uy9vx-pooler.c-2.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Production auth URL (uncomment for deploy)
VITE_NEON_AUTH_URL="https://ep-long-star-af5uy9vx.neonauth.c-2.us-west-2.aws.neon.tech/neondb/auth"

# Development auth URL (comment out for production)
# VITE_NEON_AUTH_URL="http://localhost:5173"

BLOB_READ_WRITE_TOKEN="vercel_blob_rw_jgWOsEsbQL1isLZ5_DIRKvj4PFF96pYxibVlN0V9eEtJFcb"

# Add generated secret here
BETTER_AUTH_SECRET="your-generated-secret"
```

### Step 3: Deploy

```bash
npm run build
vercel --prod
```

### Step 4: Configure Vercel Environment

In Vercel dashboard, add these environment variables:

- `DATABASE_URL` (copy from .env)
- `VITE_NEON_AUTH_URL` (copy from .env)
- `BETTER_AUTH_SECRET` (your generated secret)
- `BLOB_READ_WRITE_TOKEN` (copy from .env)

## ✅ What's Prepared for Production

- **✅ Environment Variables**: Production-ready auth URL
- **✅ Vercel Config**: Optimized for SvelteKit deployment
- **✅ Security**: Better Auth secret support
- **✅ Documentation**: Complete deployment guide created

## 🔒 Security for Production

1. **Never commit secrets** to git
2. **Use Vercel dashboard** for all production environment variables
3. **Generate unique secret** for this deployment
4. **Test thoroughly** after deployment

## 📝 Post-Deployment Testing

1. Visit your deployed site
2. Test sign-up flow
3. Test sign-in flow
4. Test session persistence
5. Test server-side rendering (refresh page)
6. Check browser compatibility

## 🚨 Troubleshooting

If auth doesn't work in production:

1. **Check environment variables** in Vercel dashboard
2. **Verify Neon Auth URL** is accessible
3. **Check CORS** settings in Neon Console
4. **Review Vercel logs** for errors
5. **Test manually** with curl: `curl https://your-app.vercel.app/auth/session`
