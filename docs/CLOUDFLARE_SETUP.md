# Cloudflare Production Setup for Supabase

## Issue
✅ Localhost works for password reset emails  
❌ Cloudflare-hosted site doesn't send emails

## Root Cause
Your production domain is not authorized in Supabase's redirect URLs.

---

## Fix: Authorize Your Cloudflare Domain in Supabase

### Step 1: Get Your Cloudflare Domain

Your Cloudflare Pages domain will be something like:
- `https://your-project.pages.dev`
- Or your custom domain: `https://yourdomain.com`

### Step 2: Configure Supabase for Production

Go to your Supabase Dashboard:

#### A. Update Site URL

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your production domain:
   ```
   https://your-project.pages.dev
   ```
   (or your custom domain)

#### B. Add Redirect URLs

In the same **URL Configuration** page:

1. Under **Redirect URLs**, click **Add URL**
2. Add these URLs:

   ```
   https://your-project.pages.dev/*
   https://your-project.pages.dev/forgot-password
   https://your-project.pages.dev/login
   ```

   If you have a custom domain, also add:
   ```
   https://yourdomain.com/*
   https://yourdomain.com/forgot-password
   https://yourdomain.com/login
   ```

3. **Keep localhost URLs for development:**
   ```
   http://localhost:5173/*
   http://localhost:5173/forgot-password
   http://localhost:5173/login
   ```

#### C. IMPORTANT: Use Wildcard Pattern

Make sure to include the wildcard `/*` pattern for each domain:
- ✅ `https://your-project.pages.dev/*` (allows all routes)
- ❌ `https://your-project.pages.dev` (only allows exact match)

---

## Step 3: Verify Email Template Configuration

1. Go to **Authentication** → **Email Templates**
2. Select **Reset Password**
3. Make sure it's **enabled**
4. The template should contain a link like:
   ```html
   {{ .SiteURL }}/forgot-password?reset=true&token={{ .Token }}
   ```
5. Supabase will automatically use the correct Site URL based on where the request came from

---

## Step 4: Configure SMTP (Recommended for Production)

For reliable email delivery on production:

1. Go to **Settings** → **Auth**
2. Scroll to **SMTP Settings**
3. Enable **Custom SMTP**
4. Add your SMTP provider details:

### Option A: Using Gmail

```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Password: your-app-password (not your regular password)
Sender Email: your-email@gmail.com
Sender Name: Your App Name
```

**Note:** For Gmail, you need to create an "App Password":
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate a password for "Mail"
5. Use this password in SMTP settings

### Option B: Using SendGrid (Recommended)

```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: your-sendgrid-api-key
Sender Email: verified-sender@yourdomain.com
Sender Name: Your App Name
```

### Option C: Using AWS SES

```
SMTP Host: email-smtp.us-east-1.amazonaws.com (your region)
SMTP Port: 587
SMTP User: your-ses-smtp-username
SMTP Password: your-ses-smtp-password
Sender Email: verified-sender@yourdomain.com
Sender Name: Your App Name
```

---

## Step 5: Test on Cloudflare

After configuring Supabase:

1. Go to your Cloudflare-hosted site
2. Navigate to forgot password page
3. Enter a valid email
4. Click "Send Reset Link"

**Expected Result:**
- ✅ Green success message appears
- ✅ Email is received (check spam folder)
- ✅ Click link → Redirects to your Cloudflare site
- ✅ Password can be reset

---

## Cloudflare Pages Environment Variables

Make sure your Cloudflare Pages has the correct environment variables:

1. Go to Cloudflare Dashboard
2. Select your Pages project
3. Go to **Settings** → **Environment Variables**
4. Add these variables for **Production**:

```
VITE_SUPABASE_URL = https://data.portun.app
VITE_SUPABASE_ANON_KEY = your_supabase_anon_key
```

5. **Redeploy** your site after adding variables

---

## Common Issues & Solutions

### Issue: Still not receiving emails on production

**Solutions:**
1. ✅ Verify production domain is in Supabase redirect URLs
2. ✅ Check that Site URL matches your production domain
3. ✅ Clear browser cache and cookies
4. ✅ Check email spam/junk folder
5. ✅ Set up custom SMTP (Supabase default SMTP is rate-limited)

### Issue: Email received but link redirects to localhost

**Solution:**
- Site URL in Supabase is set to localhost
- Change it to your production domain

### Issue: "Invalid redirect URL" error

**Solution:**
- Add exact URL to Supabase redirect URLs list
- Include wildcard pattern (`/*`)

### Issue: Emails not sending at all

**Solution:**
- Supabase free tier has email rate limits
- Set up custom SMTP for production
- Check Supabase logs in Dashboard → Logs

---

## Multiple Domains Support

If you have both Cloudflare domain AND custom domain:

### In Supabase URL Configuration:

**Site URL:** Set to your primary domain (usually custom domain)
```
https://yourdomain.com
```

**Redirect URLs:** Add ALL domains
```
https://yourdomain.com/*
https://your-project.pages.dev/*
http://localhost:5173/*
```

This way, password reset will work from any domain!

---

## Quick Checklist for Cloudflare Production

- [ ] Site URL set to Cloudflare domain in Supabase
- [ ] Cloudflare domain added to redirect URLs with `/*`
- [ ] Custom domain (if any) also added to redirect URLs
- [ ] Localhost URLs kept for development
- [ ] Email template is enabled
- [ ] SMTP configured (recommended)
- [ ] Environment variables set in Cloudflare Pages
- [ ] Site redeployed after env variable changes
- [ ] Tested forgot password on production
- [ ] Email received and link works

---

## Production Deployment Workflow

When deploying updates to Cloudflare:

1. Commit and push to GitHub:
   ```bash
   git add -A
   git commit -m "Your changes"
   git push origin main
   ```

2. Cloudflare Pages will auto-deploy
3. Wait for deployment to complete
4. Test login and password reset
5. Monitor Supabase logs if issues occur

---

## Example Configuration

Here's a complete example for a site: `https://portuncmd.pages.dev`

### Supabase Configuration:

**Site URL:**
```
https://portuncmd.pages.dev
```

**Redirect URLs:**
```
https://portuncmd.pages.dev/*
https://portuncmd.pages.dev/forgot-password
https://portuncmd.pages.dev/login
http://localhost:5173/*
http://localhost:5173/forgot-password
http://localhost:5173/login
```

**Email Template (Reset Password):**
- Status: Enabled
- Uses `{{ .SiteURL }}` variable (automatically uses correct domain)

**SMTP:**
- Custom SMTP enabled
- Provider: SendGrid or Gmail
- Sender verified

### Cloudflare Pages:

**Environment Variables (Production):**
```
VITE_SUPABASE_URL = https://data.portun.app
VITE_SUPABASE_ANON_KEY = your_key_here
```

**Build Settings:**
```
Build command: pnpm build
Build output directory: dist
```

---

## Need Help?

If you're still experiencing issues:

1. Share your Cloudflare domain URL
2. Check Supabase logs: Dashboard → Logs → Auth Logs
3. Check browser console for errors
4. Verify email template is enabled
5. Test with different email addresses

The issue is almost always related to redirect URL configuration in Supabase! 🔧

