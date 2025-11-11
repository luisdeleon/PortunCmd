# Authentication Setup

This project uses Supabase for authentication. This guide explains how authentication works and how to set up demo users.

## Authentication Flow

1. User enters email and password on the login page
2. Credentials are authenticated with Supabase Auth
3. User profile is fetched from the `profile` table
4. User roles are fetched from the `profile_role` and `role` tables
5. Ability rules are determined based on user roles
6. User session is stored in cookies and Supabase session

## Setting Up Demo Users

To use the demo accounts (admin@demo.com and client@demo.com), you need to:

### 1. Create Users in Supabase Auth

1. Go to your Supabase dashboard
2. Navigate to Authentication > Users
3. Click "Add User" or "Create User"
4. Create the following users:

**Admin User:**
- Email: `admin@demo.com`
- Password: `admin`
- Auto Confirm User: Yes

**Client User:**
- Email: `client@demo.com`
- Password: `client`
- Auto Confirm User: Yes

### 2. Create User Profiles

After creating users in Supabase Auth, you need to create corresponding profiles in the `profile` table. The profile `id` must match the user's `id` from Supabase Auth.

You can run this SQL in your Supabase SQL Editor:

```sql
-- Create admin profile (replace USER_ID with the actual user ID from Supabase Auth)
INSERT INTO profile (id, email, display_name, enabled)
VALUES (
  'USER_ID_FROM_SUPABASE_AUTH', 
  'admin@demo.com', 
  'Admin User', 
  true
);

-- Create client profile (replace USER_ID with the actual user ID from Supabase Auth)
INSERT INTO profile (id, email, display_name, enabled)
VALUES (
  'USER_ID_FROM_SUPABASE_AUTH', 
  'client@demo.com', 
  'Client User', 
  true
);
```

### 3. Assign Roles to Users

Assign roles to the users by inserting into the `profile_role` table:

```sql
-- Get role IDs first
SELECT id, role_name FROM role;

-- Assign Super Admin role to admin user
INSERT INTO profile_role (profile_id, role_id)
VALUES (
  'ADMIN_PROFILE_ID',
  'SUPER_ADMIN_ROLE_ID'
);

-- Assign Resident role to client user (or another appropriate role)
INSERT INTO profile_role (profile_id, role_id)
VALUES (
  'CLIENT_PROFILE_ID',
  'RESIDENT_ROLE_ID'
);
```

## Role-Based Access Control

The application uses role-based access control (RBAC) with the following rules:

- **Admin roles** (Super Admin, Administrator): Full access (`manage: all`)
- **Other roles** (Guard, Resident, Dealer, Client): Limited access (`read: AclDemo`)

Roles are determined by:
1. Fetching user roles from `profile_role` table
2. Filtering for enabled roles only
3. Admin roles take precedence
4. If no roles found, default to 'Resident'

## Password Reset

The forgot password page sends a password reset email via Supabase. Users will receive an email with a link to reset their password.

The reset link redirects to: `${window.location.origin}/forgot-password?reset=true`

## Session Management

- Sessions are managed by Supabase Auth
- Access tokens are stored in cookies
- User data and ability rules are stored in cookies
- Router guards check both cookies and Supabase session
- Sessions are automatically refreshed by Supabase

## Logout

When a user logs out:
1. Supabase session is cleared
2. All authentication cookies are removed
3. User ability rules are reset
4. User is redirected to login page

## Environment Variables

Make sure your `.env` file contains:

```env
VITE_SUPABASE_URL=https://data.portun.app
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Troubleshooting

### User cannot login
- Verify user exists in Supabase Auth
- Verify profile exists in `profile` table with matching `id`
- Check that `enabled` is `true` in the profile
- Verify email and password are correct

### User has no permissions
- Check that user has roles assigned in `profile_role` table
- Verify roles are enabled in `role` table
- Check ability rules mapping in `src/composables/useAuth.ts`

### Session expires immediately
- Check Supabase session configuration
- Verify cookies are being set correctly
- Check browser console for errors

