# Test Data Management Guide

This guide provides step-by-step instructions for creating and managing test communities, properties, and users in PortunCmd to avoid foreign key constraint errors.

## Table of Contents
- [Understanding the Data Hierarchy](#understanding-the-data-hierarchy)
- [Creating Test Data](#creating-test-data)
- [Disabling/Archiving Data](#disablingarchiving-data)
- [Deleting Test Data](#deleting-test-data)
- [Common Errors and Solutions](#common-errors-and-solutions)

---

## Understanding the Data Hierarchy

The database follows this dependency hierarchy (from independent to dependent):

```
1. role (independent - pre-populated)
2. community (independent)
3. property (depends on community)
4. auth.users (managed by Supabase Auth)
5. profile (depends on auth.users, optionally on community and property)
6. profile_role (depends on profile and role)
7. property_owner (depends on profile and property)
8. community_manager (depends on profile and community)
9. visitor_records_uid (depends on property)
```

**Important Rule:** Always create in order from top to bottom, and delete in reverse order (bottom to top).

---

## Creating Test Data

### Step 1: Create Communities

Communities are independent and can be created first.

```sql
-- Create test communities
INSERT INTO community (id, name, city, country, status, address, state, postal_code)
VALUES
  ('DEMO1', 'Demo Heights Residences', 'Guatemala City', 'Guatemala', 'active', '5ta Avenida 10-50', 'Guatemala', '01010'),
  ('TEST1', 'Test Valley Community', 'Antigua', 'Guatemala', 'active', 'Calle del Arco 15', 'Sacatepéquez', '03001'),
  ('SAND1', 'Sandbox Towers', 'San Salvador', 'El Salvador', 'pre-launch', 'Boulevard del Hipódromo 234', 'San Salvador', '01101');

-- Verify creation
SELECT id, name, city, status FROM community WHERE id IN ('DEMO1', 'TEST1', 'SAND1');
```

**Required fields:**
- `id` - Unique community identifier (use TEST*, DEMO*, SAND* for easy identification)
- `name` - Community name
- `address` - Physical address (NOT NULL)
- Other fields are optional but recommended

### Step 2: Create Properties

Properties depend on communities, so create them after communities exist.

```sql
-- Create test properties
INSERT INTO property (id, name, address, community_id, status)
VALUES
  -- DEMO1 properties
  ('DEMO-101', 'Apartment 101', 'Building A, Floor 1', 'DEMO1', 'active'),
  ('DEMO-102', 'Apartment 102', 'Building A, Floor 1', 'DEMO1', 'active'),
  ('DEMO-201', 'Penthouse 201', 'Building B, Floor 2', 'DEMO1', 'vacant'),

  -- TEST1 properties
  ('TEST-A1', 'Villa A1', 'Section A, Lot 1', 'TEST1', 'active'),
  ('TEST-A2', 'Villa A2', 'Section A, Lot 2', 'TEST1', 'active'),
  ('TEST-B1', 'Townhouse B1', 'Section B, Lot 1', 'TEST1', 'vacant'),

  -- SAND1 properties
  ('SAND-T1', 'Tower 1 - Unit 501', 'Tower 1, Floor 5', 'SAND1', 'vacant'),
  ('SAND-T2', 'Tower 2 - Unit 801', 'Tower 2, Floor 8', 'SAND1', 'vacant');

-- Verify creation
SELECT id, name, community_id, status FROM property WHERE community_id IN ('DEMO1', 'TEST1', 'SAND1');
```

**Required fields:**
- `id` - Unique property identifier
- `name` - Property name
- `address` - Property address (NOT NULL)
- `community_id` - Must reference an existing community
- `status` - Property status (active, vacant, etc.)

### Step 3: Create Users (Through Supabase Dashboard)

Users must be created through Supabase Auth, not direct SQL. Use the Supabase Dashboard:

1. Go to **Authentication > Users** in Supabase Dashboard
2. Click **Add User**
3. Enter email and password:
   - `test.admin@ebluenet.com` / `TestPass123!`
   - `test.resident@ebluenet.com` / `TestPass123!`
   - `test.guard@ebluenet.com` / `TestPass123!`
   - `test.dealer@ebluenet.com` / `TestPass123!`
4. Note the generated UUID for each user
5. **Important:** Set `email_confirmed` to `true` for each user

### Step 4: Create User Profiles

After creating auth users, create their profiles:

```sql
-- First, get the role IDs
SELECT id, name FROM role;

-- Create profiles (replace <user-uuid-1>, <user-uuid-2>, etc. with actual UUIDs from auth.users)
INSERT INTO profile (id, email, firstname, lastname, enabled, def_community_id, def_property_id)
VALUES
  ('<user-uuid-1>', 'test.admin@ebluenet.com', 'Test', 'Administrator', true, 'DEMO1', 'DEMO-101'),
  ('<user-uuid-2>', 'test.resident@ebluenet.com', 'Demo', 'Resident User', true, 'DEMO1', 'DEMO-102'),
  ('<user-uuid-3>', 'test.guard@ebluenet.com', 'Demo', 'Security Guard', true, 'TEST1', NULL),
  ('<user-uuid-4>', 'test.dealer@ebluenet.com', 'Demo', 'Service Provider', true, 'SAND1', NULL);

-- Verify creation
SELECT id, email, firstname, lastname FROM profile WHERE email LIKE 'test.%@ebluenet.com';
```

### Step 5: Assign Roles to Users

```sql
-- Get role IDs (you'll need these)
SELECT id, name FROM role;

-- Assign roles (replace <role-id-admin>, <role-id-resident>, etc. with actual role IDs)
INSERT INTO profile_role (profile_id, role_id)
VALUES
  ('<user-uuid-1>', '<role-id-admin>'),        -- Test Administrator
  ('<user-uuid-2>', '<role-id-resident>'),     -- Demo Resident
  ('<user-uuid-3>', '<role-id-guard>'),        -- Demo Guard
  ('<user-uuid-4>', '<role-id-dealer>');       -- Demo Dealer

-- Verify role assignments
SELECT p.email, r.name as role
FROM profile_role pr
JOIN profile p ON pr.profile_id = p.id
JOIN role r ON pr.role_id = r.id
WHERE p.email LIKE 'test.%@ebluenet.com';
```

### Step 6: Create Property Ownership (Optional)

```sql
-- Assign property ownership
INSERT INTO property_owner (property_id, profile_id)
VALUES
  ('DEMO-101', '<user-uuid-1>'),  -- Test Admin owns Apartment 101
  ('DEMO-102', '<user-uuid-2>');  -- Test Resident owns Apartment 102

-- Verify ownership
SELECT po.property_id, prop.name, p.email
FROM property_owner po
JOIN property prop ON po.property_id = prop.id
JOIN profile p ON po.profile_id = p.id
WHERE p.email LIKE 'test.%@ebluenet.com';
```

---

## Disabling/Archiving Data

Instead of deleting, you can disable or archive data to preserve history:

### Disable a User Profile

```sql
-- Disable a user (prevents login)
UPDATE profile
SET enabled = false
WHERE email = 'test.admin@ebluenet.com';
```

### Archive a Community

```sql
-- Change community status to archived
UPDATE community
SET status = 'archived',
    status_changed_at = NOW(),
    status_reason = 'Test data - no longer needed'
WHERE id = 'DEMO1';
```

### Archive a Property

```sql
-- Change property status to archived
UPDATE property
SET status = 'archived',
    status_changed_at = NOW()
WHERE id = 'DEMO-101';
```

---

## Deleting Test Data

**CRITICAL:** Always delete in reverse order to avoid foreign key constraint errors.

### Step 1: Delete Visitor Records (if any)

```sql
-- Check for visitor records
SELECT COUNT(*) FROM visitor_records_uid WHERE property_id IN ('DEMO-101', 'DEMO-102', 'DEMO-201');

-- Delete visitor record logs first
DELETE FROM visitor_record_logs
WHERE visitor_record_id IN (
  SELECT id FROM visitor_records_uid WHERE property_id IN ('DEMO-101', 'DEMO-102', 'DEMO-201')
);

-- Delete visitor records
DELETE FROM visitor_records_uid WHERE property_id IN ('DEMO-101', 'DEMO-102', 'DEMO-201');
```

### Step 2: Delete Community Managers (if any)

```sql
-- Delete community manager assignments
DELETE FROM community_manager WHERE community_id IN ('DEMO1', 'TEST1', 'SAND1');
```

### Step 3: Delete Property Owners

```sql
-- Delete property ownership records
DELETE FROM property_owner WHERE property_id IN (
  SELECT id FROM property WHERE community_id IN ('DEMO1', 'TEST1', 'SAND1')
);
```

### Step 4: Delete User Roles

```sql
-- Delete role assignments for test users
DELETE FROM profile_role
WHERE profile_id IN (
  SELECT id FROM profile WHERE email LIKE 'test.%@ebluenet.com'
);
```

### Step 5: Clear Profile References to Communities/Properties

```sql
-- Clear default community and property references
UPDATE profile
SET def_community_id = NULL,
    def_property_id = NULL
WHERE email LIKE 'test.%@ebluenet.com';

-- Or for specific communities
UPDATE profile
SET def_community_id = NULL
WHERE def_community_id IN ('DEMO1', 'TEST1', 'SAND1');

UPDATE profile
SET def_property_id = NULL
WHERE def_property_id IN (
  SELECT id FROM property WHERE community_id IN ('DEMO1', 'TEST1', 'SAND1')
);
```

### Step 6: Delete User Profiles

```sql
-- Delete test user profiles
DELETE FROM profile WHERE email LIKE 'test.%@ebluenet.com';
```

### Step 7: Delete Auth Users (Through Dashboard)

Delete the auth users through Supabase Dashboard:
1. Go to **Authentication > Users**
2. Search for test users (test.admin@ebluenet.com, etc.)
3. Click the user and select **Delete User**

### Step 8: Delete Properties

```sql
-- Delete test properties
DELETE FROM property WHERE community_id IN ('DEMO1', 'TEST1', 'SAND1');

-- Verify deletion
SELECT COUNT(*) FROM property WHERE community_id IN ('DEMO1', 'TEST1', 'SAND1');
```

### Step 9: Delete Communities

```sql
-- Delete test communities
DELETE FROM community WHERE id IN ('DEMO1', 'TEST1', 'SAND1');

-- Verify deletion
SELECT COUNT(*) FROM community WHERE id IN ('DEMO1', 'TEST1', 'SAND1');
```

---

## Common Errors and Solutions

### Error: "violates foreign key constraint"

**Cause:** Trying to delete a record that other records depend on.

**Solution:** Follow the deletion order above. Always delete dependent records first.

Example:
```
ERROR: update or delete on table "property" violates foreign key
constraint "property_owner_property_id_fkey" on table "property_owner"
```
Solution: Delete property_owner records first, then delete properties.

### Error: "null value in column violates not-null constraint"

**Cause:** Missing required field when inserting data.

**Solution:** Ensure all required fields are provided:
- `community.address` - Required
- `property.address` - Required
- `property.community_id` - Required

### Error: "insert or update on table violates foreign key constraint"

**Cause:** Referencing a record that doesn't exist.

**Solution:**
- For properties: Create the community first
- For profiles: Create the auth user first
- For property_owner: Create both the property and profile first

### Error: Cannot delete community with related properties

```sql
-- Solution: Delete properties first
DELETE FROM property WHERE community_id = 'DEMO1';
-- Then delete community
DELETE FROM community WHERE id = 'DEMO1';
```

---

## Quick Delete Script for All Test Data

Use this script to quickly remove all test data in the correct order:

```sql
-- 1. Delete visitor record logs
DELETE FROM visitor_record_logs
WHERE visitor_record_id IN (
  SELECT id FROM visitor_records_uid
  WHERE property_id IN (
    SELECT id FROM property WHERE community_id IN ('DEMO1', 'TEST1', 'SAND1')
  )
);

-- 2. Delete visitor records
DELETE FROM visitor_records_uid
WHERE property_id IN (
  SELECT id FROM property WHERE community_id IN ('DEMO1', 'TEST1', 'SAND1')
);

-- 3. Delete community managers
DELETE FROM community_manager WHERE community_id IN ('DEMO1', 'TEST1', 'SAND1');

-- 4. Delete property owners
DELETE FROM property_owner
WHERE property_id IN (
  SELECT id FROM property WHERE community_id IN ('DEMO1', 'TEST1', 'SAND1')
);

-- 5. Delete user roles
DELETE FROM profile_role
WHERE profile_id IN (
  SELECT id FROM profile WHERE email LIKE 'test.%@ebluenet.com'
);

-- 6. Clear profile references
UPDATE profile
SET def_community_id = NULL, def_property_id = NULL
WHERE def_community_id IN ('DEMO1', 'TEST1', 'SAND1')
   OR def_property_id IN (
     SELECT id FROM property WHERE community_id IN ('DEMO1', 'TEST1', 'SAND1')
   )
   OR email LIKE 'test.%@ebluenet.com';

-- 7. Delete test profiles
DELETE FROM profile WHERE email LIKE 'test.%@ebluenet.com';

-- 8. Delete properties
DELETE FROM property WHERE community_id IN ('DEMO1', 'TEST1', 'SAND1');

-- 9. Delete communities
DELETE FROM community WHERE id IN ('DEMO1', 'TEST1', 'SAND1');

-- 10. Verify all test data is gone
SELECT 'Communities' as table_name, COUNT(*) as remaining
FROM community WHERE id IN ('DEMO1', 'TEST1', 'SAND1')
UNION ALL
SELECT 'Properties', COUNT(*)
FROM property WHERE community_id IN ('DEMO1', 'TEST1', 'SAND1')
UNION ALL
SELECT 'Profiles', COUNT(*)
FROM profile WHERE email LIKE 'test.%@ebluenet.com';
```

**Note:** You must manually delete auth.users through the Supabase Dashboard.

---

## Best Practices

1. **Use Consistent Prefixes:** Use TEST*, DEMO*, or SAND* prefixes for test data IDs to easily identify and clean up later.

2. **Document Test Users:** Keep a list of test user emails and passwords in a secure location.

3. **Regular Cleanup:** Periodically clean up old test data to keep the database tidy.

4. **Prefer Archiving:** When possible, use status changes (`archived`, `inactive`) instead of deletion to preserve data relationships and history.

5. **Test in Development First:** Always test your delete scripts on a development database before running on production.

6. **Backup Before Bulk Deletions:** Create a database backup before running bulk delete operations.

---

## Current Test Data Created

### Communities
- **DEMO1** - "Demo Heights Residences" (Guatemala City, Guatemala)
- **TEST1** - "Test Valley Community" (Antigua, Guatemala)
- **SAND1** - "Sandbox Towers" (San Salvador, El Salvador)

### Properties
**DEMO1:**
- DEMO-101 - Apartment 101 (active)
- DEMO-102 - Apartment 102 (active)
- DEMO-201 - Penthouse 201 (vacant)

**TEST1:**
- TEST-A1 - Villa A1 (active)
- TEST-A2 - Villa A2 (active)
- TEST-B1 - Townhouse B1 (vacant)

**SAND1:**
- SAND-T1 - Tower 1 - Unit 501 (vacant)
- SAND-T2 - Tower 2 - Unit 801 (vacant)

### Recommended Test Users
Create these through Supabase Dashboard > Authentication:
- test.admin@ebluenet.com (Administrator role)
- test.resident@ebluenet.com (Resident role)
- test.guard@ebluenet.com (Guard role)
- test.dealer@ebluenet.com (Dealer role)
