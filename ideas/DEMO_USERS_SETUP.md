# Demo Users Setup Guide

Complete guide for creating test users to test the RBAC hierarchy implementation.

**Created:** 2025-11-23
**Purpose:** Create 6 test users representing all hierarchy levels

---

## Test User Hierarchy

```
demo.super@ebluenet.com (Super Admin)
  └── demo.mega@ebluenet.com (Mega Dealer) ← NEW ROLE
      └── demo.dealer@ebluenet.com (Dealer)
          └── demo.admin@ebluenet.com (Administrator)
              ├── demo.guard@ebluenet.com (Guard)
              │   └── Assigned to: DEMO1 community
              └── Manages: DEMO1, TEST1, SAND1
                  └── demo.user@ebluenet.com (Resident)
                      └── Owns: DEMO-101 property
```

---

## Step 1: Create Auth Users in Supabase Dashboard

**IMPORTANT:** You must create these users manually in the Supabase Dashboard first.

### Instructions:

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. For each user below:
   - Enter **Email**
   - Enter **Password**: `TestPass123!`
   - **Auto Confirm User**: ✅ YES (check this box)
   - Click **Create user**
   - **Copy the UUID** that's generated (you'll need it for the SQL script)

### Users to Create:

| Email | Password | Role | Copy UUID |
|-------|----------|------|-----------|
| demo.super@ebluenet.com | `Julien03` | Super Admin | ✅ Copy this |
| demo.mega@ebluenet.com | `Julien03` | Mega Dealer | ✅ Copy this |
| demo.dealer@ebluenet.com | `Julien03` | Dealer | ✅ Copy this |
| demo.admin@ebluenet.com | `Julien03` | Administrator | ✅ Copy this |
| demo.guard@ebluenet.com | `Julien03` | Guard | ✅ Copy this |
| demo.user@ebluenet.com | `Julien03` | Resident | ✅ Copy this |

---

## Step 2: Get Role IDs

Before running the setup script, you need the role IDs from your database.

```sql
-- Get all role IDs (you'll need these for the script)
SELECT id, role_name FROM role ORDER BY role_name;
```

**Copy these IDs:**
- Super Admin: `_______________`
- Mega Dealer: `_______________` (if exists, otherwise create it)
- Dealer: `_______________`
- Administrator: `_______________`
- Guard: `_______________`
- Resident: `_______________`

---

## Step 3: Run Setup SQL Script

Replace the UUIDs in the script below with the actual UUIDs you copied in Step 1 and Step 2, then run it.

```sql
-- ============================================================================
-- DEMO USERS SETUP SCRIPT
-- ============================================================================
-- IMPORTANT: Replace ALL <placeholders> with actual UUIDs before running!
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- VARIABLES: Replace these with actual UUIDs from Steps 1 and 2
-- ----------------------------------------------------------------------------
-- Auth User IDs (from Step 1 - Supabase Dashboard)
\set demo_super_auth_id '<paste-demo-super-uuid-here>'
\set demo_mega_auth_id '<paste-demo-mega-uuid-here>'
\set demo_dealer_auth_id '<paste-demo-dealer-uuid-here>'
\set demo_admin_auth_id '<paste-demo-admin-uuid-here>'
\set demo_guard_auth_id '<paste-demo-guard-uuid-here>'
\set demo_user_auth_id '<paste-demo-user-uuid-here>'

-- Role IDs (from Step 2 - database query)
\set role_super_admin '<paste-super-admin-role-id-here>'
\set role_mega_dealer '<paste-mega-dealer-role-id-here>'
\set role_dealer '<paste-dealer-role-id-here>'
\set role_administrator '<paste-administrator-role-id-here>'
\set role_guard '<paste-guard-role-id-here>'
\set role_resident '<paste-resident-role-id-here>'

-- Community IDs (already exist from previous setup)
-- DEMO1, TEST1, SAND1

-- Property IDs (already exist)
-- DEMO-101, DEMO-102, etc.

-- ----------------------------------------------------------------------------
-- 1. CREATE PROFILES
-- ----------------------------------------------------------------------------
INSERT INTO profile (
  id,
  email,
  firstname,
  lastname,
  enabled,
  def_community_id,
  def_property_id
) VALUES
  -- Super Admin
  (
    :'demo_super_auth_id',
    'demo.super@ebluenet.com',
    'Demo',
    'Super Admin',
    true,
    NULL, -- Super Admin has global scope
    NULL
  ),

  -- Mega Dealer
  (
    :'demo_mega_auth_id',
    'demo.mega@ebluenet.com',
    'Demo',
    'Mega Dealer',
    true,
    NULL, -- Mega Dealer sees all their dealers
    NULL
  ),

  -- Dealer
  (
    :'demo_dealer_auth_id',
    'demo.dealer@ebluenet.com',
    'Demo',
    'Dealer Company',
    true,
    NULL, -- Dealer sees all their communities
    NULL
  ),

  -- Administrator
  (
    :'demo_admin_auth_id',
    'demo.admin@ebluenet.com',
    'Demo',
    'Administrator',
    true,
    'DEMO1', -- Default community
    NULL
  ),

  -- Guard
  (
    :'demo_guard_auth_id',
    'demo.guard@ebluenet.com',
    'Demo',
    'Security Guard',
    true,
    'DEMO1', -- Assigned to DEMO1
    NULL
  ),

  -- Resident
  (
    :'demo_user_auth_id',
    'demo.user@ebluenet.com',
    'Demo',
    'Resident User',
    true,
    'DEMO1',
    'DEMO-101' -- Owns DEMO-101
  )
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  firstname = EXCLUDED.firstname,
  lastname = EXCLUDED.lastname,
  enabled = EXCLUDED.enabled,
  def_community_id = EXCLUDED.def_community_id,
  def_property_id = EXCLUDED.def_property_id;

-- Verify profiles created
SELECT id, email, firstname, lastname FROM profile
WHERE email LIKE 'demo.%@ebluenet.com'
ORDER BY email;

-- ----------------------------------------------------------------------------
-- 2. ASSIGN ROLES WITH SCOPES
-- ----------------------------------------------------------------------------

-- Super Admin (global scope)
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  granted_by
) VALUES (
  :'demo_super_auth_id',
  :'role_super_admin',
  'global',
  :'demo_super_auth_id' -- Self-assigned
)
ON CONFLICT (profile_id, role_id) DO NOTHING;

-- Mega Dealer (mega-dealer scope)
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_mega_dealer_id,
  granted_by
) VALUES (
  :'demo_mega_auth_id',
  :'role_mega_dealer',
  'mega-dealer',
  :'demo_mega_auth_id', -- Self scope
  :'demo_super_auth_id'
)
ON CONFLICT (profile_id, role_id) DO NOTHING;

-- Dealer (dealer scope)
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_dealer_id,
  granted_by
) VALUES (
  :'demo_dealer_auth_id',
  :'role_dealer',
  'dealer',
  :'demo_dealer_auth_id', -- Self scope
  :'demo_super_auth_id'
)
ON CONFLICT (profile_id, role_id) DO NOTHING;

-- Administrator (community scope)
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_dealer_id,
  scope_community_ids,
  granted_by
) VALUES (
  :'demo_admin_auth_id',
  :'role_administrator',
  'community',
  :'demo_dealer_auth_id', -- Belongs to demo.dealer
  ARRAY['DEMO1', 'TEST1', 'SAND1'], -- Manages 3 communities
  :'demo_dealer_auth_id'
)
ON CONFLICT (profile_id, role_id) DO NOTHING;

-- Guard (community scope - limited to DEMO1)
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_community_ids,
  granted_by
) VALUES (
  :'demo_guard_auth_id',
  :'role_guard',
  'community',
  ARRAY['DEMO1'], -- Only DEMO1
  :'demo_admin_auth_id'
)
ON CONFLICT (profile_id, role_id) DO NOTHING;

-- Resident (property scope)
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_property_ids,
  granted_by
) VALUES (
  :'demo_user_auth_id',
  :'role_resident',
  'property',
  ARRAY['DEMO-101'], -- Owns DEMO-101
  :'demo_admin_auth_id'
)
ON CONFLICT (profile_id, role_id) DO NOTHING;

-- Verify role assignments
SELECT
  p.email,
  r.role_name,
  pr.scope_type,
  pr.scope_dealer_id,
  pr.scope_community_ids,
  pr.scope_property_ids
FROM profile_role pr
JOIN profile p ON pr.profile_id = p.id
JOIN role r ON pr.role_id = r.id
WHERE p.email LIKE 'demo.%@ebluenet.com'
ORDER BY
  CASE r.role_name
    WHEN 'Super Admin' THEN 1
    WHEN 'Mega Dealer' THEN 2
    WHEN 'Dealer' THEN 3
    WHEN 'Administrator' THEN 4
    WHEN 'Guard' THEN 5
    WHEN 'Resident' THEN 6
  END;

-- ----------------------------------------------------------------------------
-- 3. BUILD HIERARCHY RELATIONSHIPS
-- ----------------------------------------------------------------------------

-- Create mega_dealer_dealers relationship (if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'mega_dealer_dealers'
  ) THEN
    -- Mega Dealer → Dealer relationship
    INSERT INTO mega_dealer_dealers (
      mega_dealer_id,
      dealer_id,
      assigned_by,
      notes
    ) VALUES (
      :'demo_mega_auth_id',
      :'demo_dealer_auth_id',
      :'demo_super_auth_id',
      'Demo hierarchy - created for testing'
    )
    ON CONFLICT (mega_dealer_id, dealer_id) DO NOTHING;
  END IF;
END $$;

-- Create dealer_administrators relationship
INSERT INTO dealer_administrators (
  dealer_id,
  administrator_id,
  assigned_community_ids,
  assigned_by
) VALUES (
  :'demo_dealer_auth_id',
  :'demo_admin_auth_id',
  ARRAY['DEMO1', 'TEST1', 'SAND1'],
  :'demo_dealer_auth_id'
)
ON CONFLICT (dealer_id, administrator_id) DO NOTHING;

-- Verify dealer-admin relationship
SELECT
  dealer.email as dealer_email,
  admin.email as admin_email,
  da.assigned_community_ids
FROM dealer_administrators da
JOIN profile dealer ON da.dealer_id = dealer.id
JOIN profile admin ON da.administrator_id = admin.id
WHERE dealer.email = 'demo.dealer@ebluenet.com';

-- ----------------------------------------------------------------------------
-- 4. CREATE PROPERTY OWNERSHIP
-- ----------------------------------------------------------------------------

-- Assign demo.user to own DEMO-101
INSERT INTO property_owner (
  property_id,
  profile_id
) VALUES (
  'DEMO-101',
  :'demo_user_auth_id'
)
ON CONFLICT (property_id, profile_id) DO NOTHING;

-- Verify property ownership
SELECT
  p.email,
  prop.id as property_id,
  prop.name as property_name,
  prop.community_id
FROM property_owner po
JOIN profile p ON po.profile_id = p.id
JOIN property prop ON po.property_id = prop.id
WHERE p.email = 'demo.user@ebluenet.com';

-- ----------------------------------------------------------------------------
-- 5. UPDATE COMMUNITY DEALER TRACKING (if column exists)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community' AND column_name = 'dealer_id'
  ) THEN
    -- Assign all test communities to demo.dealer
    UPDATE community
    SET dealer_id = :'demo_dealer_auth_id'
    WHERE id IN ('DEMO1', 'TEST1', 'SAND1');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 6. FINAL VERIFICATION
-- ----------------------------------------------------------------------------

-- Check all demo users exist
SELECT
  'Users Created' as check_type,
  COUNT(*) as count,
  string_agg(email, ', ' ORDER BY email) as users
FROM profile
WHERE email LIKE 'demo.%@ebluenet.com';

-- Check all roles assigned
SELECT
  'Roles Assigned' as check_type,
  COUNT(*) as count,
  string_agg(DISTINCT r.role_name, ', ' ORDER BY r.role_name) as roles
FROM profile_role pr
JOIN profile p ON pr.profile_id = p.id
JOIN role r ON pr.role_id = r.id
WHERE p.email LIKE 'demo.%@ebluenet.com';

-- Check hierarchy relationships
SELECT
  'Dealer-Admin Relationships' as check_type,
  COUNT(*) as count
FROM dealer_administrators da
JOIN profile dealer ON da.dealer_id = dealer.id
WHERE dealer.email = 'demo.dealer@ebluenet.com';

-- Check property ownership
SELECT
  'Property Ownerships' as check_type,
  COUNT(*) as count
FROM property_owner po
JOIN profile p ON po.profile_id = p.id
WHERE p.email = 'demo.user@ebluenet.com';

-- Display complete hierarchy
SELECT
  CASE
    WHEN r.role_name = 'Super Admin' THEN '1. ' || r.role_name
    WHEN r.role_name = 'Mega Dealer' THEN '2. └── ' || r.role_name
    WHEN r.role_name = 'Dealer' THEN '3.     └── ' || r.role_name
    WHEN r.role_name = 'Administrator' THEN '4.         └── ' || r.role_name
    WHEN r.role_name = 'Guard' THEN '5.             ├── ' || r.role_name
    WHEN r.role_name = 'Resident' THEN '6.             └── ' || r.role_name
  END as hierarchy,
  p.email,
  pr.scope_type,
  COALESCE(
    CASE
      WHEN pr.scope_community_ids IS NOT NULL THEN array_to_string(pr.scope_community_ids, ', ')
      WHEN pr.scope_property_ids IS NOT NULL THEN array_to_string(pr.scope_property_ids, ', ')
      ELSE 'All'
    END,
    'Global'
  ) as scope
FROM profile_role pr
JOIN profile p ON pr.profile_id = p.id
JOIN role r ON pr.role_id = r.id
WHERE p.email LIKE 'demo.%@ebluenet.com'
ORDER BY
  CASE r.role_name
    WHEN 'Super Admin' THEN 1
    WHEN 'Mega Dealer' THEN 2
    WHEN 'Dealer' THEN 3
    WHEN 'Administrator' THEN 4
    WHEN 'Guard' THEN 5
    WHEN 'Resident' THEN 6
  END;

COMMIT;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- You can now log in as any of these users to test the hierarchy:
--
-- Super Admin:   demo.super@ebluenet.com   / Julien03
-- Mega Dealer:   demo.mega@ebluenet.com    / Julien03
-- Dealer:        demo.dealer@ebluenet.com  / Julien03
-- Administrator: demo.admin@ebluenet.com   / Julien03
-- Guard:         demo.guard@ebluenet.com   / Julien03
-- Resident:      demo.user@ebluenet.com    / Julien03
-- ============================================================================
```

---

## Step 4: Test Login for Each User

### Test Credentials:

| Email | Password | What You Should See |
|-------|----------|-------------------|
| demo.super@ebluenet.com | `Julien03` | **Everything** - All mega dealers, dealers, admins, communities |
| demo.mega@ebluenet.com | `Julien03` | demo.dealer + their admins + their communities (DEMO1, TEST1, SAND1) |
| demo.dealer@ebluenet.com | `Julien03` | demo.admin + DEMO1, TEST1, SAND1 communities |
| demo.admin@ebluenet.com | `Julien03` | DEMO1, TEST1, SAND1 communities + their properties + residents |
| demo.guard@ebluenet.com | `Julien03` | **Only DEMO1** community - visitors, residents (limited fields) |
| demo.user@ebluenet.com | `Julien03` | **Only DEMO-101** property - their own visitor passes |

### Testing Checklist:

**Super Admin (demo.super@ebluenet.com):**
- [ ] Can see all communities (DEMO1, TEST1, SAND1, plus existing ones)
- [ ] Can see all users
- [ ] Can access admin panel
- [ ] Can create new communities
- [ ] Can delete communities
- [ ] Can transfer entities (when implemented)

**Mega Dealer (demo.mega@ebluenet.com):**
- [ ] Can see demo.dealer in dealer list
- [ ] Can see DEMO1, TEST1, SAND1 communities (via demo.dealer)
- [ ] Can view aggregate statistics
- [ ] **Cannot** see other mega dealers' data
- [ ] **Cannot** directly edit communities
- [ ] **Cannot** transfer dealers

**Dealer (demo.dealer@ebluenet.com):**
- [ ] Can see demo.admin in administrator list
- [ ] Can see DEMO1, TEST1, SAND1 communities
- [ ] Can create new administrators
- [ ] Can assign communities to demo.admin
- [ ] **Cannot** see other dealers' data
- [ ] **Cannot** transfer administrators

**Administrator (demo.admin@ebluenet.com):**
- [ ] Can see DEMO1, TEST1, SAND1 communities
- [ ] Can see all properties in those communities
- [ ] Can create residents
- [ ] Can create visitor passes
- [ ] Can assign guards to communities
- [ ] **Cannot** see other administrators' communities

**Guard (demo.guard@ebluenet.com):**
- [ ] Can see **only DEMO1** community
- [ ] Can view visitor list for DEMO1
- [ ] Can verify QR codes
- [ ] Can log visitor entry/exit
- [ ] **Cannot** see TEST1 or SAND1 (not assigned there)
- [ ] **Cannot** see resident personal details
- [ ] **Cannot** modify communities

**Resident (demo.user@ebluenet.com):**
- [ ] Can see **only DEMO-101** property
- [ ] Can create visitor passes
- [ ] Can view their visitor history
- [ ] **Cannot** see other properties
- [ ] **Cannot** see other residents
- [ ] **Cannot** access admin features

---

## Troubleshooting

### Issue: "User does not exist or is not active"

**Solution:** Check that the auth user was created in Supabase Dashboard and the UUID matches.

```sql
-- Verify auth user exists
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email LIKE 'demo.%@ebluenet.com';
```

### Issue: "Role does not exist"

**Solution:** Mega Dealer role may not exist yet. Create it:

```sql
INSERT INTO role (role_name, enabled)
VALUES ('Mega Dealer', true)
ON CONFLICT (role_name) DO NOTHING;

-- Get the ID
SELECT id FROM role WHERE role_name = 'Mega Dealer';
```

### Issue: "Cannot login - Invalid credentials"

**Solution:**
1. Check password is exactly `TestPass123!`
2. Verify user is confirmed in Supabase Dashboard
3. Check profile.enabled = true

```sql
SELECT email, enabled FROM profile WHERE email = 'demo.super@ebluenet.com';
```

### Issue: "User sees no data after login"

**Solution:** Check scope assignment:

```sql
-- Check role and scope
SELECT
  p.email,
  r.role_name,
  pr.scope_type,
  pr.scope_community_ids,
  pr.scope_property_ids
FROM profile_role pr
JOIN profile p ON pr.profile_id = p.id
JOIN role r ON pr.role_id = r.id
WHERE p.email = 'demo.super@ebluenet.com';
```

### Issue: "mega_dealer_dealers table does not exist"

**Solution:** This is expected if you haven't run the RBAC migration yet. The dealer will still work, they just won't be under a mega dealer. Run Phase 1 of the implementation roadmap from `RBAC_HIERARCHY.md`.

---

## Cleanup Script

To remove all demo users when done testing:

```sql
-- Delete in reverse dependency order
BEGIN;

-- Remove property ownership
DELETE FROM property_owner WHERE profile_id IN (
  SELECT id FROM profile WHERE email LIKE 'demo.%@ebluenet.com'
);

-- Remove dealer-admin relationships
DELETE FROM dealer_administrators WHERE dealer_id IN (
  SELECT id FROM profile WHERE email = 'demo.dealer@ebluenet.com'
);

-- Remove mega dealer relationships (if table exists)
DELETE FROM mega_dealer_dealers WHERE mega_dealer_id IN (
  SELECT id FROM profile WHERE email = 'demo.mega@ebluenet.com'
);

-- Remove role assignments
DELETE FROM profile_role WHERE profile_id IN (
  SELECT id FROM profile WHERE email LIKE 'demo.%@ebluenet.com'
);

-- Clear community dealer references
UPDATE community SET dealer_id = NULL WHERE dealer_id IN (
  SELECT id FROM profile WHERE email LIKE 'demo.%@ebluenet.com'
);

-- Clear profile community/property references
UPDATE profile
SET def_community_id = NULL, def_property_id = NULL
WHERE email LIKE 'demo.%@ebluenet.com';

-- Delete profiles
DELETE FROM profile WHERE email LIKE 'demo.%@ebluenet.com';

COMMIT;

-- Then manually delete auth users in Supabase Dashboard
```

---

## Summary

After setup, you'll have:

✅ **6 test users** covering all hierarchy levels
✅ **Complete hierarchy chain** from Super Admin to Resident
✅ **Proper scope assignments** for testing RLS policies
✅ **Property ownership** for resident testing
✅ **Community assignments** for administrator testing
✅ **Guard assignment** for security testing

You can now:
- Test login for each role
- Verify data visibility matches scope
- Test permissions for each role
- Test navigation through hierarchy
- Prepare for transfer implementation testing

**Next:** Create these auth users in Supabase Dashboard, then run the SQL script!
