# Google OAuth Setup Guide

## Overview
Google OAuth sign-in has been implemented for ClawHQ. You need to create a Google Cloud project and OAuth application to get the required credentials.

## Backend Implementation Complete ✅
- ✅ Google OAuth strategy using passport-google-oauth20
- ✅ `/api/auth/google` route for initiating OAuth
- ✅ `/api/auth/google/callback` route for handling callbacks
- ✅ User creation/linking with Google accounts
- ✅ JWT token generation after successful auth

## Frontend Implementation Complete ✅
- ✅ "Continue with Google" button on login page
- ✅ OAuth callback page at `/auth/callback`
- ✅ Token handling and storage
- ✅ Automatic login after successful OAuth

## Required: Google Cloud Setup

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Enter project name: "ClawHQ" or similar
4. Click "Create"

### Step 2: Enable Google+ API
1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google+ API" or "People API"
3. Click on it and press "Enable"

### Step 3: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. If prompted, configure OAuth consent screen first:
   - Choose "External" user type
   - Fill in app name: "ClawHQ"
   - User support email: your email
   - App logo: optional
   - App domain: `clawhq.dev`
   - Authorized domains: `clawhq.dev`
   - Scopes: Add `email`, `profile`, `openid`
   - Test users: Add your email for testing

4. Back to OAuth client creation:
   - Application type: "Web application"
   - Name: "ClawHQ Web Client"
   - Authorized JavaScript origins: `https://clawhq.dev`
   - Authorized redirect URIs: `https://clawhq-backend.railway.app/api/auth/google/callback`

### Step 4: Update Environment Variables
Copy the Client ID and Client Secret from Google Cloud Console and update your backend `.env` file:

```env
GOOGLE_CLIENT_ID=your_actual_client_id_here
GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
```

## Testing
1. Deploy the updated backend to Railway
2. Deploy the updated frontend to Vercel
3. Visit `https://clawhq.dev/login`
4. Click "Continue with Google"
5. Should redirect to Google, ask for permissions, then redirect back to ClawHQ dashboard

## Security Notes
- Keep Google Client Secret secure and never commit to version control
- Add only your actual domains to authorized origins/redirects
- For local development, add `http://localhost:3001` and `http://localhost:5173`

## Backend Deployment Note
Make sure to set the environment variables in your Railway deployment:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `BACKEND_URL` (should be your Railway backend URL)

The Google OAuth implementation is now complete and ready for use once you add the real credentials!