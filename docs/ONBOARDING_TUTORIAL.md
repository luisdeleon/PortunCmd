# Onboarding Tutorial: Communities, Properties & Users

A step-by-step guide for onboarding new communities, properties, and users in PortunCmd.

## Table of Contents

1. [The Creation Order](#the-creation-order)
2. [Step 1: Create a Community](#step-1-create-a-community)
3. [Step 2: Create Properties](#step-2-create-properties)
4. [Step 3: Create User Account](#step-3-create-user-account)
5. [Step 4: Assign Role with Scope](#step-4-assign-role-with-scope)
6. [Step 5: Create Relationship Record](#step-5-create-relationship-record)
7. [Step 6: Set Defaults](#step-6-set-defaults)
8. [Role Hierarchy](#role-hierarchy)
9. [Quick Checklists](#quick-checklists)
10. [Common Scenarios](#common-scenarios)
11. [Troubleshooting](#troubleshooting)

---

## The Creation Order

**CRITICAL**: Always follow this order when onboarding:

```
1. Community → 2. Properties → 3. Users → 4. Roles → 5. Relationships → 6. Defaults
```

Why this order matters:
- Properties require a `community_id` (community must exist first)
- Role scopes reference community/property IDs (must exist first)
- Relationship tables link users to communities/properties (all must exist)

---

## Step 1: Create a Community

**Who can do this**: Super Admin, Mega Dealer, or Dealer

### SQL Example

```sql
INSERT INTO community (
  id,
  name,
  address,
  city,
  state,
  postal_code,
  country,
  status
) VALUES (
  'sunset-gardens',              -- URL-friendly ID (lowercase, hyphens, no spaces)
  'Sunset Gardens Condominium',  -- Display name
  '123 Main Street',
  'Miami',
  'Florida',
  '33101',
  'USA',
  'active'                       -- Status: active, under-construction, pre-launch, etc.
);
```

### Key Rules

| Rule | Example |
|------|---------|
| ID must be unique | `sunset-gardens`, `ocean-view-towers` |
| ID must be URL-friendly | ✅ `my-community` ❌ `My Community!` |
| Use lowercase with hyphens | ✅ `palm-beach-estates` ❌ `PalmBeachEstates` |
| Community must exist BEFORE properties | Create community first, then properties |

### Available Status Values

- `active` - Normal operation
- `under-construction` - Being built
- `pre-launch` - Setup phase before residents
- `full-capacity` - No vacancies
- `maintenance` - Temporarily closed for maintenance
- `seasonal-closure` - Closed for season
- `inactive` - Not currently active
- `archived` - Historical record

---

## Step 2: Create Properties

**Who can do this**: Administrator (or higher roles)

### SQL Example - Single Property

```sql
INSERT INTO property (
  id,
  name,
  address,
  community_id,
  status
) VALUES (
  'sunset-apt-101',              -- Include community name for clarity
  'Apartment 101',               -- Display name
  'Building A, Floor 1',         -- Unit-specific address
  'sunset-gardens',              -- Must match existing community ID
  'vacant'                       -- Status: vacant until resident assigned
);
```

### SQL Example - Multiple Properties

```sql
INSERT INTO property (id, name, address, community_id, status)
VALUES
  ('sunset-apt-101', 'Apartment 101', 'Building A, Floor 1', 'sunset-gardens', 'vacant'),
  ('sunset-apt-102', 'Apartment 102', 'Building A, Floor 1', 'sunset-gardens', 'vacant'),
  ('sunset-apt-201', 'Apartment 201', 'Building A, Floor 2', 'sunset-gardens', 'vacant'),
  ('sunset-apt-202', 'Apartment 202', 'Building A, Floor 2', 'sunset-gardens', 'vacant');
```

### SQL Example - Bulk Creation (generate series)

```sql
-- Create 20 apartments automatically
INSERT INTO property (id, name, address, community_id, status)
SELECT
  'sunset-apt-' || LPAD(unit_num::text, 3, '0'),
  'Apartment ' || unit_num,
  'Building A, Floor ' || CEIL(unit_num::numeric / 4),
  'sunset-gardens',
  'vacant'
FROM generate_series(101, 120) AS unit_num;
```

### Key Rules

| Rule | Example |
|------|---------|
| Every property MUST have a `community_id` | `community_id: 'sunset-gardens'` |
| Property ID should include community name | `sunset-apt-101` not just `apt-101` |
| ID must be unique across ALL properties | No duplicates system-wide |

### Available Property Status Values

- `active` - Occupied, normal access
- `vacant` - No resident assigned
- `access-restricted` - Limited access (e.g., payment issues)
- `maintenance` - Under repair
- `emergency-lockdown` - Emergency restriction
- `guest-mode` - Temporary guest access only
- `out-of-service` - Not usable
- `deactivated` - Disabled
- `archived` - Historical record

---

## Step 3: Create User Account

Creating a user involves **two parts**: Supabase Auth (for login) and Profile (for app data).

### Part A: Create in Supabase Auth

**Option 1: Invite by email (recommended)**
```typescript
// Using Supabase Admin API
const { data, error } = await supabase.auth.admin.inviteUserByEmail(
  'john.doe@example.com'
)
// User receives email invitation to set password
```

**Option 2: Create with password**
```typescript
const { data, error } = await supabase.auth.admin.createUser({
  email: 'john.doe@example.com',
  password: 'temporary-password',
  email_confirm: true
})
```

**Option 3: User self-registers**
```typescript
// User signs up themselves via the app
const { data, error } = await supabase.auth.signUp({
  email: 'john.doe@example.com',
  password: 'user-chosen-password'
})
```

### Part B: Create Profile Record

If not auto-created by database trigger:

```sql
INSERT INTO profile (
  id,                    -- MUST match auth.users.id (UUID)
  email,
  display_name,
  enabled,               -- Must be true to allow login
  status,                -- Must be 'active' to allow login
  language
) VALUES (
  'user-uuid-from-auth', -- Get this from Supabase Auth
  'john.doe@example.com',
  'John Doe',
  true,
  'active',
  'en'                   -- 'en', 'es', or 'pt'
);
```

### Key Rules

| Rule | Why |
|------|-----|
| `profile.id` MUST match `auth.users.id` | Links authentication to app data |
| `enabled` must be `true` | User cannot login if false |
| `status` must be `'active'` | User cannot login otherwise |
| Leave `def_community_id` NULL initially | Set after assigning to community |

### Available User Status Values

- `active` - Can login and use system
- `pending` - Account created, awaiting activation
- `suspended` - Temporarily blocked
- `inactive` - Account disabled
- `archived` - Historical record

---

## Step 4: Assign Role with Scope

**This determines what the user can access.**

### Understanding Scope Types

| Scope Type | Used By | Access Level |
|------------|---------|--------------|
| `global` | Super Admin | Everything in the system |
| `dealer` | Mega Dealer, Dealer | Their assigned communities |
| `community` | Administrator, Guard | Specific communities |
| `property` | Resident | Specific properties |

### Assigning Super Admin (Global Scope)

```sql
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type
  -- No scope_community_ids or scope_property_ids needed
) VALUES (
  'super-admin-uuid',
  (SELECT id FROM role WHERE role_name = 'Super Admin'),
  'global'
);
```

### Assigning Mega Dealer (Dealer Scope)

```sql
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_dealer_id,           -- Self-reference
  scope_community_ids        -- Communities they manage
) VALUES (
  'mega-dealer-uuid',
  (SELECT id FROM role WHERE role_name = 'Mega Dealer'),
  'dealer',
  'mega-dealer-uuid',        -- Points to themselves
  ARRAY['community-a', 'community-b', 'community-c']
);
```

### Assigning Dealer (Dealer Scope)

```sql
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_dealer_id,
  scope_community_ids
) VALUES (
  'dealer-uuid',
  (SELECT id FROM role WHERE role_name = 'Dealer'),
  'dealer',
  'dealer-uuid',
  ARRAY['sunset-gardens', 'ocean-view']
);
```

### Assigning Administrator (Community Scope)

```sql
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_community_ids        -- Array of community IDs
) VALUES (
  'admin-uuid',
  (SELECT id FROM role WHERE role_name = 'Administrator'),
  'community',
  ARRAY['sunset-gardens']    -- Can manage this community
);
```

### Assigning Guard (Community Scope)

```sql
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_community_ids
) VALUES (
  'guard-uuid',
  (SELECT id FROM role WHERE role_name = 'Guard'),
  'community',
  ARRAY['sunset-gardens']
);
```

### Assigning Resident (Property Scope)

```sql
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_property_ids         -- Array of property IDs
) VALUES (
  'resident-uuid',
  (SELECT id FROM role WHERE role_name = 'Resident'),
  'property',
  ARRAY['sunset-apt-101']    -- Can access this property
);
```

### Assigning Resident with Multiple Properties

```sql
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_property_ids
) VALUES (
  'resident-uuid',
  (SELECT id FROM role WHERE role_name = 'Resident'),
  'property',
  ARRAY['sunset-apt-101', 'sunset-apt-201', 'sunset-parking-12']
);
```

---

## Step 5: Create Relationship Record

**This links users to communities/properties and MUST match the scope!**

### For Administrator → `community_manager`

```sql
INSERT INTO community_manager (
  profile_id,
  community_id,
  property_id      -- NULL = manages entire community
) VALUES (
  'admin-uuid',
  'sunset-gardens',
  NULL
);
```

### For Administrator Managing Multiple Communities

```sql
INSERT INTO community_manager (profile_id, community_id, property_id)
VALUES
  ('admin-uuid', 'sunset-gardens', NULL),
  ('admin-uuid', 'ocean-view', NULL),
  ('admin-uuid', 'palm-beach', NULL);
```

### For Guard → `community_manager`

```sql
INSERT INTO community_manager (
  profile_id,
  community_id,
  property_id
) VALUES (
  'guard-uuid',
  'sunset-gardens',
  NULL
);
```

### For Resident → `property_owner`

```sql
INSERT INTO property_owner (
  profile_id,
  property_id,
  community_id     -- Include for easier querying
) VALUES (
  'resident-uuid',
  'sunset-apt-101',
  'sunset-gardens'
);
```

### For Resident with Multiple Properties

```sql
INSERT INTO property_owner (profile_id, property_id, community_id)
VALUES
  ('resident-uuid', 'sunset-apt-101', 'sunset-gardens'),
  ('resident-uuid', 'sunset-apt-201', 'sunset-gardens'),
  ('resident-uuid', 'sunset-parking-12', 'sunset-gardens');
```

### For Dealer → `dealer_administrators`

```sql
INSERT INTO dealer_administrators (
  dealer_id,
  administrator_id,
  assigned_community_ids,
  assigned_by
) VALUES (
  'dealer-uuid',
  'admin-uuid',
  ARRAY['sunset-gardens', 'ocean-view'],
  'dealer-uuid'
);
```

---

## Step 6: Set Defaults

**Optional but recommended** - improves user experience by pre-selecting community/property in forms.

### For Resident

```sql
UPDATE profile
SET
  def_community_id = 'sunset-gardens',
  def_property_id = 'sunset-apt-101'
WHERE id = 'resident-uuid';
```

### For Administrator

```sql
UPDATE profile
SET
  def_community_id = 'sunset-gardens',
  def_property_id = NULL  -- Admins don't need a default property
WHERE id = 'admin-uuid';
```

---

## Role Hierarchy

### Visual Hierarchy

```
👑 Super Admin (Level 1)
    │
    ├── 🏪 Mega Dealer (Level 2)
    │       │
    │       └── 💼 Dealer (Level 3)
    │               │
    │               └── 👨‍💼 Administrator (Level 4)
    │                       │
    │                       ├── 💂 Guard (Level 5)
    │                       │
    │                       └── 🏠 Resident (Level 6)
    │
    └── 👤 Client (Level 5) - External clients with limited access
```

### Who Creates What

| Role | Can Create |
|------|------------|
| **Super Admin** | Communities, Mega Dealers, Dealers, any user type |
| **Mega Dealer** | Dealers, Administrators, Communities (in their scope) |
| **Dealer** | Administrators, Guards, Communities (in their scope) |
| **Administrator** | Properties, Residents, Guards (in their community) |
| **Guard** | Nothing (read-only + gate control) |
| **Resident** | Visitor passes (for their properties only) |

### Role Permissions Summary

| Role | Communities | Properties | Users | Visitors | Gates |
|------|-------------|------------|-------|----------|-------|
| Super Admin | All CRUD | All CRUD | All CRUD | All CRUD | All |
| Mega Dealer | Scoped CRUD | Scoped CRUD | Scoped CRUD | Scoped | Scoped |
| Dealer | Scoped CRUD | Scoped CRUD | Scoped CRUD | Scoped | Scoped |
| Administrator | View scoped | Scoped CRUD | Scoped CRUD | Scoped CRUD | Scoped |
| Guard | View scoped | View scoped | View scoped | View/Update | Control |
| Resident | View own | View own | - | Own CRUD | - |

---

## Quick Checklists

### ✅ New Community Checklist

- [ ] Community record created in `community` table
- [ ] Unique, URL-friendly `id` assigned
- [ ] Status set to appropriate value (usually `active` or `pre-launch`)
- [ ] At least one Administrator assigned
- [ ] At least one property created (for testing)

### ✅ New Property Checklist

- [ ] Property record created in `property` table
- [ ] `community_id` references existing community
- [ ] Unique `id` (preferably includes community name)
- [ ] Status set to `vacant` (until resident assigned)

### ✅ New Administrator Checklist

- [ ] User exists in Supabase Auth
- [ ] Profile record exists with `enabled=true`, `status='active'`
- [ ] `profile_role` record with:
  - `role_id` = Administrator role
  - `scope_type` = `'community'`
  - `scope_community_ids` = array of community IDs
- [ ] `community_manager` record links admin to each community
- [ ] `def_community_id` set in profile (optional)

### ✅ New Guard Checklist

- [ ] User exists in Supabase Auth
- [ ] Profile record exists with `enabled=true`, `status='active'`
- [ ] `profile_role` record with:
  - `role_id` = Guard role
  - `scope_type` = `'community'`
  - `scope_community_ids` = array of community IDs
- [ ] `community_manager` record links guard to community
- [ ] `def_community_id` set in profile (optional)

### ✅ New Resident Checklist

- [ ] User exists in Supabase Auth
- [ ] Profile record exists with `enabled=true`, `status='active'`
- [ ] `profile_role` record with:
  - `role_id` = Resident role
  - `scope_type` = `'property'`
  - `scope_property_ids` = array of property IDs
- [ ] `property_owner` record links resident to each property
- [ ] `def_community_id` and `def_property_id` set in profile
- [ ] Property status updated to `active`

---

## Common Scenarios

### Scenario 1: Complete New Community Setup

```sql
BEGIN;

-- 1. Create community
INSERT INTO community (id, name, address, city, state, country, status)
VALUES ('sunset-gardens', 'Sunset Gardens', '123 Main St', 'Miami', 'FL', 'USA', 'active');

-- 2. Create properties
INSERT INTO property (id, name, address, community_id, status)
VALUES
  ('sunset-apt-101', 'Apt 101', 'Floor 1', 'sunset-gardens', 'vacant'),
  ('sunset-apt-102', 'Apt 102', 'Floor 1', 'sunset-gardens', 'vacant'),
  ('sunset-apt-201', 'Apt 201', 'Floor 2', 'sunset-gardens', 'vacant');

-- 3. Assign administrator (assume profile exists)
INSERT INTO profile_role (profile_id, role_id, scope_type, scope_community_ids)
VALUES (
  'admin-uuid',
  (SELECT id FROM role WHERE role_name = 'Administrator'),
  'community',
  ARRAY['sunset-gardens']
);

INSERT INTO community_manager (profile_id, community_id, property_id)
VALUES ('admin-uuid', 'sunset-gardens', NULL);

-- 4. Assign guard
INSERT INTO profile_role (profile_id, role_id, scope_type, scope_community_ids)
VALUES (
  'guard-uuid',
  (SELECT id FROM role WHERE role_name = 'Guard'),
  'community',
  ARRAY['sunset-gardens']
);

INSERT INTO community_manager (profile_id, community_id, property_id)
VALUES ('guard-uuid', 'sunset-gardens', NULL);

COMMIT;
```

### Scenario 2: Add Resident to Existing Property

```sql
BEGIN;

-- 1. Assign resident role (assume profile exists)
INSERT INTO profile_role (profile_id, role_id, scope_type, scope_property_ids)
VALUES (
  'resident-uuid',
  (SELECT id FROM role WHERE role_name = 'Resident'),
  'property',
  ARRAY['sunset-apt-101']
);

-- 2. Link resident to property
INSERT INTO property_owner (profile_id, property_id, community_id)
VALUES ('resident-uuid', 'sunset-apt-101', 'sunset-gardens');

-- 3. Set defaults
UPDATE profile
SET def_community_id = 'sunset-gardens', def_property_id = 'sunset-apt-101'
WHERE id = 'resident-uuid';

-- 4. Update property status
UPDATE property SET status = 'active' WHERE id = 'sunset-apt-101';

COMMIT;
```

### Scenario 3: Transfer Property to New Resident

```sql
BEGIN;

-- 1. Remove old resident
DELETE FROM property_owner
WHERE profile_id = 'old-resident-uuid' AND property_id = 'sunset-apt-101';

-- Update old resident's scope (if they have no other properties)
UPDATE profile_role
SET scope_property_ids = array_remove(scope_property_ids, 'sunset-apt-101')
WHERE profile_id = 'old-resident-uuid';

-- Clear old resident's defaults if this was their only property
UPDATE profile
SET def_community_id = NULL, def_property_id = NULL
WHERE id = 'old-resident-uuid'
  AND NOT EXISTS (SELECT 1 FROM property_owner WHERE profile_id = 'old-resident-uuid');

-- 2. Add new resident
INSERT INTO profile_role (profile_id, role_id, scope_type, scope_property_ids)
VALUES (
  'new-resident-uuid',
  (SELECT id FROM role WHERE role_name = 'Resident'),
  'property',
  ARRAY['sunset-apt-101']
)
ON CONFLICT (profile_id, role_id) DO UPDATE
SET scope_property_ids = array_append(profile_role.scope_property_ids, 'sunset-apt-101');

INSERT INTO property_owner (profile_id, property_id, community_id)
VALUES ('new-resident-uuid', 'sunset-apt-101', 'sunset-gardens');

UPDATE profile
SET def_community_id = 'sunset-gardens', def_property_id = 'sunset-apt-101'
WHERE id = 'new-resident-uuid';

COMMIT;
```

### Scenario 4: Promote Resident to Administrator

```sql
BEGIN;

-- Add Administrator role (keep Resident role)
INSERT INTO profile_role (profile_id, role_id, scope_type, scope_community_ids)
VALUES (
  'user-uuid',
  (SELECT id FROM role WHERE role_name = 'Administrator'),
  'community',
  ARRAY['sunset-gardens']
);

-- Add community manager record
INSERT INTO community_manager (profile_id, community_id, property_id)
VALUES ('user-uuid', 'sunset-gardens', NULL);

COMMIT;

-- User now has BOTH roles:
-- - Resident: can manage visitors for their property
-- - Administrator: can manage entire community
```

---

## Troubleshooting

### Problem: User Can't Login

**Check these in order:**

```sql
-- 1. Profile exists and is enabled
SELECT id, email, enabled, status FROM profile WHERE email = 'user@example.com';
-- Expected: enabled = true, status = 'active'

-- 2. User exists in Supabase Auth
-- Check in Supabase Dashboard → Authentication → Users
```

**Fixes:**
```sql
-- Enable profile
UPDATE profile SET enabled = true, status = 'active' WHERE email = 'user@example.com';
```

### Problem: User Can't See Community

```sql
-- 1. Check role assignment
SELECT r.role_name, pr.scope_type, pr.scope_community_ids
FROM profile_role pr
JOIN role r ON pr.role_id = r.id
WHERE pr.profile_id = 'user-uuid';

-- 2. Check relationship table
SELECT * FROM community_manager WHERE profile_id = 'user-uuid';
-- Or for residents:
SELECT * FROM property_owner WHERE profile_id = 'user-uuid';

-- 3. Verify community exists
SELECT * FROM community WHERE id = 'community-id';
```

**Common fixes:**
- Add community to `scope_community_ids` array
- Create `community_manager` record
- Verify community ID spelling matches exactly

### Problem: Resident Can't Create Visitors

```sql
-- Check complete resident setup
SELECT
  p.email,
  p.enabled,
  p.status,
  r.role_name,
  pr.scope_type,
  pr.scope_property_ids,
  po.property_id,
  po.community_id
FROM profile p
JOIN profile_role pr ON p.id = pr.profile_id
JOIN role r ON pr.role_id = r.id
LEFT JOIN property_owner po ON p.id = po.profile_id
WHERE p.id = 'resident-uuid';
```

**Common issues:**
1. `scope_property_ids` doesn't include the property
2. Missing `property_owner` record
3. Property doesn't exist

### Problem: Scope Mismatch

```sql
-- Find mismatches between profile_role and property_owner
SELECT
  pr.profile_id,
  pr.scope_property_ids as role_scope,
  array_agg(po.property_id) as actual_ownership
FROM profile_role pr
LEFT JOIN property_owner po ON pr.profile_id = po.profile_id
WHERE pr.scope_type = 'property'
GROUP BY pr.profile_id, pr.scope_property_ids
HAVING pr.scope_property_ids IS DISTINCT FROM array_agg(po.property_id);
```

**Fix:** Ensure `scope_property_ids` matches `property_owner` records

---

## Related Documentation

- [COMMUNITY_USER_PROPERTY_GUIDE.md](./COMMUNITY_USER_PROPERTY_GUIDE.md) - Detailed entity relationships
- [DATA_MODEL_WORKFLOWS.md](./DATA_MODEL_WORKFLOWS.md) - Visual workflows and diagrams
- [SCOPE_SYSTEM_GUIDE.md](./SCOPE_SYSTEM_GUIDE.md) - Complete scope reference
- [RBAC_GUIDE.md](./RBAC_GUIDE.md) - Role-based access control details
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Authentication and user management
