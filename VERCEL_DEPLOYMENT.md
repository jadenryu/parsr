# Vercel Frontend Deployment Guide

## Prerequisites
- Vercel account (sign up at vercel.com)
- GitHub account with your repository
- Backend API deployed on Railway (get the URL from Railway dashboard)

## Step 1: Environment Variables Setup

Before deploying, you need to configure these environment variables in Vercel:

### Required Environment Variables:
```
NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app
```

Replace `your-railway-app.railway.app` with your actual Railway deployment URL.

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Select the `parsr-web` folder as the root directory
5. Vercel will auto-detect it's a Next.js project
6. Add environment variables:
   - Go to "Environment Variables" section
   - Add `NEXT_PUBLIC_API_URL` with your Railway backend URL
7. Click "Deploy"

### Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd parsr-web

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Y
# - Which scope? [your account]
# - Link to existing project? N
# - What's your project's name? parsr-web
# - In which directory is your code located? ./
```

## Step 3: Configure Environment Variables (CLI method)
```bash
# Add environment variables
vercel env add NEXT_PUBLIC_API_URL
# Enter your Railway URL when prompted

# Redeploy with new environment variables
vercel --prod
```

## Step 4: Custom Domain (Optional)
1. In Vercel dashboard, go to your project
2. Click "Domains" tab
3. Add your custom domain
4. Follow DNS configuration instructions

## Step 5: Verify Deployment

After deployment, test these endpoints:
- Frontend: `https://your-app.vercel.app`
- API connection: Check network tab for calls to your Railway backend

## Build Configuration

Vercel will automatically use these settings:
- **Framework**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

## Troubleshooting

### Build Fails
- Check `package.json` dependencies
- Ensure all environment variables are set
- Check build logs in Vercel dashboard

### API Connection Issues
- Verify `NEXT_PUBLIC_API_URL` is correct
- Check CORS settings in your Railway backend
- Test backend URL directly in browser

### Environment Variables Not Working
- Ensure variables start with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding environment variables
- Check variables are visible in Vercel dashboard

## Production Checklist
- [ ] Backend deployed on Railway
- [ ] Environment variables configured
- [ ] Frontend deployed on Vercel
- [ ] API calls working between frontend and backend
- [ ] Custom domain configured (if needed)
- [ ] CORS properly configured in backend
- [ ] All features tested in production

## Quick Commands Reference
```bash
# Local development
npm run dev

# Build for production
npm run build

# Start production server locally
npm start

# Deploy to Vercel
vercel --prod
```

## Support
- Vercel Documentation: https://vercel.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Check deployment logs in Vercel dashboard for detailed error information