# Vercel + ngrok Setup Instructions

This guide explains how to configure your Vercel deployment to work with your local FastAPI backend via ngrok.

## Problem

When you deploy your Next.js frontend to Vercel, it tries to connect to `localhost:8000` for the FastAPI backend, but localhost doesn't exist on Vercel's servers. You need to configure Vercel to use your ngrok tunnel URL.

## Solution

### Step 1: Start Your Local FastAPI Backend

```bash
# Navigate to your backend directory
cd /Users/jadenryu/Documents/parsr/llm_stuff

# Start the FastAPI server (make sure it's running on port 8000)
python3 search_api.py
```

Your FastAPI server should be running at `http://localhost:8000`

### Step 2: Set Up ngrok Tunnel

1. **Install ngrok** (if not already installed):
   ```bash
   # Using Homebrew
   brew install ngrok

   # Or download from https://ngrok.com/download
   ```

2. **Start ngrok tunnel**:
   ```bash
   ngrok http 8000
   ```

3. **Copy the HTTPS URL** from ngrok output:
   ```
   Forwarding    https://abc123.ngrok.io -> http://localhost:8000
   ```
   Copy this URL: `https://abc123.ngrok.io`

### Step 3: Configure Vercel Environment Variable

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** tab
4. Click **Environment Variables**
5. Add a new environment variable:
   - **Name**: `FASTAPI_URL`
   - **Value**: `https://your-ngrok-subdomain.ngrok.io` (without trailing slash)
   - **Environment**: Select "Production", "Preview", and "Development"
6. Click **Save**
7. **Redeploy** your application (go to Deployments tab and redeploy latest)

#### Option B: Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Add environment variable
vercel env add FASTAPI_URL

# When prompted, enter your ngrok URL: https://your-ngrok-subdomain.ngrok.io
# Select all environments (production, preview, development)

# Redeploy
vercel --prod
```

### Step 4: Test the Configuration

1. **Check Vercel Logs**:
   - Go to your Vercel project dashboard
   - Click on the latest deployment
   - Check the "Functions" tab for any error logs

2. **Test API Connection**:
   - Visit your deployed Vercel app
   - Try a search query
   - If there are errors, check the Vercel function logs for connection details

### Step 5: Local Development with ngrok (Optional)

If you want to test ngrok locally before deploying:

1. **Update your local `.env.local`**:
   ```
   # Comment out localhost and use ngrok URL
   # FASTAPI_URL=http://localhost:8000
   FASTAPI_URL=https://your-ngrok-subdomain.ngrok.io
   ```

2. **Restart your Next.js dev server**:
   ```bash
   npm run dev
   ```

3. **Test locally** to ensure ngrok tunnel works

## Important Notes

### ngrok URL Changes
- **Free ngrok URLs change** every time you restart ngrok
- You'll need to update the Vercel environment variable each time
- Consider upgrading to ngrok Pro for static domains

### Security Considerations
- ngrok tunnels are publicly accessible
- Don't expose sensitive data through your FastAPI endpoints
- Consider adding authentication if needed

### Alternative Solutions

#### Option 1: Deploy FastAPI to a Cloud Service
Instead of using ngrok, deploy your FastAPI backend to:
- Railway: https://railway.app
- Heroku: https://heroku.com
- DigitalOcean App Platform
- Google Cloud Run

#### Option 2: Use ngrok Static Domains (Paid)
- Upgrade to ngrok Pro
- Get a static domain that doesn't change
- Set it once in Vercel environment variables

## Troubleshooting

### Common Errors

1. **ECONNREFUSED Error**:
   - Check if FastAPI server is running
   - Verify ngrok tunnel is active
   - Ensure Vercel environment variable is set correctly

2. **404 Not Found**:
   - Verify ngrok URL is correct
   - Check if FastAPI endpoints are working locally

3. **Timeout Errors**:
   - ngrok free tier has usage limits
   - Check ngrok dashboard for tunnel status

### Debug Steps

1. **Check Vercel Environment Variables**:
   ```bash
   vercel env ls
   ```

2. **Test ngrok URL directly**:
   ```bash
   curl https://your-ngrok-subdomain.ngrok.io/health
   ```

3. **Check Vercel Function Logs**:
   - Go to Vercel dashboard → Project → Functions
   - Look for connection attempt logs

## Quick Start Checklist

- [ ] FastAPI server running on localhost:8000
- [ ] ngrok tunnel active and HTTPS URL copied
- [ ] Vercel environment variable `FASTAPI_URL` set to ngrok URL
- [ ] Vercel app redeployed after setting environment variable
- [ ] Test search functionality on deployed app

## Support

If you encounter issues:
1. Check Vercel function logs for detailed error messages
2. Verify ngrok tunnel is active: `ngrok status`
3. Test FastAPI directly: `curl http://localhost:8000/health`
4. Ensure environment variable is set: Check Vercel dashboard