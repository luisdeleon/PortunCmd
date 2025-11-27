# Supabase Row Level Security (RLS) Policies

This document provides a comprehensive overview of all RLS policies configured in the PortunCmd database. It explains what each policy does, which roles can access what data, and the current status of RLS on each table.

## Table of Contents

1. [Overview](#overview)
2. [RLS Status Summary](#rls-status-summary)
3. [Tables with RLS Enabled](#tables-with-rls-enabled)
   - [profile](#profile-table)
   - [community](#community-table)
   - [property](#property-table)
   - [status_history](#status_history-table)
4. [Tables with Policies but RLS Disabled](#tables-with-policies-but-rls-disabled)
   - [automation_devices](#automation_devices-table)
   - [visitor_records_uid](#visitor_records_uid-table)
5. [Tables Without RLS](#tables-without-rls)
6. [Role Hierarchy Reference](#role-hierarchy-reference)
7. [Common Policy Patterns](#common-policy-patterns)
8. [Recommendations](#recommendations)

---

## Overview

Row Level Security (RLS) is a PostgreSQL feature that restricts which rows users can access in a table based on policies. In Supabase, RLS is critical for securing your data when using the public API.

### How RLS Works

1. **RLS Enabled**: When enabled, ALL access is denied by default unless a policy explicitly allows it
2. **Policies**: Define WHO can do WHAT on WHICH rows
3. **Operations**: SELECT, INSERT, UPDATE, DELETE, or ALL
4. **Permissive vs Restrictive**: Permissive policies are OR'd together (any matching policy grants access)

### Current Security Warnings

The Supabase Security Advisor shows these warnings:

| Warning Type | Count | Description |
|-------------|-------|-------------|
| RLS Disabled in Public | 13 tables | Tables exposed to API without RLS protection |
| Policy Exists RLS Disabled | 2 tables | Policies created but RLS not enabled |

---

## RLS Status Summary

| Table | RLS Enabled | RLS Forced | Has Policies | Status |
|-------|-------------|------------|--------------|--------|
| `profile` | Yes | Yes | Yes (14 policies) | **SECURE** |
| `community` | Yes | Yes | Yes (9 policies) | **SECURE** |
| `property` | Yes | Yes | Yes (9 policies) | **SECURE** |
| `status_history` | Yes | No | Yes (2 policies) | **SECURE** |
| `automation_devices` | No | No | Yes (5 policies) | **WARNING** - Policies exist but RLS disabled |
| `visitor_records_uid` | No | No | Yes (10 policies) | **WARNING** - Policies exist but RLS disabled |
| `visitor_record_logs` | No | No | No | **EXPOSED** - No protection |
| `property_owner` | No | No | No | **EXPOSED** - No protection |
| `profile_role` | No | No | No | **EXPOSED** - No protection |
| `role` | No | No | No | **EXPOSED** - No protection |
| `permissions` | No | No | No | **EXPOSED** - No protection |
| `role_permissions` | No | No | No | **EXPOSED** - No protection |
| `dealer_administrators` | No | No | No | **EXPOSED** - No protection |
| `community_manager` | No | No | No | **EXPOSED** - No protection |
| `notifications` | No | No | No | **EXPOSED** - No protection |
| `notification_users` | No | No | No | **EXPOSED** - No protection |
| `translations` | No | No | No | **EXPOSED** - No protection |

---

## Tables with RLS Enabled

### profile Table

The `profile` table stores user information and is one of the most protected tables.

#### Policies

| Policy Name | Operation | Description |
|-------------|-----------|-------------|
| **Users can view their own profile** | SELECT | Users can always see their own profile data |
| **Users can update their own profile** | UPDATE | Users can modify their own profile information |
| **Super Admins can view all profiles** | SELECT | Super Admins with global scope can see all users |
| **Super Admins can insert profiles** | INSERT | Only Super Admins can create new profiles |
| **Super Admins can update any profile** | UPDATE | Super Admins can modify any user's profile |
| **Super Admins can delete profiles** | DELETE | Only Super Admins can delete user profiles |
| **Administrators can view users in their communities** | SELECT | Admins see residents (via property_owner) and Guards/Clients in their assigned communities |
| **Guards can view residents in their communities** | SELECT | Guards can see residents who own properties in their communities |
| **Dealers can view their administrators** | SELECT | Dealers see admins assigned to them via dealer_administrators |
| **Dealers can view users in their communities** | SELECT | Dealers see all users in communities assigned to their administrators |
| **Mega Dealers can view their dealers** | SELECT | Mega Dealers see Dealers under their scope |
| **Mega Dealers can view administrators under their dealers** | SELECT | Mega Dealers see Admins under their Dealers |
| **Mega Dealers can view users in their dealers communities** | SELECT | Mega Dealers see residents in communities under their hierarchy |

#### Policy Details

**Users can view their own profile**
```sql
-- Condition: User ID matches authenticated user
qual: (id = auth.uid())
```

**Administrators can view users in their communities**
```sql
-- Complex policy that:
-- 1. Checks user is an Administrator with community scope
-- 2. Returns profiles that are either:
--    a. Property owners in admin's communities
--    b. Guards/Clients with overlapping community assignments
```

---

### community Table

The `community` table stores residential community/condominium information.

#### Policies

| Policy Name | Operation | Description |
|-------------|-----------|-------------|
| **Super Admins can view all communities** | SELECT | Global scope Super Admins see all communities |
| **Super Admins can insert communities** | INSERT | Only Super Admins can create communities |
| **Super Admins can delete non-archived communities** | DELETE | Super Admins can delete (except archived) |
| **Admins can update non-archived communities** | UPDATE | Super Admins or Admins (within scope) can update |
| **Administrators can view assigned communities** | SELECT | Admins see communities in their scope_community_ids |
| **Guards can view assigned communities** | SELECT | Guards see communities in their scope_community_ids |
| **Dealers can view their communities** | SELECT | Dealers see communities assigned to their admins |
| **Mega Dealers can view communities under their dealers** | SELECT | Mega Dealers see communities through their dealer hierarchy |
| **Residents can view their communities** | SELECT | Residents see communities where they own property |

#### Policy Details

**Admins can update non-archived communities**
```sql
-- Conditions:
-- 1. Community status is NOT 'archived'
-- 2. User is either:
--    a. Super Admin, OR
--    b. Administrator with this community in their scope
```

**Residents can view their communities**
```sql
-- Checks property_owner table for community membership
qual: EXISTS (
  SELECT 1 FROM property_owner po
  WHERE po.profile_id = auth.uid()
    AND po.community_id = community.id
)
```

---

### property Table

The `property` table stores individual units/properties within communities.

#### Policies

| Policy Name | Operation | Description |
|-------------|-----------|-------------|
| **Super Admins can view all properties** | SELECT | Global scope Super Admins see all properties |
| **Super Admins can delete properties** | DELETE | Only Super Admins can delete properties |
| **Super Admins and Admins can insert properties** | INSERT | Super Admins or scoped Admins can create properties |
| **Super Admins and Admins can update properties** | UPDATE | Super Admins or scoped Admins can modify properties |
| **Administrators can view properties in communities** | SELECT | Admins see properties in their assigned communities |
| **Guards can view properties in communities** | SELECT | Guards see properties in their assigned communities |
| **Dealers can view properties in their communities** | SELECT | Dealers see properties in their assigned communities |
| **Mega Dealers can view properties under their dealers** | SELECT | Mega Dealers see properties through dealer hierarchy |
| **Residents can view their properties** | SELECT | Residents see only properties they own |

#### Policy Details

**Super Admins and Admins can insert properties**
```sql
-- WITH CHECK ensures new properties:
-- 1. Can be created by Super Admin anywhere, OR
-- 2. Can be created by Admin only in their assigned communities
with_check: EXISTS (
  SELECT 1 FROM profile_role pr
  JOIN role r ON pr.role_id = r.id
  WHERE pr.profile_id = auth.uid()
    AND (r.role_name = 'Super Admin'
         OR (r.role_name = 'Administrator'
             AND property.community_id = ANY(pr.scope_community_ids)))
)
```

---

### status_history Table

Tracks status changes for users, communities, and properties.

#### Policies

| Policy Name | Operation | Description |
|-------------|-----------|-------------|
| **Users can view status history** | SELECT | All authenticated users can read history |
| **Only functions can insert status history** | INSERT | Direct inserts are blocked (only DB functions can insert) |

#### Policy Details

**Only functions can insert status history**
```sql
-- WITH CHECK = false means no direct inserts allowed
-- Status history is inserted via SECURITY DEFINER functions like:
-- change_user_status(), change_community_status(), change_property_status()
with_check: false
```

---

## Tables with Policies but RLS Disabled

These tables have policies defined but RLS is NOT enabled, meaning the policies have NO EFFECT.

### automation_devices Table

IoT devices for gate control and automation.

#### Policies (NOT ACTIVE - RLS Disabled)

| Policy Name | Operation | Description |
|-------------|-----------|-------------|
| **Super Admins can manage automation devices** | ALL | Full CRUD access for Super Admins |
| **Super Admins can view all automation devices** | SELECT | Redundant with above |
| **Administrators can view devices in communities** | SELECT | Admins see devices in their communities |
| **Administrators can update devices in communities** | UPDATE | Admins can modify devices in their communities |
| **Guards can view devices in communities** | SELECT | Guards can see devices in their communities |

#### To Enable

```sql
ALTER TABLE public.automation_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_devices FORCE ROW LEVEL SECURITY;
```

---

### visitor_records_uid Table

Visitor passes with QR codes for access control.

#### Policies (NOT ACTIVE - RLS Disabled)

| Policy Name | Operation | Description |
|-------------|-----------|-------------|
| **Hosts can view their visitor records** | SELECT | Users see passes they created |
| **Hosts can update their visitor records** | UPDATE | Users can modify their own passes |
| **Hosts and Super Admins can delete visitor records** | DELETE | Owners or Super Admins can delete passes |
| **Active users can create visitors for active properties** | INSERT | Complex policy checking property status and user status |
| **Super Admins can view all visitor records** | SELECT | Global access for Super Admins |
| **Administrators can view visitor records in communities** | SELECT | Admins see passes in their communities |
| **Administrators can update visitor records** | UPDATE | Admins can modify passes in their scope |
| **Guards can view visitor records in communities** | SELECT | Guards see passes in their communities |
| **Guards can update visitor records in communities** | UPDATE | Guards can mark passes as used, etc. |
| **Dealers can view visitor records in communities** | SELECT | Dealers see passes in their communities |

#### Policy Details

**Active users can create visitors for active properties**
```sql
-- Complex INSERT policy that checks:
-- 1. Target property is 'active' or 'guest-mode'
-- 2. Either:
--    a. User is the host AND user status is 'active', OR
--    b. User is Admin/Super Admin AND user status is 'active'
```

#### To Enable

```sql
ALTER TABLE public.visitor_records_uid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_records_uid FORCE ROW LEVEL SECURITY;
```

---

## Tables Without RLS

These tables have NO policies and NO RLS protection. Anyone with the anon key can access all data.

### Critical Tables (Should Have RLS)

| Table | Purpose | Risk Level | Recommendation |
|-------|---------|------------|----------------|
| `visitor_record_logs` | Entry/exit logs | **HIGH** | Needs RLS - contains sensitive access data |
| `property_owner` | User-property relationships | **HIGH** | Needs RLS - exposes who owns what |
| `profile_role` | User role assignments | **HIGH** | Needs RLS - exposes permissions |
| `dealer_administrators` | Dealer-admin relationships | **MEDIUM** | Needs RLS - business relationship data |

### Reference Tables (Lower Priority)

| Table | Purpose | Risk Level | Recommendation |
|-------|---------|------------|----------------|
| `role` | Role definitions | **LOW** | Read-only data, consider SELECT-only for authenticated |
| `permissions` | Permission definitions | **LOW** | Read-only data, consider SELECT-only for authenticated |
| `role_permissions` | Role-permission mappings | **LOW** | Read-only data, consider SELECT-only for authenticated |
| `translations` | i18n strings | **LOW** | Public read is probably acceptable |

### Notification Tables

| Table | Purpose | Risk Level | Recommendation |
|-------|---------|------------|----------------|
| `notifications` | System notifications | **MEDIUM** | Needs RLS - should scope to user |
| `notification_users` | User notification settings | **MEDIUM** | Needs RLS - personal settings |
| `community_manager` | Manager assignments | **MEDIUM** | Needs RLS - operational data |

---

## Role Hierarchy Reference

Understanding the role hierarchy is essential for RLS policies:

| Level | Role | Scope Type | Access Pattern |
|-------|------|------------|----------------|
| 1 | Super Admin | `global` | Can access everything |
| 2 | Mega Dealer | `dealer` | Accesses through dealer hierarchy |
| 3 | Dealer | `dealer` | Accesses assigned communities via `dealer_administrators` |
| 4 | Administrator | `community` | Accesses `scope_community_ids` array |
| 5 | Guard | `community` | Accesses `scope_community_ids` array |
| 5 | Client | `community` | Accesses `scope_community_ids` array |
| 6 | Resident | `property` | Accesses via `property_owner` table |

### Scope Resolution

```
Super Admin (global)
    └── ALL data

Mega Dealer
    └── profile_role.scope_dealer_id = mega_dealer_id
        └── Dealers under this Mega Dealer
            └── dealer_administrators.assigned_community_ids
                └── Communities, Properties, Users in those communities

Dealer
    └── dealer_administrators.dealer_id = dealer_id
        └── assigned_community_ids
            └── Communities, Properties, Users

Administrator/Guard/Client
    └── profile_role.scope_community_ids
        └── Direct community access

Resident
    └── property_owner.profile_id = user_id
        └── Properties they own
            └── Communities those properties are in
```

---

## Common Policy Patterns

### Pattern 1: Super Admin Global Access

```sql
-- Check if user is Super Admin with global scope
EXISTS (
  SELECT 1 FROM profile_role pr
  JOIN role r ON pr.role_id = r.id
  WHERE pr.profile_id = auth.uid()
    AND r.role_name = 'Super Admin'
    AND pr.scope_type = 'global'
)
```

### Pattern 2: Community-Scoped Access

```sql
-- Check if user has community in their scope
EXISTS (
  SELECT 1 FROM profile_role pr
  WHERE pr.profile_id = auth.uid()
    AND pr.scope_type = 'community'
    AND target_table.community_id = ANY(pr.scope_community_ids)
)
```

### Pattern 3: Role-Specific Community Access

```sql
-- Check specific role with community scope
EXISTS (
  SELECT 1 FROM profile_role pr
  JOIN role r ON pr.role_id = r.id
  WHERE pr.profile_id = auth.uid()
    AND r.role_name = 'Administrator'
    AND pr.scope_type = 'community'
    AND target_table.community_id = ANY(pr.scope_community_ids)
)
```

### Pattern 4: Owner Access

```sql
-- Simple owner check
owner_id = auth.uid()
-- or
host_uid = auth.uid()
```

### Pattern 5: Dealer Hierarchy Access

```sql
-- Dealer accessing through dealer_administrators
EXISTS (
  SELECT 1 FROM dealer_administrators da
  WHERE da.dealer_id = auth.uid()
    AND da.is_active = true
    AND target_table.community_id = ANY(da.assigned_community_ids)
)
```

---

## Recommendations

### Immediate Actions (High Priority)

1. **Enable RLS on `automation_devices`**
   - Policies already exist
   - Just needs `ENABLE ROW LEVEL SECURITY`

2. **Enable RLS on `visitor_records_uid`**
   - Policies already exist
   - Just needs `ENABLE ROW LEVEL SECURITY`

3. **Create policies for `visitor_record_logs`**
   - Contains sensitive entry/exit data
   - Should follow similar patterns to `visitor_records_uid`

4. **Create policies for `property_owner`**
   - Exposes property ownership
   - Should be read-only for most users

### Medium Priority

5. **Create policies for `profile_role`**
   - Users should only see their own roles
   - Admins should see roles for users in their scope

6. **Create policies for `dealer_administrators`**
   - Dealers should see their own admin assignments
   - Admins should see if they're assigned to a dealer

### Lower Priority

7. **Create simple SELECT policies for reference tables**
   - `role`, `permissions`, `role_permissions`
   - Allow authenticated users to read
   - Block all writes except for Super Admin

8. **Create policies for notification tables**
   - Users should only see their own notifications

---

## SQL to Enable RLS on Tables with Existing Policies

```sql
-- Enable RLS on automation_devices (has 5 policies ready)
ALTER TABLE public.automation_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_devices FORCE ROW LEVEL SECURITY;

-- Enable RLS on visitor_records_uid (has 10 policies ready)
ALTER TABLE public.visitor_records_uid ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_records_uid FORCE ROW LEVEL SECURITY;
```

**WARNING**: Before enabling RLS, ensure:
1. All necessary policies exist for your use cases
2. Service role key is used for backend operations that bypass RLS
3. Test thoroughly in a development environment first

---

## Testing RLS Policies

To test policies, you can use Supabase's `auth.uid()` simulation:

```sql
-- Set a test user context
SET request.jwt.claim.sub = 'user-uuid-here';

-- Run queries to test what they can see
SELECT * FROM profile;
SELECT * FROM community;

-- Reset
RESET request.jwt.claim.sub;
```

Or use the Supabase client with different user tokens to verify access patterns.

---

*Last Updated: November 2024*
*Document generated from live database policies*
