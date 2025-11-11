# Complete Setup Guide for PortunCmd

## Issues You're Experiencing

1. ❌ Login not working (no redirect, no error messages)
2. ❌ Forgot password giving error messages
3. ❌ Dashboard/CRM not accessible

## Root Cause

**Missing `.env` file with Supabase credentials!**

Without proper Supabase configuration, the app uses placeholder values which prevents authentication from working.

---

## Step 1: Create .env File

Create a file named `.env` in the root of your project:

```bash
# In your project root (PortunCmd/)
touch .env
```

Add the following content to your `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://data.portun.app
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

### How to Get Your Supabase Keys

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → Use as `VITE_SUPABASE_URL`
   - **anon public** key → Use as `VITE_SUPABASE_ANON_KEY`

---

## Step 2: Configure Email Settings in Supabase (Required for Password Reset)

This is **REQUIRED** for the forgot password feature to work!

### A. Enable Email Confirmations

1. Go to **Authentication** → **URL Configuration** in Supabase
2. Set **Site URL** to your domain:
   - Local: `http://localhost:5173`
   - Production: `https://yourdomain.com`
3. Add **Redirect URLs**:
   - `http://localhost:5173/*` (for local development)
   - `https://yourdomain.com/*` (for production)

### B. Configure Email Template

1. Go to **Authentication** → **Email Templates** in Supabase
2. Select **Reset Password** template
3. Make sure the template is enabled
4. The reset link should redirect to: `/forgot-password?reset=true`

### C. Configure SMTP (Optional but Recommended for Production)

For production, you should set up custom SMTP:

1. Go to **Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Add your SMTP server details (e.g., Gmail, SendGrid, AWS SES)
4. This prevents emails from going to spam

### D. Authorize Your Domains

1. Go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add all domains:
   ```
   http://localhost:5173/*
   https://yourdomain.com/*
   ```

---

## Step 3: Create Test Users

To test login, you need users in Supabase:

### Option 1: Via Supabase Dashboard (Easiest)

1. Go to **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Fill in:
   - Email: `test@example.com`
   - Password: `password123`
   - Auto Confirm User: **✓ Check this box!**
4. Click **Create User**

### Option 2: Via SQL Editor

Run this SQL in your Supabase SQL Editor:

```sql
-- This will create a user profile automatically via trigger
-- Just create the auth user first via Supabase Dashboard

-- If you need to manually create a profile:
INSERT INTO profile (id, email, display_name, enabled)
VALUES (
  'USER_ID_FROM_AUTH_USERS_TABLE',
  'test@example.com',
  'Test User',
  true
);

-- Assign a role (get role ID first)
SELECT id, role_name FROM role;

-- Then insert into profile_role
INSERT INTO profile_role (profile_id, role_id)
VALUES (
  'USER_PROFILE_ID',
  'ROLE_ID_FROM_ABOVE_QUERY'
);
```

---

## Step 4: Restart Your Development Server

After creating the `.env` file:

```bash
# Stop current server (if running)
# Press Ctrl+C in the terminal

# Start server again
pnpm dev
```

---

## Step 5: Test Everything

### Test Login

1. Go to http://localhost:5173/login
2. Enter test credentials
3. **Expected:**
   - ✅ Valid credentials → Redirects to dashboard
   - ❌ Invalid credentials → Shows red error "Invalid login credentials"
   - ❌ No redirect on failed login

### Test Forgot Password

1. Go to http://localhost:5173/forgot-password
2. Enter a valid email
3. Click "Send Reset Link"
4. **Expected:**
   - ✅ Green success message appears
   - ✅ Check your email for reset link
   - ✅ Click link → Redirects to reset password page

### Test Dashboard Access

1. After successful login
2. Navigate to http://localhost:5173/dashboards/crm
3. **Expected:**
   - ✅ Page loads without hanging
   - ✅ Shows dashboard content

---

## Common Issues & Solutions

### Issue: "Network error" on forgot password
**Solution:** Set up email configuration in Supabase (Step 2)

### Issue: Login not redirecting
**Solution:** Check that `.env` file has correct Supabase credentials

### Issue: "Invalid login credentials" not translating
**Solution:** Already fixed in latest commit (restart server)

### Issue: Emails going to spam
**Solution:** Configure custom SMTP in Supabase settings

### Issue: "User not found" error
**Solution:** Create test users in Supabase (Step 3)

### Issue: Dashboard shows blank page
**Solution:** Check browser console for errors, verify user has roles assigned

---

## Production Deployment

When deploying to production (remote server):

### 1. Set Environment Variables

Add these to your hosting provider's environment variables:

```env
VITE_SUPABASE_URL=https://data.portun.app
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
```

### 2. Update Supabase URLs

In Supabase Dashboard:

1. **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://yourproductiondomain.com`
3. Add redirect URL: `https://yourproductiondomain.com/*`

### 3. Build and Deploy

```bash
# Build for production
pnpm build

# Deploy the 'dist' folder to your server
```

---

## Quick Checklist

- [ ] Create `.env` file with Supabase credentials
- [ ] Get Supabase URL and anon key from dashboard
- [ ] Configure Site URL in Supabase
- [ ] Add redirect URLs in Supabase
- [ ] Enable email reset template in Supabase
- [ ] Create test users in Supabase Auth
- [ ] Restart development server
- [ ] Test login with valid/invalid credentials
- [ ] Test forgot password flow
- [ ] Test dashboard access after login

---

## Need Help?

If you're still experiencing issues:

1. Check browser console for errors (F12)
2. Check terminal/server logs
3. Verify Supabase project is not paused
4. Confirm email in Supabase is verified
5. Check that profile.enabled = true in database

---

## Summary for Your Current Issue

**Why login isn't working:**
- No `.env` file → App uses placeholder Supabase client
- Can't authenticate users without real Supabase connection

**Why forgot password gives error:**
- Need to configure email settings in Supabase
- Need to authorize your domain (localhost + production domain)

**Next steps:**
1. Create `.env` file (most important!)
2. Add your Supabase credentials
3. Configure email in Supabase dashboard
4. Restart server
5. Test login and forgot password

**Yes, you DO need to authorize domains in Supabase for emails to work!** ✅

