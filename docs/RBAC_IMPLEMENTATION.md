# RBAC Implementation Guide

This guide documents the complete Role-Based Access Control (RBAC) system implementation for PortunCmd.

## Table of Contents
- [Overview](#overview)
- [Phase 1: Role Management Foundation](#phase-1-role-management-foundation)
- [Phase 2: Advanced Features](#phase-2-advanced-features)
- [Database Schema](#database-schema)
- [Components](#components)
- [API Integration](#api-integration)

---

## Overview

PortunCmd implements a sophisticated **scope-based RBAC system** with:
- **5 Core Roles**: Super Admin, Dealer, Administrator, Guard, Resident
- **34 Granular Permissions** across 9 resource types
- **Multi-level Scopes**: Global, Dealer, Community, Property
- **Hierarchical Access Control**: Dealers → Administrators → Communities → Properties

### System Architecture

```
┌─────────────────────────────────────────┐
│           Super Admin                    │
│         (Global Scope)                   │
│     All 34 permissions                   │
└──────────────┬──────────────────────────┘
               │
     ┌─────────┴─────────┐
     │                   │
┌────▼─────┐      ┌─────▼────┐
│  Dealer  │      │  Dealer  │
│ (Dealer  │      │ (Dealer  │
│  Scope)  │      │  Scope)  │
│10 perms  │      │10 perms  │
└────┬─────┘      └─────┬────┘
     │                  │
  ┌──▼───┐          ┌──▼───┐
  │Admin │          │Admin │
  │(Comm)│          │(Comm)│
  │15perm│          │15perm│
  └──┬───┘          └──┬───┘
     │                 │
  ┌──▼──┐          ┌──▼──┐
  │Guard│          │Resid│
  │6perm│          │4perm│
  └─────┘          └─────┘
```

---

## Phase 1: Role Management Foundation

**Status**: ✅ Complete
**Completion Date**: November 15, 2025

### Features Implemented

#### 1. Real-Time Role Cards
**Location**: `/apps/roles`

**Features**:
- Fetches live role data from Supabase `role` table
- Displays actual user counts from `profile_role` table
- Shows permission counts from `role_permissions` table
- Status indicators (Enabled/Disabled) with color-coded chips
- Custom role ordering: Super Admin → Dealer → Administrator → Guard → Resident
- Role-specific icons and colors

**Technical Implementation**:
```typescript
// Fetch roles with counts
const { data: rolesData } = await supabase
  .from('role')
  .select('id, role_name, enabled')

// Get user count per role
const { count: userCount } = await supabase
  .from('profile_role')
  .select('*', { count: 'exact', head: true })
  .eq('role_id', role.id)

// Get permission count per role
const { count: permissionCount } = await supabase
  .from('role_permissions')
  .select('*', { count: 'exact', head: true })
  .eq('role_id', role.id)
```

**Role Card Data**:
| Role | Users | Permissions | Icon | Color |
|------|-------|-------------|------|-------|
| Super Admin | 3 | 34 | 👑 Crown | Red |
| Dealer | 4 | 10 | 💼 Briefcase | Orange |
| Administrator | 2 | 15 | 🛡️ Shield | Blue |
| Guard | 1 | 6 | 🔒 Shield Lock | Cyan |
| Resident | 3 | 4 | 🏠 Home | Green |

#### 2. Status Filters
**Features**:
- Filter roles by status (All / Enabled / Disabled)
- Scope filter placeholder (disabled, coming in Phase 2)
- Real-time filtering without page reload
- Filter state persists during role operations

#### 3. Permission Management Dialog
**Location**: `AddEditRoleDialog.vue`

**Features**:
- Fetches all 34 permissions from database
- Groups permissions by resource type (9 groups)
- Shows which permissions each role has (pre-checked)
- Collapsible expansion panels per resource
- Progress indicators per group ("6 / 10 selected")
- Total permission count display
- "Select All" functionality
- Permission descriptions in tooltips

**Permission Groups**:
```
📋 Community (10 permissions)
  - communities:view_all (Super Admin only)
  - communities:view_own (3 roles)
  - communities:create
  - communities:manage
  - communities:update
  - communities:delete

🏠 Property (5 permissions)
  - properties:view_all
  - properties:view_own
  - properties:create
  - properties:manage
  - properties:delete

👥 Resident (4 permissions)
  - residents:view
  - residents:create
  - residents:update
  - residents:delete

🚪 Visitor (5 permissions)
  - visitors:view
  - visitors:create
  - visitors:approve
  - visitors:revoke
  - visitors:manage

⚡ Automation (4 permissions)
  - automation:view
  - automation:control
  - automation:manage
  - automation:configure

👨‍💼 Administrator (2 permissions)
  - administrators:view
  - administrators:manage

📊 Analytics (3 permissions)
  - analytics:view
  - analytics:export
  - analytics:dashboard

🔔 Notification (2 permissions)
  - notifications:view
  - notifications:send

⚙️ System (3 permissions)
  - system:settings
  - system:backup
  - system:logs
```

#### 4. Component Structure

**Files Modified**:
- `src/views/apps/roles/RoleCards.vue` - Main role cards display
- `src/components/dialogs/AddEditRoleDialog.vue` - Permission editor
- `src/pages/apps/roles/index.vue` - Role management page

**Key Functions**:
```typescript
// RoleCards.vue
fetchRoles() // Fetch all roles with counts
filteredRoles() // Apply status filters
resolveRoleVariant() // Get role icon and color

// AddEditRoleDialog.vue
fetchPermissions() // Fetch all permissions grouped by resource
updateSelectAll() // Handle select all checkbox
onSubmit() // Emit selected permissions (ready for save)
```

### Database Tables Used

#### `role`
- `id` (uuid) - Primary key
- `role_name` (text) - Role name (Super Admin, Dealer, etc.)
- `enabled` (boolean) - Role status
- `created_at`, `updated_at` (timestamptz)

#### `profile_role`
- `profile_id` (uuid) - User ID
- `role_id` (uuid) - Role ID
- `scope_type` (varchar) - global, dealer, community, property
- `scope_dealer_id` (uuid) - For dealer scope
- `scope_community_ids` (text[]) - For community scope
- `scope_property_ids` (text[]) - For property scope
- `granted_by` (uuid) - Who granted the role
- `granted_at` (timestamptz) - When granted
- `expires_at` (timestamptz) - Optional expiration

#### `permissions`
- `id` (uuid) - Primary key
- `name` (varchar) - Unique permission identifier
- `resource` (varchar) - Resource type (community, property, etc.)
- `action` (varchar) - Action type (create, read, update, delete, manage)
- `description` (text) - Permission description

#### `role_permissions`
- `role_id` (uuid) - Role ID
- `permission_id` (uuid) - Permission ID
- Junction table linking roles to permissions

---

## Phase 2: Advanced Features

**Status**: 🚧 In Progress
**Start Date**: November 15, 2025

### Planned Features

#### 1. Scope-Based Role Assignment
**Goal**: Allow assigning roles with specific scopes (community/property restrictions)

**UI Components**:
- Scope type selector (Global, Dealer, Community, Property)
- Community multi-select (for community-scoped roles)
- Property multi-select (for property-scoped roles)
- Dealer selector (for dealer-scoped roles)
- Visual scope indicators on role cards

**Implementation**:
```typescript
interface ScopeAssignment {
  scopeType: 'global' | 'dealer' | 'community' | 'property'
  scopeDealerId?: string
  scopeCommunityIds?: string[]
  scopePropertyIds?: string[]
}
```

#### 2. Permission Matrix View
**Goal**: Display all roles × permissions in a grid for quick comparison

**Layout**:
```
                Community  Community  Property  Property  ...
                view_all   create     view_all  create
┌─────────────┼──────────┼──────────┼─────────┼─────────┼───
│ Super Admin │    ✓     │    ✓     │    ✓    │    ✓    │
│ Dealer      │    ✗     │    ✓     │    ✗    │    ✓    │
│ Admin       │    ✗     │    ✓     │    ✓    │    ✓    │
│ Guard       │    ✗     │    ✗     │    ✓    │    ✗    │
│ Resident    │    ✗     │    ✗     │    ✓    │    ✗    │
```

**Features**:
- Filterable by resource type
- Click to toggle permissions
- Export to CSV
- Bulk operations

#### 3. Save Permission Changes
**Goal**: Persist permission changes to database

**API Endpoints**:
```typescript
// Add permissions to role
POST /api/roles/:roleId/permissions
Body: { permissionIds: string[] }

// Remove permissions from role
DELETE /api/roles/:roleId/permissions
Body: { permissionIds: string[] }

// Update role permissions (replace all)
PUT /api/roles/:roleId/permissions
Body: { permissionIds: string[] }
```

**Implementation**:
```typescript
async function saveRolePermissions(roleId: string, permissionIds: string[]) {
  // Delete existing permissions
  await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)

  // Insert new permissions
  const records = permissionIds.map(permId => ({
    role_id: roleId,
    permission_id: permId
  }))

  await supabase
    .from('role_permissions')
    .insert(records)
}
```

#### 4. Bulk Role Assignment
**Goal**: Assign roles to multiple users at once

**Features**:
- Multi-user selector
- Role selector
- Scope configuration
- Preview affected users
- Confirmation dialog

#### 5. Role Delegation Tracking
**Goal**: Track who granted roles and when

**Features**:
- Display "Granted by" on role cards
- Show grant date/time
- Expiration date support
- Role assignment history

#### 6. Dealer-Administrator Management
**Goal**: Leverage the `dealer_administrators` table

**Features**:
- Dealer dashboard showing their administrators
- Assign administrators to dealers
- Set community restrictions per admin
- Track administrator performance
- Visualize dealer hierarchy

---

## API Integration

### Supabase Client Setup
```typescript
import { supabase } from '@/lib/supabase'
```

### Common Queries

**Get User's Roles**:
```typescript
const { data: userRoles } = await supabase
  .from('profile_role')
  .select(`
    role_id,
    scope_type,
    scope_community_ids,
    role!profile_role_role_id_fkey(role_name)
  `)
  .eq('profile_id', userId)
```

**Get Role Permissions**:
```typescript
const { data: permissions } = await supabase
  .from('role_permissions')
  .select(`
    permission:permission_id(
      id,
      name,
      resource,
      action,
      description
    )
  `)
  .eq('role_id', roleId)
```

**Check User Permission**:
```typescript
async function userHasPermission(
  userId: string,
  permissionName: string
): Promise<boolean> {
  const { data } = await supabase
    .from('profile_role')
    .select(`
      role:role_id(
        role_permissions(
          permission:permission_id(name)
        )
      )
    `)
    .eq('profile_id', userId)

  // Check if any role has the permission
  return data?.some(pr =>
    pr.role?.role_permissions?.some(rp =>
      rp.permission?.name === permissionName
    )
  )
}
```

---

## Best Practices

### 1. Permission Naming Convention
Format: `resource:action`
- Use lowercase
- Plural resource names (communities, properties)
- Standard actions: view, create, update, delete, manage
- Special cases: approve, revoke, control, configure

### 2. Scope Hierarchy
```
Global > Dealer > Community > Property
```
- Global scope can access everything
- Dealer scope restricted to dealer's communities
- Community scope restricted to specific communities
- Property scope restricted to specific properties

### 3. Permission Checks
Always check permissions on:
- Page navigation (router guards)
- Component rendering (v-if with ability.can())
- API calls (backend RLS policies)
- Button/action visibility

### 4. Role Assignment
- Always set `granted_by` for audit trail
- Set `granted_at` timestamp
- Consider setting `expires_at` for temporary access
- Validate scope matches role requirements

---

## Troubleshooting

### Issue: Permissions not showing in dialog
**Solution**: Check that `role_permissions` table has records for the role

### Issue: User count showing 0
**Solution**: Verify `profile_role` table has assignments

### Issue: Scope filter not working
**Solution**: Phase 2 feature - currently disabled with tooltip

### Issue: Select All not working
**Solution**: Ensure `permissionGroups` is populated before interaction

---

## Future Enhancements

### Phase 3 (Planned)
- Role templates and cloning
- Permission dependency management
- Audit trail with change history
- Permission usage analytics
- Smart permission recommendations
- Compliance reporting
- Role hierarchy visualization
- Temporary role assignments with auto-expiry
- Role inheritance system

---

## Changelog

### Phase 1 (November 15, 2025)
- ✅ Implemented real-time role cards with database data
- ✅ Added status filters (Enabled/Disabled)
- ✅ Created permission management dialog with grouped permissions
- ✅ Added role-specific icons and colors
- ✅ Implemented custom role ordering
- ✅ Added loading states throughout
- ✅ Integrated with Supabase database

### Phase 2 (In Progress)
- 🚧 Scope-based role assignment interface
- 🚧 Permission matrix view
- 🚧 Save permission changes functionality
- 🚧 Bulk role assignment
- 🚧 Role delegation tracking

---

## References

- [RBAC Guide](./RBAC_GUIDE.md) - Original RBAC system design
- [Supabase Schema](./SUPABASE_SCHEMA.md) - Complete database schema
- [Authentication Guide](./AUTHENTICATION.md) - User auth and sessions
- Main implementation: `/apps/roles`
- Permission dialog: `src/components/dialogs/AddEditRoleDialog.vue`
- Role cards: `src/views/apps/roles/RoleCards.vue`
