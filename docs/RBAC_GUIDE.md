# PortunCmd Role-Based Access Control (RBAC) System Guide

## Table of Contents

1. [Overview](#overview)
2. [Current System Analysis](#current-system-analysis)
3. [Role Hierarchy & Permissions](#role-hierarchy--permissions)
4. [Identified Issues](#identified-issues)
5. [Recommended Solution](#recommended-solution)
6. [Database Schema Changes](#database-schema-changes)
7. [Implementation Phases](#implementation-phases)
8. [Detailed Process Flows](#detailed-process-flows)
9. [Code Implementation](#code-implementation)
10. [Row Level Security (RLS)](#row-level-security-rls)
11. [Testing Strategy](#testing-strategy)
12. [Migration Path](#migration-path)

---

## Overview

PortunCmd is a multi-tenant property management system with visitor access control and IoT automation. The system requires a sophisticated role-based access control mechanism to support hierarchical data access across multiple communities, properties, and user types.

### System Requirements

- Multi-tenant architecture supporting multiple communities
- Hierarchical role structure (Super Admin → Dealer → Administrator → Resident)
- Scoped data access based on role and assignment
- Flexible permissions system for future extensibility
- Audit trail for access changes

---

## Current System Analysis

### Existing Tables

#### `profile`
User profiles linked to Supabase auth.users.

```typescript
{
  id: string                    // UUID, matches auth.users.id
  email: string                 // User email
  display_name: string | null   // User's display name
  enabled: boolean              // Account status
  def_community_id: string      // Default community
  def_property_id: string       // Default property
  language: string              // Preferred language
  created_at: timestamp
  updated_at: timestamp
}
```

#### `role`
Role definitions.

```typescript
{
  id: string                    // UUID
  role_name: string             // 'Super Admin', 'Dealer', 'Administrator', 'Resident', 'Guard', 'Client'
  enabled: boolean              // Role active status
  created_at: timestamp
  updated_at: timestamp
}
```

#### `profile_role`
Many-to-many relationship between profiles and roles.

```typescript
{
  id: string                    // UUID
  profile_id: string            // FK to profile
  role_id: string               // FK to role
  path: string | null           // Currently unused
  created_at: timestamp
  updated_at: timestamp
}
```

#### `community_manager`
Tracks managers assigned to communities (currently unclear purpose).

```typescript
{
  id: string
  profile_id: string            // FK to profile
  community_id: string          // FK to community
  property_id: string           // FK to property (why both?)
  created_at: timestamp
  updated_at: timestamp
}
```

#### `property_owner`
Links residents to their properties.

```typescript
{
  id: string
  profile_id: string            // FK to profile
  community_id: string          // FK to community
  property_id: string           // FK to property
  created_at: timestamp
  updated_at: timestamp
}
```

### Current Authentication Flow

Located in `src/composables/useAuth.ts`:

1. User authenticates with Supabase
2. Profile fetched from `profile` table
3. User roles fetched from `profile_role` joined with `role`
4. Primary role determined (admin takes precedence)
5. Hardcoded ability rules generated based on role:
   - Admin roles → `{ action: 'manage', subject: 'all' }`
   - Other roles → `{ action: 'read', subject: 'AclDemo' }`
6. Session data stored in cookies

### Current Limitations

1. **No granular permissions** - Only two permission levels exist
2. **No scope enforcement** - Admins can see all data, not just their communities
3. **No dealer-administrator relationship** - No way to track which admins work under which dealers
4. **Hardcoded permissions** - Changes require code deployment
5. **No audit trail** - Cannot track who granted access or when
6. **Unclear table purposes** - `community_manager` table structure doesn't match use case

---

## Role Hierarchy & Permissions

### Role Definitions

#### 1. Super Admin
- **Description**: Application owner with unrestricted access
- **Scope**: Global (all data across all tenants)
- **Key Permissions**:
  - Manage all users, roles, and permissions
  - Access all communities and properties
  - Configure system settings
  - View all analytics and reports
  - Manage dealers and administrators

**Use Cases**:
- System configuration and maintenance
- Top-level analytics and reporting
- User account management
- Troubleshooting and support

#### 2. Dealer
- **Description**: Business entity that manages multiple administrators and communities
- **Scope**: Limited to their owned communities and subordinate administrators
- **Key Permissions**:
  - Create, update, delete administrators under their management
  - View communities managed by their administrators
  - View aggregate statistics across their communities
  - Assign administrators to communities
  - View resident counts and property occupancy

**Use Cases**:
- Managing a portfolio of communities
- Onboarding new administrators
- Viewing business metrics across properties
- Quality assurance and oversight

**Data Access Rules**:
- Can see communities directly assigned to them
- Can see communities managed by their administrators
- Can see administrators they manage
- Can see aggregate resident data from their communities
- Cannot see data from other dealers' communities

#### 3. Administrator
- **Description**: Community manager who handles day-to-day operations
- **Scope**: Limited to specifically assigned communities
- **Key Permissions**:
  - Manage residents within assigned communities
  - Create, update, delete properties in assigned communities
  - Configure community settings
  - Manage visitor access for their communities
  - View community-specific reports
  - Configure automation devices

**Use Cases**:
- Daily community management
- Resident onboarding/offboarding
- Property management
- Visitor access control
- Community-specific reporting

**Data Access Rules**:
- Can only see communities they are explicitly assigned to
- Can manage all properties within their communities
- Can manage all residents in their communities
- Cannot see other administrators' communities
- Cannot see dealer-level data

#### 4. Resident
- **Description**: Property owner or tenant
- **Scope**: Limited to their own properties
- **Key Permissions**:
  - View their own property details
  - Create visitor access requests
  - View visitor history for their property
  - Update their profile
  - View community announcements

**Use Cases**:
- Managing visitor access
- Viewing property information
- Receiving notifications
- Accessing community features

**Data Access Rules**:
- Can only see properties they own/rent
- Can only see their own visitor records
- Can see community-level public information
- Cannot see other residents' data

#### 5. Guard (Security Personnel)
- **Description**: Security staff managing gate access
- **Scope**: Limited to assigned communities
- **Key Permissions**:
  - Scan visitor QR codes
  - Log entry/exit times
  - View active visitor passes
  - Operate gate automation

**Use Cases**:
- Gate access control
- Visitor verification
- Security logging

#### 6. Client (Future Role)
- **Description**: Reserved for future use (API clients, integrations, etc.)
- **Scope**: To be defined
- **Key Permissions**: To be defined

---

## Identified Issues

### 1. Missing Granular Permissions System

**Problem**: Permissions are hardcoded in `useAuth.ts` with only two levels:
```typescript
// Admin → Full access
{ action: 'manage', subject: 'all' }

// Everyone else → Demo access only
{ action: 'read', subject: 'AclDemo' }
```

**Impact**:
- Cannot implement differential access for Dealer vs Administrator
- Cannot restrict administrators to specific communities
- Cannot prevent data leakage between tenants
- Changes require code deployment

### 2. No Role Scoping Mechanism

**Problem**: The `profile_role` table has a `path` field but no clear scoping structure.

**Impact**:
- Administrators cannot be restricted to specific communities
- Dealers cannot be linked to their managed communities
- Residents can potentially see other residents' data
- No way to implement multi-community access

### 3. Missing Dealer-Administrator Relationship

**Problem**: No table or field tracks which administrators work under which dealers.

**Impact**:
- Dealers cannot manage their administrators
- Cannot enforce hierarchical data access
- Cannot implement dealer-scoped reporting
- No way to transfer administrators between dealers

### 4. No Hierarchical Access Control

**Problem**: No enforcement of data hierarchy.

**Impact**:
- All administrators see all communities
- Dealers cannot view subordinate administrator activity
- No tenant isolation
- Security and compliance risks

### 5. Ambiguous Table Structures

**Problem**: `community_manager` table has both `community_id` and `property_id`, purpose unclear.

**Impact**:
- Unclear data model
- Potential for inconsistent data
- Difficult to maintain

### 6. No Audit Trail

**Problem**: No tracking of who granted access, when, or why.

**Impact**:
- Cannot trace permission changes
- Compliance issues
- No accountability
- Difficult to debug access issues

---

## Recommended Solution

### Architecture Overview

Implement a **Scope-Based RBAC System** with the following components:

1. **Role-Permission Mapping** - Granular permissions assigned to roles
2. **Scoped Role Assignments** - Roles assigned with specific scope (global, dealer, community, property)
3. **Hierarchical Relationships** - Explicit tracking of organizational hierarchy
4. **Dynamic Authorization** - Runtime permission checks based on scope and hierarchy
5. **Audit Logging** - Complete trail of access grants and changes

### Key Design Principles

1. **Explicit Over Implicit** - All access must be explicitly granted
2. **Least Privilege** - Users get minimum permissions needed
3. **Scope Inheritance** - Higher scopes include lower scopes (dealer sees communities)
4. **Separation of Concerns** - Roles, permissions, and scopes are separate entities
5. **Auditability** - All changes tracked with timestamp and actor

---

## Database Schema Changes

### Phase 1: Add Scoping to Existing Tables

#### 1.1 Enhance `profile_role` Table

Add scope information to role assignments:

```sql
-- Add scope columns
ALTER TABLE profile_role
  ADD COLUMN scope_type VARCHAR(50) DEFAULT 'global',
  ADD COLUMN scope_dealer_id UUID REFERENCES profile(id) ON DELETE CASCADE,
  ADD COLUMN scope_community_id UUID REFERENCES community(id) ON DELETE CASCADE,
  ADD COLUMN scope_property_id UUID REFERENCES property(id) ON DELETE CASCADE,
  ADD COLUMN granted_by UUID REFERENCES profile(id),
  ADD COLUMN granted_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN notes TEXT;

-- Add check constraint to ensure valid scope combinations
ALTER TABLE profile_role ADD CONSTRAINT check_scope_consistency CHECK (
  CASE scope_type
    WHEN 'global' THEN
      scope_dealer_id IS NULL AND
      scope_community_id IS NULL AND
      scope_property_id IS NULL
    WHEN 'dealer' THEN
      scope_dealer_id IS NOT NULL AND
      scope_community_id IS NULL AND
      scope_property_id IS NULL
    WHEN 'community' THEN
      scope_community_id IS NOT NULL AND
      scope_property_id IS NULL
    WHEN 'property' THEN
      scope_property_id IS NOT NULL
    ELSE FALSE
  END
);

-- Add index for performance
CREATE INDEX idx_profile_role_scope ON profile_role(profile_id, scope_type, scope_community_id);
CREATE INDEX idx_profile_role_dealer ON profile_role(scope_dealer_id) WHERE scope_dealer_id IS NOT NULL;
```

**Scope Types**:
- `global` - Unrestricted access (Super Admin only)
- `dealer` - Access to dealer's communities and subordinates
- `community` - Access to specific community only
- `property` - Access to specific property only

**Example Records**:
```sql
-- Super Admin (global access)
INSERT INTO profile_role (profile_id, role_id, scope_type)
VALUES ('uuid-1', 'super-admin-role-id', 'global');

-- Dealer (scoped to themselves as dealer)
INSERT INTO profile_role (profile_id, role_id, scope_type, scope_dealer_id, granted_by)
VALUES ('uuid-2', 'dealer-role-id', 'dealer', 'uuid-2', 'uuid-1');

-- Administrator (scoped to specific community, managed by dealer)
INSERT INTO profile_role (profile_id, role_id, scope_type, scope_dealer_id, scope_community_id, granted_by)
VALUES ('uuid-3', 'admin-role-id', 'community', 'uuid-2', 'community-id-1', 'uuid-2');

-- Resident (scoped to their property)
INSERT INTO profile_role (profile_id, role_id, scope_type, scope_property_id, granted_by)
VALUES ('uuid-4', 'resident-role-id', 'property', 'property-id-1', 'uuid-3');
```

#### 1.2 Create `dealer_administrators` Table

Track dealer-administrator relationships explicitly:

```sql
CREATE TABLE dealer_administrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  administrator_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES profile(id),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure unique pairings
  UNIQUE(dealer_id, administrator_id),

  -- Prevent self-assignment
  CHECK (dealer_id != administrator_id)
);

-- Indexes for queries
CREATE INDEX idx_dealer_admins_dealer ON dealer_administrators(dealer_id) WHERE is_active = TRUE;
CREATE INDEX idx_dealer_admins_admin ON dealer_administrators(administrator_id) WHERE is_active = TRUE;

-- Trigger to update timestamp
CREATE TRIGGER update_dealer_administrators_updated_at
  BEFORE UPDATE ON dealer_administrators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Purpose**:
- Explicit tracking of organizational hierarchy
- Supports reassignment of administrators between dealers
- Historical record when `is_active` is used instead of deletion

#### 1.3 Replace/Enhance `community_manager` with `community_access`

Create a clearer table for community access assignments:

```sql
-- Option A: Drop and recreate
DROP TABLE IF EXISTS community_manager;

CREATE TABLE community_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES community(id) ON DELETE CASCADE,
  access_level VARCHAR(50) NOT NULL DEFAULT 'viewer',
  granted_by UUID REFERENCES profile(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(profile_id, community_id),

  -- Valid access levels
  CHECK (access_level IN ('owner', 'manager', 'viewer'))
);

-- Indexes
CREATE INDEX idx_community_access_profile ON community_access(profile_id) WHERE is_active = TRUE;
CREATE INDEX idx_community_access_community ON community_access(community_id) WHERE is_active = TRUE;
CREATE INDEX idx_community_access_expires ON community_access(expires_at) WHERE expires_at IS NOT NULL;

-- Trigger
CREATE TRIGGER update_community_access_updated_at
  BEFORE UPDATE ON community_access
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Access Levels**:
- `owner` - Full control (dealers)
- `manager` - Day-to-day management (administrators)
- `viewer` - Read-only access (reports, auditors)

### Phase 2: Implement Permissions System

#### 2.1 Create `permissions` Table

Define all available permissions in the system:

```sql
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,  -- Cannot be deleted if true
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure consistent naming
  CHECK (permission_key = LOWER(resource || '.' || action))
);

-- Indexes
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_active ON permissions(is_active) WHERE is_active = TRUE;
CREATE UNIQUE INDEX idx_permissions_key ON permissions(permission_key);

-- Trigger
CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Permission Naming Convention**: `{resource}.{action}`

Examples:
- `communities.create`
- `communities.read`
- `communities.update`
- `communities.delete`
- `residents.manage`
- `properties.create`
- `visitors.approve`
- `analytics.view`

#### 2.2 Create `role_permissions` Junction Table

Map permissions to roles:

```sql
CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES profile(id),
  created_at TIMESTAMP DEFAULT NOW(),

  -- Unique pairing
  UNIQUE(role_id, permission_id)
);

-- Indexes for fast permission lookups
CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
```

#### 2.3 Seed Initial Permissions

```sql
-- Insert all system permissions
INSERT INTO permissions (permission_key, resource, action, description, is_system) VALUES
  -- Super Admin
  ('all.manage', 'all', 'manage', 'Full system access', TRUE),

  -- User Management
  ('users.create', 'users', 'create', 'Create new users', TRUE),
  ('users.read', 'users', 'read', 'View user information', TRUE),
  ('users.update', 'users', 'update', 'Update user information', TRUE),
  ('users.delete', 'users', 'delete', 'Delete users', TRUE),
  ('users.manage', 'users', 'manage', 'Full user management', TRUE),

  -- Role Management
  ('roles.assign', 'roles', 'assign', 'Assign roles to users', TRUE),
  ('roles.revoke', 'roles', 'revoke', 'Revoke roles from users', TRUE),
  ('roles.manage', 'roles', 'manage', 'Full role management', TRUE),

  -- Community Management
  ('communities.create', 'communities', 'create', 'Create communities', TRUE),
  ('communities.read', 'communities', 'read', 'View communities', TRUE),
  ('communities.update', 'communities', 'update', 'Update community details', TRUE),
  ('communities.delete', 'communities', 'delete', 'Delete communities', TRUE),
  ('communities.manage', 'communities', 'manage', 'Full community management', TRUE),

  -- Property Management
  ('properties.create', 'properties', 'create', 'Create properties', TRUE),
  ('properties.read', 'properties', 'read', 'View properties', TRUE),
  ('properties.update', 'properties', 'update', 'Update properties', TRUE),
  ('properties.delete', 'properties', 'delete', 'Delete properties', TRUE),
  ('properties.manage', 'properties', 'manage', 'Full property management', TRUE),

  -- Resident Management
  ('residents.create', 'residents', 'create', 'Add residents', TRUE),
  ('residents.read', 'residents', 'read', 'View residents', TRUE),
  ('residents.update', 'residents', 'update', 'Update resident information', TRUE),
  ('residents.delete', 'residents', 'delete', 'Remove residents', TRUE),
  ('residents.manage', 'residents', 'manage', 'Full resident management', TRUE),

  -- Visitor Management
  ('visitors.create', 'visitors', 'create', 'Create visitor passes', TRUE),
  ('visitors.read', 'visitors', 'read', 'View visitor records', TRUE),
  ('visitors.update', 'visitors', 'update', 'Update visitor passes', TRUE),
  ('visitors.delete', 'visitors', 'delete', 'Revoke visitor passes', TRUE),
  ('visitors.approve', 'visitors', 'approve', 'Approve visitor requests', TRUE),
  ('visitors.scan', 'visitors', 'scan', 'Scan QR codes at gate', TRUE),

  -- Analytics & Reporting
  ('analytics.view', 'analytics', 'view', 'View analytics dashboards', TRUE),
  ('analytics.export', 'analytics', 'export', 'Export reports', TRUE),
  ('statistics.read', 'statistics', 'read', 'View statistics', TRUE),

  -- Automation Devices
  ('devices.configure', 'devices', 'configure', 'Configure automation devices', TRUE),
  ('devices.operate', 'devices', 'operate', 'Operate gates and devices', TRUE),
  ('devices.read', 'devices', 'read', 'View device status', TRUE),

  -- Notifications
  ('notifications.send', 'notifications', 'send', 'Send notifications', TRUE),
  ('notifications.read', 'notifications', 'read', 'View notifications', TRUE),

  -- Settings
  ('settings.update', 'settings', 'update', 'Update system settings', TRUE),
  ('settings.read', 'settings', 'read', 'View system settings', TRUE);
```

#### 2.4 Assign Permissions to Roles

```sql
-- Get role IDs (adjust based on your actual role records)
-- Assuming roles exist with names: 'Super Admin', 'Dealer', 'Administrator', 'Resident', 'Guard'

-- Super Admin - Gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM role WHERE role_name = 'Super Admin'),
  id
FROM permissions;

-- Dealer Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM role WHERE role_name = 'Dealer'),
  id
FROM permissions
WHERE permission_key IN (
  'users.read',           -- View users
  'users.create',         -- Create administrators
  'users.update',         -- Update administrators
  'roles.assign',         -- Assign admin roles
  'communities.read',     -- View communities
  'properties.read',      -- View properties
  'residents.read',       -- View residents
  'statistics.read',      -- View statistics
  'analytics.view',       -- View analytics
  'analytics.export'      -- Export reports
);

-- Administrator Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM role WHERE role_name = 'Administrator'),
  id
FROM permissions
WHERE permission_key IN (
  'communities.read',     -- View their communities
  'communities.update',   -- Update community settings
  'properties.create',    -- Create properties
  'properties.read',      -- View properties
  'properties.update',    -- Update properties
  'properties.delete',    -- Delete properties
  'residents.create',     -- Add residents
  'residents.read',       -- View residents
  'residents.update',     -- Update residents
  'residents.delete',     -- Remove residents
  'visitors.read',        -- View visitors
  'visitors.update',      -- Manage visitors
  'visitors.approve',     -- Approve visitor requests
  'devices.configure',    -- Configure gates
  'devices.read',         -- View device status
  'analytics.view',       -- View community analytics
  'notifications.send',   -- Send community notifications
  'settings.read'         -- View settings
);

-- Resident Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM role WHERE role_name = 'Resident'),
  id
FROM permissions
WHERE permission_key IN (
  'properties.read',      -- View their properties
  'visitors.create',      -- Create visitor passes
  'visitors.read',        -- View their visitors
  'visitors.update',      -- Update their visitor passes
  'visitors.delete',      -- Cancel visitor passes
  'notifications.read',   -- Read notifications
  'communities.read'      -- View community info
);

-- Guard Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM role WHERE role_name = 'Guard'),
  id
FROM permissions
WHERE permission_key IN (
  'visitors.scan',        -- Scan QR codes
  'visitors.read',        -- View visitor details
  'devices.operate',      -- Open/close gates
  'devices.read'          -- View device status
);
```

### Phase 3: Audit and History Tables (Optional but Recommended)

#### 3.1 Create Audit Log Table

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profile(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Index for queries
  CHECK (action IN ('create', 'update', 'delete', 'assign', 'revoke', 'login', 'logout'))
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
```

#### 3.2 Create Trigger Function for Auditing

```sql
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    actor_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values
  ) VALUES (
    current_setting('app.current_user_id', TRUE)::UUID,
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to important tables
CREATE TRIGGER audit_profile_role
  AFTER INSERT OR UPDATE OR DELETE ON profile_role
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_community_access
  AFTER INSERT OR UPDATE OR DELETE ON community_access
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_dealer_administrators
  AFTER INSERT OR UPDATE OR DELETE ON dealer_administrators
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

### Helper Function for Updated At

```sql
-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Implementation Phases

### Phase 1: Database Schema Updates (Week 1)

**Goals**:
- Add scoping to existing tables
- Create new relationship tables
- Set up permissions system
- Add indexes and constraints

**Tasks**:
1. Backup production database
2. Run migration scripts in staging
3. Verify data integrity
4. Seed permissions and role_permissions
5. Test rollback procedures
6. Deploy to production during maintenance window

**Deliverables**:
- Migration scripts
- Rollback scripts
- Test verification queries
- Documentation updates

### Phase 2: Update Authentication Logic (Week 2)

**Goals**:
- Modify `useAuth.ts` to load scoped roles
- Update CASL ability generation
- Implement scope-aware queries

**Tasks**:
1. Update `useAuth.ts` login function
2. Create helper functions for scope checking
3. Update ability rule generation
4. Add scope context to user session
5. Write unit tests

**Deliverables**:
- Updated `useAuth.ts`
- New composables (`useScope.ts`, `usePermissions.ts`)
- Unit tests
- Integration tests

### Phase 3: Implement Row Level Security (Week 3)

**Goals**:
- Add RLS policies to Supabase
- Ensure tenant isolation
- Prevent unauthorized data access

**Tasks**:
1. Enable RLS on all tables
2. Create policies for each role type
3. Test policies thoroughly
4. Document policy logic
5. Add policy tests

**Deliverables**:
- RLS policy scripts
- Policy documentation
- Security test suite
- Penetration test results

### Phase 4: Update UI Components (Week 4)

**Goals**:
- Add permission checks to UI
- Hide unauthorized actions
- Show appropriate error messages

**Tasks**:
1. Create `v-can` directive for CASL
2. Update page components
3. Add permission guards to forms
4. Update navigation menus
5. Add loading states

**Deliverables**:
- Updated components
- Permission directive
- UI/UX tests
- Accessibility audit

### Phase 5: Migration & Data Seeding (Week 5)

**Goals**:
- Migrate existing users to new structure
- Assign appropriate scopes
- Verify data consistency

**Tasks**:
1. Create data migration scripts
2. Assign scopes to existing users
3. Link administrators to dealers
4. Set up community access
5. Verify all users can login

**Deliverables**:
- Migration scripts
- Data validation reports
- User communication
- Rollback plan

### Phase 6: Testing & Documentation (Week 6)

**Goals**:
- Comprehensive testing
- User documentation
- Training materials

**Tasks**:
1. End-to-end testing
2. Security audit
3. Performance testing
4. Write user guides
5. Create admin training videos

**Deliverables**:
- Test reports
- User documentation
- Admin guides
- Training materials
- Go-live checklist

---

## Detailed Process Flows

### Process 1: User Authentication & Authorization

#### Flow Diagram

```
┌──────────────┐
│ User Login   │
└──────┬───────┘
       │
       ▼
┌─────────────────────────┐
│ Supabase Auth           │
│ signInWithPassword()    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Fetch Profile           │
│ Check enabled = true    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Fetch Profile Roles     │
│ with Scopes             │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ For Each Role:          │
│ 1. Get role permissions │
│ 2. Apply scope filter   │
│ 3. Build ability rules  │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Determine Primary Role  │
│ (Highest privilege)     │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Build User Context:     │
│ - userData              │
│ - accessToken           │
│ - abilityRules          │
│ - scopes[]              │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Store in Cookies        │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Set Supabase RLS        │
│ Context Variables       │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Redirect to Dashboard   │
└─────────────────────────┘
```

#### Updated `useAuth.ts` Implementation

See [Code Implementation](#code-implementation) section below for full code.

### Process 2: Dealer Creates Administrator

#### Flow Diagram

```
┌──────────────────┐
│ Dealer Dashboard │
└────────┬─────────┘
         │
         ▼
┌─────────────────────────┐
│ Click "Add Admin"       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Fill Form:              │
│ - Email                 │
│ - Display Name          │
│ - Assign Communities    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Submit Form             │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Backend Validation:     │
│ 1. Check dealer perms   │
│ 2. Verify communities   │
│ 3. Check email unique   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Create Supabase User    │
│ auth.admin.createUser() │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Create Profile Record   │
│ INSERT INTO profile     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Link to Dealer:         │
│ INSERT INTO             │
│ dealer_administrators   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ For Each Community:     │
│ 1. Create profile_role  │
│    with community scope │
│ 2. Create               │
│    community_access     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Send Welcome Email      │
│ with password reset     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Log Audit Trail         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Return Success          │
└─────────────────────────┘
```

#### Database Operations

```sql
-- 1. Create profile
INSERT INTO profile (id, email, display_name, enabled)
VALUES ($1, $2, $3, TRUE)
RETURNING *;

-- 2. Link to dealer
INSERT INTO dealer_administrators (dealer_id, administrator_id, assigned_by)
VALUES ($dealerId, $newAdminId, $dealerId);

-- 3. Assign role with community scope
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_dealer_id,
  scope_community_id,
  granted_by
) VALUES (
  $newAdminId,
  (SELECT id FROM role WHERE role_name = 'Administrator'),
  'community',
  $dealerId,
  $communityId,
  $dealerId
);

-- 4. Grant community access
INSERT INTO community_access (
  profile_id,
  community_id,
  access_level,
  granted_by
) VALUES (
  $newAdminId,
  $communityId,
  'manager',
  $dealerId
);
```

### Process 3: Administrator Manages Resident

#### Flow Diagram

```
┌────────────────────┐
│ Admin Dashboard    │
└────────┬───────────┘
         │
         ▼
┌─────────────────────────┐
│ Select Community        │
│ (Only sees assigned)    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Click "Add Resident"    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Fill Form:              │
│ - Email                 │
│ - Display Name          │
│ - Property              │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Submit Form             │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Backend Validation:     │
│ 1. Check admin scope    │
│ 2. Verify property in   │
│    admin's community    │
│ 3. Check email unique   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Create Supabase User    │
│ (or link existing)      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Create/Update Profile   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Assign Role:            │
│ INSERT INTO             │
│ profile_role            │
│ scope_type='property'   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Link to Property:       │
│ INSERT INTO             │
│ property_owner          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Send Welcome Email      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Return Success          │
└─────────────────────────┘
```

#### Database Operations

```sql
-- 1. Verify admin has access to community
SELECT 1 FROM profile_role pr
JOIN property p ON p.community_id = pr.scope_community_id
WHERE pr.profile_id = $adminId
  AND p.id = $propertyId
  AND pr.scope_type = 'community';

-- 2. Create or get profile
INSERT INTO profile (id, email, display_name, enabled, def_property_id)
VALUES ($1, $2, $3, TRUE, $propertyId)
ON CONFLICT (id) DO UPDATE SET def_property_id = $propertyId
RETURNING *;

-- 3. Assign resident role
INSERT INTO profile_role (
  profile_id,
  role_id,
  scope_type,
  scope_property_id,
  granted_by
) VALUES (
  $residentId,
  (SELECT id FROM role WHERE role_name = 'Resident'),
  'property',
  $propertyId,
  $adminId
);

-- 4. Link to property
INSERT INTO property_owner (
  profile_id,
  property_id,
  community_id
) VALUES (
  $residentId,
  $propertyId,
  $communityId
);
```

### Process 4: Data Access with Scope Filtering

#### Dealer Viewing Communities

```sql
-- Dealer sees:
-- 1. Communities they directly manage
-- 2. Communities managed by their administrators

SELECT DISTINCT c.*
FROM community c
WHERE c.id IN (
  -- Communities dealer directly manages
  SELECT ca.community_id
  FROM community_access ca
  WHERE ca.profile_id = $dealerId
    AND ca.is_active = TRUE

  UNION

  -- Communities managed by dealer's administrators
  SELECT ca.community_id
  FROM dealer_administrators da
  JOIN community_access ca ON ca.profile_id = da.administrator_id
  WHERE da.dealer_id = $dealerId
    AND da.is_active = TRUE
    AND ca.is_active = TRUE
);
```

#### Administrator Viewing Residents

```sql
-- Administrator sees only residents in their communities

SELECT DISTINCT p.*
FROM profile p
JOIN property_owner po ON po.profile_id = p.id
JOIN property prop ON prop.id = po.property_id
WHERE prop.community_id IN (
  -- Get admin's assigned communities
  SELECT scope_community_id
  FROM profile_role
  WHERE profile_id = $adminId
    AND scope_type = 'community'
    AND scope_community_id IS NOT NULL
);
```

#### Resident Viewing Properties

```sql
-- Resident sees only their own properties

SELECT prop.*
FROM property prop
JOIN property_owner po ON po.property_id = prop.id
WHERE po.profile_id = $residentId;
```

---

## Code Implementation

### Updated `useAuth.ts`

```typescript
// src/composables/useAuth.ts
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/supabase'
import type { Rule } from '@/plugins/casl/ability'

type UserAbilityRule = Rule

type Profile = Tables<'profile'>
type ProfileRole = Tables<'profile_role'>
type Role = Tables<'role'>
type Permission = Tables<'permissions'>

interface RoleWithScope extends ProfileRole {
  role: Role | null
  scope_community?: { id: string; name: string } | null
  scope_property?: { id: string; name: string } | null
}

interface UserScope {
  type: 'global' | 'dealer' | 'community' | 'property'
  dealerId?: string
  communityIds: string[]
  propertyIds: string[]
}

interface UserData {
  id: string
  email: string
  fullName?: string
  username?: string
  avatar?: string
  role: string
  roles: string[]
  scopes: UserScope[]
  abilityRules: UserAbilityRule[]
}

interface LoginResponse {
  accessToken: string
  userData: UserData
  userAbilityRules: UserAbilityRule[]
}

// Convert database permissions to CASL ability rules
function permissionsToAbilityRules(permissions: Permission[]): UserAbilityRule[] {
  return permissions.map(p => ({
    action: p.action,
    subject: p.resource,
  }))
}

// Get user's permissions based on their roles
async function getUserPermissions(roleIds: string[]): Promise<Permission[]> {
  if (roleIds.length === 0) return []

  const { data, error } = await supabase
    .from('role_permissions')
    .select(`
      permission:permissions (
        id,
        permission_key,
        resource,
        action,
        description
      )
    `)
    .in('role_id', roleIds)

  if (error) {
    console.error('Error fetching permissions:', error)
    return []
  }

  // Flatten and deduplicate permissions
  const permissions = data
    ?.map((rp: any) => rp.permission)
    .filter(Boolean)
    .filter((p: any) => p.is_active !== false) as Permission[]

  // Remove duplicates by permission_key
  const uniquePermissions = Array.from(
    new Map(permissions.map(p => [p.permission_key, p])).values()
  )

  return uniquePermissions
}

// Build user scopes from profile_role records
function buildUserScopes(profileRoles: RoleWithScope[]): UserScope[] {
  const scopeMap = new Map<string, UserScope>()

  for (const pr of profileRoles) {
    const key = `${pr.scope_type}-${pr.scope_dealer_id || 'none'}`

    if (!scopeMap.has(key)) {
      scopeMap.set(key, {
        type: pr.scope_type as any || 'property',
        dealerId: pr.scope_dealer_id || undefined,
        communityIds: [],
        propertyIds: [],
      })
    }

    const scope = scopeMap.get(key)!

    if (pr.scope_community_id && !scope.communityIds.includes(pr.scope_community_id)) {
      scope.communityIds.push(pr.scope_community_id)
    }

    if (pr.scope_property_id && !scope.propertyIds.includes(pr.scope_property_id)) {
      scope.propertyIds.push(pr.scope_property_id)
    }
  }

  return Array.from(scopeMap.values())
}

// Determine primary role (highest privilege)
function determinePrimaryRole(roles: string[]): string {
  const hierarchy = ['Super Admin', 'Dealer', 'Administrator', 'Guard', 'Resident', 'Client']

  for (const rank of hierarchy) {
    const found = roles.find(r => r.toLowerCase() === rank.toLowerCase())
    if (found) return found
  }

  return roles[0] || 'Resident'
}

export const useAuth = () => {
  const login = async (email: string, password: string): Promise<LoginResponse> => {
    // Validate inputs
    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    // 1. Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('Supabase auth error:', authError)
      throw new Error(authError.message)
    }

    if (!authData?.user || !authData?.session) {
      console.error('Invalid auth data:', authData)
      throw new Error('Invalid login credentials')
    }

    // 2. Fetch user profile
    let profile: Profile | null = null
    const { data: profileData, error: profileError } = await supabase
      .from('profile')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        // Create profile if doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profile')
          .insert({
            id: authData.user.id,
            email: authData.user.email || email,
            enabled: true,
          })
          .select()
          .single()

        if (createError || !newProfile) {
          throw new Error('Failed to create user profile')
        }

        profile = newProfile
      } else {
        throw new Error('Failed to fetch user profile')
      }
    } else {
      profile = profileData
    }

    if (!profile) {
      throw new Error('User profile not found')
    }

    // 3. Check if user is enabled
    if (!profile.enabled) {
      throw new Error('Your account has been disabled. Please contact support.')
    }

    // 4. Fetch user roles with scopes
    const { data: profileRoles, error: rolesError } = await supabase
      .from('profile_role')
      .select(`
        *,
        role:role_id (
          id,
          role_name,
          enabled
        ),
        scope_community:scope_community_id (
          id,
          name
        ),
        scope_property:scope_property_id (
          id,
          name
        )
      `)
      .eq('profile_id', authData.user.id)

    if (rolesError) {
      console.warn('Failed to fetch user roles:', rolesError)
    }

    // 5. Extract enabled roles
    const enabledRoles: RoleWithScope[] = (profileRoles || [])
      .filter((pr: any) => pr.role && pr.role.enabled)

    const roles = enabledRoles
      .map((pr: any) => pr.role?.role_name)
      .filter(Boolean)

    const roleIds = enabledRoles
      .map((pr: any) => pr.role?.id)
      .filter(Boolean)

    // 6. Get permissions for all roles
    const permissions = await getUserPermissions(roleIds)

    // 7. Build ability rules from permissions
    let abilityRules: UserAbilityRule[] = []

    // Check for super admin (gets all.manage)
    const hasAllManage = permissions.some(
      p => p.resource === 'all' && p.action === 'manage'
    )

    if (hasAllManage) {
      abilityRules = [{ action: 'manage', subject: 'all' }]
    } else {
      abilityRules = permissionsToAbilityRules(permissions)
    }

    // 8. Build user scopes
    const scopes = buildUserScopes(enabledRoles)

    // 9. Determine primary role
    const primaryRole = determinePrimaryRole(roles)

    // 10. Build user data
    const userData: UserData = {
      id: profile.id,
      email: profile.email,
      fullName: profile.display_name || undefined,
      username: profile.email.split('@')[0],
      avatar: undefined,
      role: primaryRole,
      roles: roles,
      scopes: scopes,
      abilityRules: abilityRules,
    }

    // 11. Store session token
    const accessToken = authData.session.access_token

    // 12. Set Supabase context for RLS
    await supabase.rpc('set_user_context', {
      user_id: profile.id,
      user_role: primaryRole,
    }).catch(err => {
      console.warn('Failed to set user context:', err)
    })

    return {
      accessToken,
      userData,
      userAbilityRules: abilityRules,
    }
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password?reset=true`,
      })

      if (error) {
        console.error('Supabase reset password error:', error)
        throw new Error(error.message)
      }
    } catch (err: any) {
      console.error('Reset password error:', err)
      throw err
    }
  }

  const getSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      throw new Error(error.message)
    }
    return session
  }

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      throw new Error(error.message)
    }
    return user
  }

  return {
    login,
    logout,
    resetPassword,
    getSession,
    getCurrentUser,
  }
}
```

### New Composable: `useScope.ts`

```typescript
// src/composables/useScope.ts

import { computed } from 'vue'
import { useCookie } from '@core/composable/useCookie'

interface UserScope {
  type: 'global' | 'dealer' | 'community' | 'property'
  dealerId?: string
  communityIds: string[]
  propertyIds: string[]
}

interface UserData {
  id: string
  email: string
  role: string
  roles: string[]
  scopes: UserScope[]
}

export const useScope = () => {
  const userDataCookie = useCookie<UserData | null>('userData')
  const userData = computed(() => userDataCookie.value)

  // Check if user has global scope
  const hasGlobalScope = computed(() => {
    return userData.value?.scopes?.some(s => s.type === 'global') || false
  })

  // Check if user is a dealer
  const isDealerScope = computed(() => {
    return userData.value?.scopes?.some(s => s.type === 'dealer') || false
  })

  // Get all community IDs user has access to
  const accessibleCommunityIds = computed(() => {
    if (hasGlobalScope.value) return ['*'] // All communities

    const ids = new Set<string>()

    userData.value?.scopes?.forEach(scope => {
      scope.communityIds.forEach(id => ids.add(id))
    })

    return Array.from(ids)
  })

  // Get all property IDs user has access to
  const accessiblePropertyIds = computed(() => {
    if (hasGlobalScope.value) return ['*'] // All properties

    const ids = new Set<string>()

    userData.value?.scopes?.forEach(scope => {
      scope.propertyIds.forEach(id => ids.add(id))
    })

    return Array.from(ids)
  })

  // Check if user can access specific community
  const canAccessCommunity = (communityId: string): boolean => {
    if (hasGlobalScope.value) return true
    return accessibleCommunityIds.value.includes(communityId)
  }

  // Check if user can access specific property
  const canAccessProperty = (propertyId: string): boolean => {
    if (hasGlobalScope.value) return true
    return accessiblePropertyIds.value.includes(propertyId)
  }

  // Get dealer ID if user is a dealer
  const dealerId = computed(() => {
    const dealerScope = userData.value?.scopes?.find(s => s.type === 'dealer')
    return dealerScope?.dealerId
  })

  // Build WHERE clause for Supabase queries (community scoping)
  const communityWhereClause = computed(() => {
    if (hasGlobalScope.value) {
      return null // No filter needed
    }

    const ids = accessibleCommunityIds.value
    if (ids.length === 0) {
      return 'id.eq.00000000-0000-0000-0000-000000000000' // No access
    }

    return `id.in.(${ids.join(',')})`
  })

  // Build WHERE clause for Supabase queries (property scoping)
  const propertyWhereClause = computed(() => {
    if (hasGlobalScope.value) {
      return null // No filter needed
    }

    const ids = accessiblePropertyIds.value
    if (ids.length === 0) {
      return 'id.eq.00000000-0000-0000-0000-000000000000' // No access
    }

    return `id.in.(${ids.join(',')})`
  })

  return {
    userData,
    hasGlobalScope,
    isDealerScope,
    accessibleCommunityIds,
    accessiblePropertyIds,
    canAccessCommunity,
    canAccessProperty,
    dealerId,
    communityWhereClause,
    propertyWhereClause,
  }
}
```

### New Composable: `usePermissions.ts`

```typescript
// src/composables/usePermissions.ts

import { useAbility } from '@casl/vue'

export const usePermissions = () => {
  const ability = useAbility()

  // Check single permission
  const can = (action: string, subject: string): boolean => {
    return ability.can(action, subject)
  }

  // Check if user has any of the specified permissions
  const canAny = (permissions: Array<{ action: string; subject: string }>): boolean => {
    return permissions.some(p => ability.can(p.action, p.subject))
  }

  // Check if user has all specified permissions
  const canAll = (permissions: Array<{ action: string; subject: string }>): boolean => {
    return permissions.every(p => ability.can(p.action, p.subject))
  }

  // Common permission checks
  const canManageUsers = () => can('manage', 'users') || can('create', 'users')
  const canManageCommunities = () => can('manage', 'communities')
  const canManageProperties = () => can('manage', 'properties')
  const canManageResidents = () => can('manage', 'residents')
  const canViewAnalytics = () => can('view', 'analytics')
  const canConfigureDevices = () => can('configure', 'devices')

  return {
    can,
    canAny,
    canAll,
    canManageUsers,
    canManageCommunities,
    canManageProperties,
    canManageResidents,
    canViewAnalytics,
    canConfigureDevices,
  }
}
```

### Usage in Components

```vue
<!-- Example: Community List Page -->
<script setup lang="ts">
import { supabase } from '@/lib/supabase'
import { useScope } from '@/composables/useScope'
import { usePermissions } from '@/composables/usePermissions'

const { accessibleCommunityIds, hasGlobalScope, canAccessCommunity } = useScope()
const { can } = usePermissions()

const communities = ref([])

const fetchCommunities = async () => {
  let query = supabase.from('community').select('*')

  // Apply scope filtering
  if (!hasGlobalScope.value) {
    if (accessibleCommunityIds.value.length === 0) {
      communities.value = []
      return
    }
    query = query.in('id', accessibleCommunityIds.value)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching communities:', error)
    return
  }

  communities.value = data || []
}

onMounted(() => {
  fetchCommunities()
})
</script>

<template>
  <div>
    <div class="d-flex justify-space-between align-center mb-4">
      <h1>Communities</h1>
      <VBtn
        v-if="can('create', 'communities')"
        color="primary"
        @click="showCreateDialog = true"
      >
        Add Community
      </VBtn>
    </div>

    <VDataTable
      :items="communities"
      :headers="headers"
    >
      <template #item.actions="{ item }">
        <VBtn
          v-if="can('update', 'communities') && canAccessCommunity(item.id)"
          icon
          size="small"
          @click="editCommunity(item)"
        >
          <VIcon>tabler-edit</VIcon>
        </VBtn>
        <VBtn
          v-if="can('delete', 'communities') && canAccessCommunity(item.id)"
          icon
          size="small"
          @click="deleteCommunity(item)"
        >
          <VIcon>tabler-trash</VIcon>
        </VBtn>
      </template>
    </VDataTable>
  </div>
</template>
```

---

## Row Level Security (RLS)

### Enable RLS on Tables

```sql
-- Enable RLS on all tables
ALTER TABLE profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE community ENABLE ROW LEVEL SECURITY;
ALTER TABLE property ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_owner ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_records_uid ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_record_logs ENABLE ROW LEVEL SECURITY;
```

### Create Helper Functions

```sql
-- Get current user ID from JWT
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', TRUE)::json->>'sub',
    current_setting('request.jwt.claim.sub', TRUE)
  )::UUID;
$$ LANGUAGE SQL STABLE;

-- Get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT pr.role.role_name
  FROM profile_role pr
  JOIN role ON role.id = pr.role_id
  WHERE pr.profile_id = auth.user_id()
  ORDER BY
    CASE role.role_name
      WHEN 'Super Admin' THEN 1
      WHEN 'Dealer' THEN 2
      WHEN 'Administrator' THEN 3
      WHEN 'Guard' THEN 4
      WHEN 'Resident' THEN 5
      ELSE 6
    END
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Check if user has global scope
CREATE OR REPLACE FUNCTION has_global_scope()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profile_role
    WHERE profile_id = auth.user_id()
      AND scope_type = 'global'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Get user's accessible community IDs
CREATE OR REPLACE FUNCTION get_accessible_community_ids()
RETURNS TABLE(community_id UUID) AS $$
BEGIN
  -- Super Admin sees all
  IF has_global_scope() THEN
    RETURN QUERY SELECT id FROM community;
  END IF;

  -- Dealers see their communities + their admins' communities
  RETURN QUERY
  SELECT DISTINCT ca.community_id
  FROM community_access ca
  WHERE ca.is_active = TRUE
    AND (
      -- Communities dealer directly manages
      ca.profile_id = auth.user_id()
      OR
      -- Communities managed by dealer's administrators
      ca.profile_id IN (
        SELECT administrator_id
        FROM dealer_administrators
        WHERE dealer_id = auth.user_id()
          AND is_active = TRUE
      )
    )

  UNION

  -- Communities from profile_role scope
  SELECT pr.scope_community_id
  FROM profile_role pr
  WHERE pr.profile_id = auth.user_id()
    AND pr.scope_community_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get user's accessible property IDs
CREATE OR REPLACE FUNCTION get_accessible_property_ids()
RETURNS TABLE(property_id UUID) AS $$
BEGIN
  -- Super Admin sees all
  IF has_global_scope() THEN
    RETURN QUERY SELECT id FROM property;
  END IF;

  RETURN QUERY
  -- Properties in accessible communities
  SELECT p.id
  FROM property p
  WHERE p.community_id IN (SELECT * FROM get_accessible_community_ids())

  UNION

  -- Properties from profile_role scope
  SELECT pr.scope_property_id
  FROM profile_role pr
  WHERE pr.profile_id = auth.user_id()
    AND pr.scope_property_id IS NOT NULL

  UNION

  -- Properties user owns
  SELECT po.property_id
  FROM property_owner po
  WHERE po.profile_id = auth.user_id();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### RLS Policies

#### Profile Table

```sql
-- Users can see their own profile
CREATE POLICY "Users can view own profile"
  ON profile FOR SELECT
  USING (id = auth.user_id());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profile FOR UPDATE
  USING (id = auth.user_id());

-- Admins and dealers can view profiles in their scope
CREATE POLICY "Scoped users can view profiles"
  ON profile FOR SELECT
  USING (
    has_global_scope()
    OR
    -- Dealers can see their administrators
    id IN (
      SELECT administrator_id
      FROM dealer_administrators
      WHERE dealer_id = auth.user_id()
        AND is_active = TRUE
    )
    OR
    -- Admins can see residents in their communities
    id IN (
      SELECT po.profile_id
      FROM property_owner po
      JOIN property p ON p.id = po.property_id
      WHERE p.community_id IN (SELECT * FROM get_accessible_community_ids())
    )
  );
```

#### Community Table

```sql
-- Users can only see communities in their scope
CREATE POLICY "Scoped community access"
  ON community FOR SELECT
  USING (
    has_global_scope()
    OR
    id IN (SELECT * FROM get_accessible_community_ids())
  );

-- Only admins can create communities
CREATE POLICY "Admins can create communities"
  ON community FOR INSERT
  WITH CHECK (
    has_global_scope()
    OR
    EXISTS (
      SELECT 1 FROM role
      JOIN profile_role pr ON pr.role_id = role.id
      WHERE pr.profile_id = auth.user_id()
        AND role.role_name IN ('Administrator', 'Dealer')
    )
  );

-- Only admins can update communities in their scope
CREATE POLICY "Scoped admins can update communities"
  ON community FOR UPDATE
  USING (
    has_global_scope()
    OR
    id IN (SELECT * FROM get_accessible_community_ids())
  );
```

#### Property Table

```sql
-- Users can only see properties in their scope
CREATE POLICY "Scoped property access"
  ON property FOR SELECT
  USING (
    has_global_scope()
    OR
    id IN (SELECT * FROM get_accessible_property_ids())
  );

-- Administrators can create properties in their communities
CREATE POLICY "Admins can create properties"
  ON property FOR INSERT
  WITH CHECK (
    has_global_scope()
    OR
    community_id IN (SELECT * FROM get_accessible_community_ids())
  );

-- Administrators can update/delete properties in their communities
CREATE POLICY "Admins can update properties"
  ON property FOR UPDATE
  USING (
    has_global_scope()
    OR
    community_id IN (SELECT * FROM get_accessible_community_ids())
  );

CREATE POLICY "Admins can delete properties"
  ON property FOR DELETE
  USING (
    has_global_scope()
    OR
    community_id IN (SELECT * FROM get_accessible_community_ids())
  );
```

#### Visitor Records

```sql
-- Residents can see their own visitor records
-- Admins can see all visitor records in their communities
CREATE POLICY "Scoped visitor records access"
  ON visitor_records_uid FOR SELECT
  USING (
    has_global_scope()
    OR
    host_uid = auth.user_id()
    OR
    community_id IN (SELECT * FROM get_accessible_community_ids())
  );

-- Residents can create visitor records for their properties
CREATE POLICY "Residents can create visitor records"
  ON visitor_records_uid FOR INSERT
  WITH CHECK (
    host_uid = auth.user_id()
    AND
    property_id IN (SELECT * FROM get_accessible_property_ids())
  );

-- Users can update/delete their own visitor records
CREATE POLICY "Users can manage own visitor records"
  ON visitor_records_uid FOR UPDATE
  USING (host_uid = auth.user_id());

CREATE POLICY "Users can delete own visitor records"
  ON visitor_records_uid FOR DELETE
  USING (host_uid = auth.user_id());
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/composables/useScope.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { useScope } from '@/composables/useScope'

describe('useScope', () => {
  beforeEach(() => {
    // Clear cookies
    document.cookie = 'userData=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  })

  it('should detect global scope for super admin', () => {
    const userData = {
      id: 'user-1',
      email: 'admin@test.com',
      role: 'Super Admin',
      roles: ['Super Admin'],
      scopes: [{ type: 'global', communityIds: [], propertyIds: [] }]
    }

    document.cookie = `userData=${JSON.stringify(userData)}`

    const { hasGlobalScope } = useScope()
    expect(hasGlobalScope.value).toBe(true)
  })

  it('should return accessible community IDs for dealer', () => {
    const userData = {
      id: 'user-2',
      email: 'dealer@test.com',
      role: 'Dealer',
      roles: ['Dealer'],
      scopes: [
        {
          type: 'dealer',
          dealerId: 'user-2',
          communityIds: ['comm-1', 'comm-2'],
          propertyIds: []
        }
      ]
    }

    document.cookie = `userData=${JSON.stringify(userData)}`

    const { accessibleCommunityIds } = useScope()
    expect(accessibleCommunityIds.value).toEqual(['comm-1', 'comm-2'])
  })

  it('should check if user can access specific community', () => {
    const userData = {
      id: 'user-3',
      email: 'admin@test.com',
      role: 'Administrator',
      roles: ['Administrator'],
      scopes: [
        {
          type: 'community',
          communityIds: ['comm-1'],
          propertyIds: []
        }
      ]
    }

    document.cookie = `userData=${JSON.stringify(userData)}`

    const { canAccessCommunity } = useScope()
    expect(canAccessCommunity('comm-1')).toBe(true)
    expect(canAccessCommunity('comm-2')).toBe(false)
  })
})
```

### Integration Tests

```typescript
// tests/integration/auth.test.ts

import { describe, it, expect } from 'vitest'
import { useAuth } from '@/composables/useAuth'
import { supabase } from '@/lib/supabase'

describe('Authentication Flow', () => {
  it('should login administrator with community scope', async () => {
    const { login } = useAuth()

    const response = await login('admin@community1.com', 'password123')

    expect(response.userData.role).toBe('Administrator')
    expect(response.userData.scopes).toHaveLength(1)
    expect(response.userData.scopes[0].type).toBe('community')
    expect(response.userData.scopes[0].communityIds).toContain('community-1-id')
    expect(response.userAbilityRules.length).toBeGreaterThan(0)
  })

  it('should enforce scope when querying communities', async () => {
    // Login as admin with access to community-1 only
    const { login } = useAuth()
    await login('admin@community1.com', 'password123')

    // Try to query all communities
    const { data, error } = await supabase
      .from('community')
      .select('*')

    // Should only see community-1 due to RLS
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data[0].id).toBe('community-1-id')
  })
})
```

### Manual Testing Checklist

#### Super Admin Tests
- [ ] Can view all communities
- [ ] Can view all users
- [ ] Can create dealers
- [ ] Can access all analytics
- [ ] Can modify system settings

#### Dealer Tests
- [ ] Can create administrators
- [ ] Can assign administrators to communities
- [ ] Can view communities managed by their admins
- [ ] Cannot see other dealers' communities
- [ ] Can view aggregate statistics

#### Administrator Tests
- [ ] Can only see assigned communities
- [ ] Can create properties in their communities
- [ ] Can add/edit/delete residents
- [ ] Cannot access other communities
- [ ] Can approve visitor requests

#### Resident Tests
- [ ] Can only see their own properties
- [ ] Can create visitor passes
- [ ] Cannot see other residents' data
- [ ] Can view community announcements
- [ ] Cannot access admin functions

---

## Migration Path

### Step 1: Backup Current Database

**⚠️ CRITICAL: Always backup before migrations. See [Database Backup Guide](./DATABASE_BACKUP.md) for complete procedures.**

```bash
# Using the provided backup script (recommended)
./scripts/backup-database.sh before_rbac_migration

# Or via Supabase CLI directly
supabase db dump -f backups/backup_$(date +%Y%m%d).sql

# Or via pg_dump if you have direct access
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backups/backup.sql
```

**Verify your backup:**
```bash
# Check backup exists and has reasonable size
ls -lh backups/backup_*.sql*

# If compressed, verify integrity
gunzip -t backups/backup_*.sql.gz
```

### Step 2: Run Migrations in Staging

```sql
-- migrations/001_add_scope_to_profile_role.sql

BEGIN;

-- Add new columns to profile_role
ALTER TABLE profile_role
  ADD COLUMN IF NOT EXISTS scope_type VARCHAR(50) DEFAULT 'property',
  ADD COLUMN IF NOT EXISTS scope_dealer_id UUID,
  ADD COLUMN IF NOT EXISTS scope_community_id UUID,
  ADD COLUMN IF NOT EXISTS scope_property_id UUID,
  ADD COLUMN IF NOT EXISTS granted_by UUID,
  ADD COLUMN IF NOT EXISTS granted_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add foreign keys
ALTER TABLE profile_role
  ADD CONSTRAINT fk_scope_dealer
    FOREIGN KEY (scope_dealer_id)
    REFERENCES profile(id) ON DELETE CASCADE;

ALTER TABLE profile_role
  ADD CONSTRAINT fk_scope_community
    FOREIGN KEY (scope_community_id)
    REFERENCES community(id) ON DELETE CASCADE;

ALTER TABLE profile_role
  ADD CONSTRAINT fk_scope_property
    FOREIGN KEY (scope_property_id)
    REFERENCES property(id) ON DELETE CASCADE;

ALTER TABLE profile_role
  ADD CONSTRAINT fk_granted_by
    FOREIGN KEY (granted_by)
    REFERENCES profile(id);

-- Add check constraint
ALTER TABLE profile_role
  ADD CONSTRAINT check_scope_consistency CHECK (
    CASE scope_type
      WHEN 'global' THEN
        scope_dealer_id IS NULL AND
        scope_community_id IS NULL AND
        scope_property_id IS NULL
      WHEN 'dealer' THEN
        scope_dealer_id IS NOT NULL AND
        scope_community_id IS NULL AND
        scope_property_id IS NULL
      WHEN 'community' THEN
        scope_community_id IS NOT NULL AND
        scope_property_id IS NULL
      WHEN 'property' THEN
        scope_property_id IS NOT NULL
      ELSE FALSE
    END
  );

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_profile_role_scope
  ON profile_role(profile_id, scope_type, scope_community_id);
CREATE INDEX IF NOT EXISTS idx_profile_role_dealer
  ON profile_role(scope_dealer_id) WHERE scope_dealer_id IS NOT NULL;

COMMIT;
```

```sql
-- migrations/002_create_permissions_tables.sql

BEGIN;

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key VARCHAR(100) UNIQUE NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CHECK (permission_key = LOWER(resource || '.' || action))
);

-- Create role_permissions junction
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES profile(id),
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(role_id, permission_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_active ON permissions(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

COMMIT;
```

```sql
-- migrations/003_create_dealer_administrators.sql

BEGIN;

CREATE TABLE IF NOT EXISTS dealer_administrators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  administrator_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID REFERENCES profile(id),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(dealer_id, administrator_id),
  CHECK (dealer_id != administrator_id)
);

CREATE INDEX IF NOT EXISTS idx_dealer_admins_dealer
  ON dealer_administrators(dealer_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_dealer_admins_admin
  ON dealer_administrators(administrator_id) WHERE is_active = TRUE;

COMMIT;
```

```sql
-- migrations/004_create_community_access.sql

BEGIN;

CREATE TABLE IF NOT EXISTS community_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES community(id) ON DELETE CASCADE,
  access_level VARCHAR(50) NOT NULL DEFAULT 'viewer',
  granted_by UUID REFERENCES profile(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(profile_id, community_id),
  CHECK (access_level IN ('owner', 'manager', 'viewer'))
);

CREATE INDEX IF NOT EXISTS idx_community_access_profile
  ON community_access(profile_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_community_access_community
  ON community_access(community_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_community_access_expires
  ON community_access(expires_at) WHERE expires_at IS NOT NULL;

COMMIT;
```

### Step 3: Seed Permissions

```sql
-- migrations/005_seed_permissions.sql
-- (See section 2.3 above for full seed data)
```

### Step 4: Migrate Existing Data

```sql
-- migrations/006_migrate_existing_data.sql

BEGIN;

-- Update Super Admins to global scope
UPDATE profile_role pr
SET scope_type = 'global'
FROM role r
WHERE pr.role_id = r.id
  AND r.role_name = 'Super Admin';

-- Update Residents to property scope
UPDATE profile_role pr
SET
  scope_type = 'property',
  scope_property_id = po.property_id
FROM role r
JOIN property_owner po ON po.profile_id = pr.profile_id
WHERE pr.role_id = r.id
  AND r.role_name = 'Resident';

-- Migrate community_manager to community_access
INSERT INTO community_access (
  profile_id,
  community_id,
  access_level,
  granted_at,
  is_active
)
SELECT
  cm.profile_id,
  cm.community_id,
  'manager',
  cm.created_at,
  TRUE
FROM community_manager cm
ON CONFLICT (profile_id, community_id) DO NOTHING;

COMMIT;
```

### Step 5: Enable RLS

```sql
-- migrations/007_enable_rls.sql
-- (See RLS section above)
```

### Step 6: Deploy to Production

```bash
# 1. Schedule maintenance window
# 2. Notify users
# 3. Create final backup
supabase db dump -f final_backup_$(date +%Y%m%d_%H%M%S).sql

# 4. Run migrations
supabase db push

# 5. Verify with test accounts
# 6. Monitor error logs
# 7. Be ready to rollback if needed
```

### Rollback Plan

```sql
-- rollback.sql

BEGIN;

-- Drop new tables
DROP TABLE IF EXISTS community_access CASCADE;
DROP TABLE IF EXISTS dealer_administrators CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;

-- Remove new columns from profile_role
ALTER TABLE profile_role
  DROP COLUMN IF EXISTS scope_type,
  DROP COLUMN IF EXISTS scope_dealer_id,
  DROP COLUMN IF EXISTS scope_community_id,
  DROP COLUMN IF EXISTS scope_property_id,
  DROP COLUMN IF EXISTS granted_by,
  DROP COLUMN IF EXISTS granted_at,
  DROP COLUMN IF EXISTS notes;

-- Disable RLS
ALTER TABLE profile DISABLE ROW LEVEL SECURITY;
ALTER TABLE community DISABLE ROW LEVEL SECURITY;
ALTER TABLE property DISABLE ROW LEVEL SECURITY;

COMMIT;

-- Restore from backup if necessary
-- psql -h db.xxxxx.supabase.co -U postgres -d postgres < backup.sql
```

---

## Summary

This guide provides a comprehensive roadmap for implementing a robust role-based access control system in PortunCmd. The key improvements include:

1. **Granular Permissions System** - Flexible, database-driven permissions
2. **Scope-Based Access Control** - Proper data isolation for multi-tenancy
3. **Hierarchical Relationships** - Clear dealer-administrator-resident structure
4. **Row Level Security** - Database-enforced access control
5. **Audit Trail** - Complete tracking of access changes
6. **Scalable Architecture** - Supports future growth and complexity

By following this implementation plan, you'll achieve:
- **Security**: Proper tenant isolation and least-privilege access
- **Compliance**: Audit trails and access controls
- **Flexibility**: Easy to add new roles and permissions
- **Performance**: Optimized queries with proper indexes
- **Maintainability**: Clear, documented architecture

Next steps:
1. Review this guide with your team
2. Test migrations in staging environment
3. Adjust based on specific business requirements
4. Schedule implementation phases
5. Train administrators on new system
6. Monitor and iterate based on feedback
