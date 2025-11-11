# Complete Setup Guide for PortunCmd

This comprehensive guide will walk you through setting up PortunCmd from scratch, including Supabase configuration, authentication, and testing.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Step 1: Environment Setup](#step-1-environment-setup)
- [Step 2: Supabase Configuration](#step-2-supabase-configuration)
- [Step 3: Create Test Users](#step-3-create-test-users)
- [Step 4: Start Development](#step-4-start-development)
- [Step 5: Test Features](#step-5-test-features)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js v18 or higher installed
- ✅ pnpm package manager installed
- ✅ Supabase account created
- ✅ Project cloned to your local machine

## Step 1: Environment Setup

### 1.1 Create .env File

In your project root directory, create a `.env` file:

```bash
cp .env.example .env
```

### 1.2 Get Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create a new one)
3. Navigate to **Settings** → **API**
4. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### 1.3 Configure .env File

Open `.env` and add your credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

> ⚠️ **Important:** Never commit `.env` to version control!

## Step 2: Supabase Configuration

### 2.1 Configure Authentication URLs

This is **required** for authentication and password reset to work:

1. Go to **Authentication** → **URL Configuration** in Supabase
2. Set **Site URL**:
   - For development: `http://localhost:5173`
   - For production: Your actual domain

3. Add **Redirect URLs** (click "Add URL" for each):
   ```
   http://localhost:5173/*
   http://localhost:5173/login
   http://localhost:5173/forgot-password
   ```

   > 💡 The wildcard `/*` pattern allows all routes under that domain

### 2.2 Configure Email Templates

1. Go to **Authentication** → **Email Templates**
2. Select **Reset Password**
3. Ensure it's **enabled**
4. Verify the template contains:
   ```
   {{ .SiteURL }}/forgot-password?reset=true&token={{ .Token }}
   ```

### 2.3 (Optional) Configure Custom SMTP

For production, custom SMTP ensures reliable email delivery:

1. Go to **Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Enable **Custom SMTP**
4. Add your SMTP provider details (Gmail, SendGrid, AWS SES, etc.)

**Example - Gmail Configuration:**
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Password: your-app-password
Sender Email: your-email@gmail.com
Sender Name: PortunCmd
```

> 📧 For Gmail, create an [App Password](https://support.google.com/accounts/answer/185833) instead of using your regular password.

## Step 3: Create Test Users

You need at least one user to test authentication.

### Method 1: Via Supabase Dashboard (Easiest)

1. Go to **Authentication** → **Users**
2. Click **Add User** or **Create User**
3. Fill in:
   - **Email:** `admin@example.com` (or any email)
   - **Password:** Choose a secure password
   - **Auto Confirm User:** ✅ **Check this box!**
4. Click **Create User**

### Method 2: Via SQL (Advanced)

If you need to create profiles manually:

```sql
-- First create user via Supabase Dashboard (Authentication → Users)
-- Then create the profile:

INSERT INTO profile (id, email, display_name, enabled)
VALUES (
  'USER_ID_FROM_AUTH_USERS',  -- Get this from Authentication → Users
  'admin@example.com',
  'Admin User',
  true
);

-- Assign a role (optional):
SELECT id, role_name FROM role;  -- Get available roles

INSERT INTO profile_role (profile_id, role_id)
VALUES (
  'USER_PROFILE_ID',  -- Profile ID from above
  'ROLE_ID'           -- Role ID from SELECT query
);
```

## Step 4: Start Development

### 4.1 Install Dependencies

```bash
pnpm install
```

### 4.2 Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

> 💡 If port 5173 is in use, Vite will automatically use port 5174, 5175, etc.

## Step 5: Test Features

### 5.1 Test Login

1. Navigate to http://localhost:5173/login
2. Enter your test user credentials
3. Click **Login**

**Expected Results:**
- ✅ Successful login redirects to `/dashboards/crm`
- ✅ Invalid credentials show red error message
- ✅ No redirect on failed login

### 5.2 Test Password Reset

1. Navigate to http://localhost:5173/forgot-password
2. Enter a valid email address
3. Click **Send Reset Link**

**Expected Results:**
- ✅ Green success message appears
- ✅ Email received (check spam folder)
- ✅ Click link in email → Redirects to reset password page

### 5.3 Test Dashboard Access

After successful login:

1. Navigate to http://localhost:5173/dashboards/crm
2. Verify the dashboard loads correctly

**Expected Results:**
- ✅ Dashboard displays without errors
- ✅ Charts and widgets render properly
- ✅ Navigation menu works

### 5.4 Test Multi-Language

1. Look for the language dropdown in the top bar
2. Switch between English, Spanish, and Portuguese
3. Verify translations update

**Expected Results:**
- ✅ UI text changes when language is switched
- ✅ Language preference persists on page reload

## Production Deployment

### Cloudflare Pages Deployment

#### 1. Set Environment Variables in Cloudflare

1. Go to Cloudflare Dashboard
2. Select your Pages project
3. Go to **Settings** → **Environment Variables**
4. Add for **Production**:
   ```
   VITE_SUPABASE_URL = https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY = your_anon_key
   ```

#### 2. Update Supabase URLs for Production

1. Go to Supabase **Authentication** → **URL Configuration**
2. Update **Site URL** to your production domain:
   ```
   https://your-site.pages.dev
   ```

3. Add production **Redirect URLs**:
   ```
   https://your-site.pages.dev/*
   https://your-site.pages.dev/login
   https://your-site.pages.dev/forgot-password
   ```

   > 💡 Keep localhost URLs for local development!

#### 3. Deploy

```bash
# Commit and push your changes
git add .
git commit -m "Deploy to production"
git push origin main
```

Cloudflare Pages will automatically build and deploy your application.

#### 4. Test Production

After deployment completes:
- ✅ Test login on production URL
- ✅ Test password reset emails
- ✅ Verify dashboard loads correctly

For detailed Cloudflare setup, see [Cloudflare Setup Guide](./CLOUDFLARE_SETUP.md).

### Other Hosting Platforms

The `dist/` folder can be deployed to:
- **Vercel**
- **Netlify**
- **AWS S3 + CloudFront**
- **Any static hosting service**

Build command: `pnpm build`
Output directory: `dist`

## Troubleshooting

### Login Issues

#### Problem: Login not working / staying on login page

**Solutions:**
1. Verify `.env` file exists and has correct credentials
2. Restart development server after creating/updating `.env`
3. Check browser console for errors (F12)
4. Verify Supabase project is not paused
5. Check that user exists in Supabase Authentication → Users

#### Problem: "Invalid login credentials" error

**Solutions:**
1. Verify email and password are correct
2. Check that user is confirmed (Email Confirmed = true in Supabase)
3. Verify profile exists in `profile` table with matching user ID
4. Check `profile.enabled = true` in database

### Password Reset Issues

#### Problem: Password reset emails not sending

**Solutions:**
1. Verify Site URL is configured in Supabase
2. Add your domain to Redirect URLs (with `/*`)
3. Check email template is enabled
4. Configure custom SMTP for production
5. Check Supabase logs: Dashboard → Logs → Auth Logs

#### Problem: Reset link redirects to wrong URL

**Solution:**
- Site URL in Supabase is incorrect
- Update to match your current environment (localhost or production domain)

### Dashboard Issues

#### Problem: Dashboard shows blank page

**Solutions:**
1. Check browser console for errors
2. Verify user has roles assigned in `profile_role` table
3. Check that roles are enabled in `role` table
4. Clear browser cache and cookies

#### Problem: Navigation not working

**Solutions:**
1. Check Vue Router is properly configured
2. Verify file-based routing is working (`src/pages/` structure)
3. Check browser console for routing errors

### Database Issues

#### Problem: "Profile not found" error

**Solutions:**
1. Create profile in `profile` table with user ID from auth
2. Set `profile.enabled = true`
3. Verify profile ID matches Supabase Auth user ID

#### Problem: "Permission denied" errors

**Solutions:**
1. Check Row Level Security (RLS) policies in Supabase
2. Verify anon key has proper permissions
3. Check table permissions in Supabase

### Build Issues

#### Problem: TypeScript errors during build

**Solutions:**
1. Run `pnpm typecheck` to identify errors
2. Fix type errors in reported files
3. Ensure all required types are imported

#### Problem: Build succeeds but app doesn't work in production

**Solutions:**
1. Verify environment variables are set in hosting platform
2. Check browser console for errors
3. Verify API URLs are correct for production
4. Redeploy after setting environment variables

## Common Configuration Mistakes

### ❌ Mistake 1: Missing .env file
**Fix:** Create `.env` from `.env.example` and add Supabase credentials

### ❌ Mistake 2: Forgot to restart server after creating .env
**Fix:** Stop server (Ctrl+C) and run `pnpm dev` again

### ❌ Mistake 3: Wrong Supabase URL in .env
**Fix:** Copy exact URL from Supabase Dashboard → Settings → API

### ❌ Mistake 4: Redirect URLs not configured
**Fix:** Add all URLs (with `/*`) in Supabase Authentication → URL Configuration

### ❌ Mistake 5: User not confirmed
**Fix:** Check "Auto Confirm User" when creating users, or verify email manually

### ❌ Mistake 6: Missing profile in database
**Fix:** Profile should be auto-created, but verify in `profile` table

## Quick Checklist

Use this checklist to ensure everything is configured:

- [ ] `.env` file created with Supabase credentials
- [ ] Dependencies installed (`pnpm install`)
- [ ] Site URL configured in Supabase
- [ ] Redirect URLs added (localhost + production)
- [ ] Email templates enabled
- [ ] Test user created and confirmed
- [ ] Development server started
- [ ] Login tested successfully
- [ ] Password reset tested (email received)
- [ ] Dashboard loads correctly

## Need Help?

If you're still experiencing issues:

1. **Check browser console** (F12 → Console tab)
2. **Check server logs** (terminal running `pnpm dev`)
3. **Check Supabase logs** (Dashboard → Logs)
4. **Verify all steps** in this guide were completed
5. **Review error messages** carefully - they often indicate the exact issue

### Useful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vue 3 Documentation](https://vuejs.org)
- [Vuetify Documentation](https://vuetifyjs.com)
- [Vite Documentation](https://vitejs.dev)

---

**Setup complete! 🎉** You're ready to start developing with PortunCmd.

For more guides, check:
- [Getting Started](./GETTING_STARTED.md) - Development workflow
- [Authentication](./AUTHENTICATION.md) - User management details
- [Supabase Usage](./SUPABASE_USAGE.md) - Code examples
- [Cloudflare Setup](./CLOUDFLARE_SETUP.md) - Production deployment
