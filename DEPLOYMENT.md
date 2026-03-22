# Deployment Guide - Vercel

## Prerequisites
- GitHub/GitLab repository
- Vercel account (sign up at https://vercel.com)

## Step-by-Step Deployment

### 1. Push Latest Code
```bash
git add .
git commit -m "feat: ready for production deployment"
git push origin develop
```

### 2. Import Project to Vercel

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your repository: `mytoandeptrai/trading-platform`
4. Click "Import"

### 3. Configure Project Settings

**Framework Preset**: Next.js

**Root Directory**: `apps/web` ⚠️ IMPORTANT!
- Click "Edit" next to Root Directory
- Type: `apps/web`
- This tells Vercel to deploy only the web app from the monorepo

**Build & Development Settings**:
- Build Command: `cd ../.. && pnpm turbo build --filter=web`
- Output Directory: `.next` (default)
- Install Command: `pnpm install`

### 4. Environment Variables

Add these environment variables in Vercel dashboard:

```env
# Required
NEXT_PUBLIC_API_URL=your-api-url-here

# Optional - Vercel sets these automatically
NODE_ENV=production
```

**How to add:**
1. Go to Project Settings → Environment Variables
2. Add each variable
3. Select environments: Production, Preview, Development

### 5. Deploy

1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Your app will be live at: `https://your-project.vercel.app`

## Post-Deployment

### Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow Vercel's DNS configuration instructions

### Automatic Deployments
- Every push to `develop` branch = automatic deployment
- Pull requests = preview deployments

### Monitoring
- View logs: Project → Deployments → [Latest] → Runtime Logs
- Analytics: Project → Analytics tab

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify environment variables are set
- Ensure `pnpm` is used (not npm/yarn)

### API Connection Issues
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS settings on backend
- Ensure backend is deployed and accessible

## Monorepo-Specific Notes

Since this is a Turborepo monorepo:
- Only the `apps/web` is deployed to Vercel
- Shared packages (`@repo/ui`, `@repo/database`) are bundled automatically
- Backend (`apps/api`) needs separate deployment (Railway, Heroku, etc.)

## Deploy Backend API

The NestJS API (`apps/api`) should be deployed separately:

**Recommended platforms:**
- Railway (easiest)
- Heroku
- Render
- DigitalOcean App Platform
- AWS/GCP/Azure

Then update `NEXT_PUBLIC_API_URL` in Vercel to point to deployed API.
