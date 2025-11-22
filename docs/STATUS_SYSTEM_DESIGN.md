# Status System Design - PortunCmd

**Created:** 2025-11-21
**Status:** Draft - Under Review
**Purpose:** Define status options for Users, Communities, and Properties

---

## Table of Contents

1. [Overview](#overview)
2. [User Statuses](#user-statuses)
3. [Community Statuses](#community-statuses)
4. [Property Statuses](#property-statuses)
5. [Color Coding](#color-coding)
6. [Status Transitions](#status-transitions)
7. [Database Schema](#database-schema)
8. [Implementation Recommendations](#implementation-recommendations)
9. [Business Rules](#business-rules)

---

## Overview

This document defines the status lifecycle for the three core entities in PortunCmd:
- **Users (Profiles)** - People using the system
- **Communities** - Condominiums/communities being managed
- **Properties** - Individual units/houses within communities

Each entity needs clear status options to manage their lifecycle, from creation through various operational states to eventual archival.

---

## 👤 User Statuses

### Status Options

| Status | Description | Access Level | Use Case |
|--------|-------------|--------------|----------|
| **Active** ✅ | User can log in and use the system | Full access | Normal operations |
| **Pending** ⏳ | Awaiting verification or approval | Limited/No access | New registrations, invitations |
| **Suspended** ⚠️ | Temporarily blocked by administrator | No login | Policy violations, payment issues |
| **Inactive** 💤 | Self-deactivated or auto-deactivated | No login, can reactivate | Moved out, temporary leave |
| **Archived** 📦 | Historical record only | Read-only | Former employees, past residents |

### TypeScript Type Definition
```typescript
type UserStatus = 'active' | 'pending' | 'suspended' | 'inactive' | 'archived'
```

### User Status Transitions

```
┌─────────┐     Email verified/    ┌────────┐
│ Pending │────────approved─────────│ Active │
└─────────┘                         └────────┘
                                        │ │
                        Admin action────┘ └────User/Admin action
                        ┌──────────┐          ┌──────────┐
                        │Suspended │          │ Inactive │
                        └──────────┘          └──────────┘
                             │                      │
                             └──────Reactivate──────┤
                                                    │
                                         Permanent──┼──→ ┌──────────┐
                                                         │ Archived │
                                                         └──────────┘
```

### Business Rules for Users

1. **Pending → Active**: Requires email verification OR admin approval
2. **Active → Suspended**: Only admins can suspend; requires reason
3. **Active → Inactive**: User or admin; preserves all data
4. **Suspended → Active**: Admin action only; requires review
5. **Any → Archived**: Permanent; cannot be reversed
6. **Auto-Inactive**: After 180 days of no login (configurable)

### Permissions by Status

| Feature | Active | Pending | Suspended | Inactive | Archived |
|---------|--------|---------|-----------|----------|----------|
| Login | ✅ | ❌ | ❌ | ❌ | ❌ |
| View Profile | ✅ | ⚠️ Limited | ❌ | ❌ | 👁️ Admin Only |
| Create Visitors | ✅ | ❌ | ❌ | ❌ | ❌ |
| Access QR Codes | ✅ | ❌ | ❌ | ❌ | ❌ |
| Receive Notifications | ✅ | ⚠️ System only | ❌ | ❌ | ❌ |

---

## 🏘️ Community Statuses

### Status Options

| Status | Description | Operations | Use Case |
|--------|-------------|------------|----------|
| **Active** ✅ | Fully operational | All features enabled | Normal operations |
| **Under Construction** 🏗️ | Being built/developed | Limited management | Pre-launch communities |
| **Pre-Launch** 🚀 | Ready but not open | Testing/staff setup | Final preparation |
| **Full Capacity** 🏢 | All properties occupied | Waitlist only | Maximum occupancy |
| **Maintenance Mode** 🔧 | Temporary service disruption | Limited operations | Major repairs, upgrades |
| **Seasonal Closure** ❄️ | Temporarily closed | No operations | Vacation communities |
| **Inactive** 💤 | Not currently managed | No operations | Contract paused |
| **Archived** 📦 | Historical record | Read-only | Sold, demolished, ended |

### TypeScript Type Definition
```typescript
type CommunityStatus =
  | 'active'
  | 'under-construction'
  | 'pre-launch'
  | 'full-capacity'
  | 'maintenance'
  | 'seasonal-closure'
  | 'inactive'
  | 'archived'
```

### Community Status Transitions

```
┌──────────────────┐
│Under Construction│
└────────┬─────────┘
         │ Construction complete
         ▼
┌────────────┐     Systems ready      ┌────────┐
│ Pre-Launch │─────────────────────────│ Active │◄─┐
└────────────┘                         └────┬───┘  │
                                            │      │
                     All occupied───────────┼──────┤
                     ┌──────────────┐       │      │
                     │Full Capacity │───────┘      │
                     └──────────────┘              │
                                                   │
         Temporary───┬───────────────────────┬─────┤
         ┌───────────┐      ┌────────────────┐    │
         │Maintenance│      │Seasonal Closure│────┘
         └───────────┘      └────────────────┘
                 │                  │
         Paused──┼──────────────────┼──→ ┌──────────┐
                 └──────────────────────→│ Inactive │
                                          └────┬─────┘
                                               │
                                    Permanent──┼──→ ┌──────────┐
                                                    │ Archived │
                                                    └──────────┘
```

### Business Rules for Communities

1. **Cannot Archive**: If has properties with status 'occupied' or 'reserved'
2. **Auto Full Capacity**: When all properties are 'occupied'
3. **Seasonal Closure**: Must specify reopening date
4. **Maintenance Mode**: Must specify expected duration and reason
5. **Pre-Launch → Active**: Requires at least one property with status 'available'

### Features by Status

| Feature | Active | Construction | Pre-Launch | Full | Maintenance | Seasonal | Inactive | Archived |
|---------|--------|--------------|------------|------|-------------|----------|----------|----------|
| Accept New Residents | ✅ | ❌ | ❌ | ❌ | ⚠️ Limited | ❌ | ❌ | ❌ |
| Visitor Access | ✅ | ❌ | ⚠️ Staff | ✅ | ✅ | ❌ | ❌ | ❌ |
| Automation/IoT | ✅ | ❌ | ⚠️ Testing | ✅ | ⚠️ Manual | ❌ | ❌ | ❌ |
| Add Properties | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Billing Active | ✅ | ❌ | ❌ | ✅ | ✅ | ⚠️ Reduced | ❌ | ❌ |

---

## 🏠 Property Statuses
**Focus: Access Control & Entry Logging System**

### Status Options

| Status | Description | Visitor Access | Use Case |
|--------|-------------|----------------|----------|
| **Active** ✅ | Normal operations | Allowed | Property has residents, full access control |
| **Vacant** 🚪 | No residents assigned | Blocked | Empty property, no visitor access |
| **Access Restricted** ⚠️ | Limited access | Conditional | Temporary restrictions, approval required |
| **Maintenance** 🔧 | Service access only | Service Personnel | Repairs in progress, controlled entry |
| **Emergency Lockdown** 🚨 | Security incident | Blocked | No entry except emergency services |
| **Guest Mode** 👥 | Temporary occupancy | Allowed | Short-term rental, vacation property |
| **Out of Service** ⛔ | Not operational | Blocked | Security system offline, no monitoring |
| **Deactivated** 💤 | Removed from system | Blocked | Not currently managed |
| **Archived** 📦 | Historical record | N/A | No longer exists in community |

### TypeScript Type Definition
```typescript
type PropertyStatus =
  | 'active'           // Normal visitor access enabled
  | 'vacant'           // No residents, no visitor access
  | 'access-restricted'// Limited/conditional access
  | 'maintenance'      // Service personnel only
  | 'emergency-lockdown' // Security lockdown
  | 'guest-mode'       // Temporary occupancy
  | 'out-of-service'   // Security system offline
  | 'deactivated'      // Not in active system
  | 'archived'         // Historical only
```

### Property Status Transitions
**Access Control Flow**

```
                                    ┌────────┐
                    Residents───────│ Active │◄───Residents assigned
                    assigned        └───┬────┘
                                        │
                            ┌───────────┼───────────┐
                            │           │           │
                    Residents move─┐    │    Security│
                    out / empty    │    │    incident│
                            ┌──────▼────▼───┐ ┌─────▼─────────┐
                            │    Vacant     │ │Emergency      │
                            └───────┬───────┘ │Lockdown       │
                                    │         └───────┬───────┘
                    Temp  ┌─────────┼─────────┐       │
                    guest │         │         │  Incident
                    ┌─────▼────┐    │    ┌────▼──────┴──────┐ resolved
                    │Guest Mode│    │    │Access Restricted  │────┐
                    └──────────┘    │    └───────────────────┘    │
                                    │                             │
                    Service ┌───────┼─────────┐                   │
                    needed  │       │         │                   │
                    ┌───────▼───┐   │   ┌─────▼──────┐           │
                    │Maintenance│   │   │Out of      │           │
                    └───────┬───┘   │   │Service     │           │
                        │           │   └─────┬──────┘           │
                    Service       │   │     System               │
                    complete      │   │     restored             │
                        └─────────┼───┼─────┘                    │
                                  │   │                          │
                                  └───┴──◄───────────────────────┘
                                      │
                    Remove from   ┌───▼────────┐
                    system────────│Deactivated │
                                  └────┬───────┘
                                       │
                    Permanent──────────┼──────► ┌──────────┐
                                                │ Archived │
                                                └──────────┘
```

### Business Rules for Properties
**Entry/Exit Logging Focus**

1. **Active Properties**: Only properties with 'active' or 'guest-mode' status can create visitor passes
2. **Vacant Properties**: Automatically block all visitor QR code generation
3. **Emergency Lockdown**: Overrides all other rules; only emergency services can access
4. **Access Restricted**: Requires admin approval for each visitor pass
5. **Maintenance Mode**: Only allows service personnel with pre-approved passes
6. **Out of Service**: Security system offline; manual gate control only
7. **Cannot Delete**: If property has active visitor passes or recent entry logs (last 30 days)
8. **Auto-Vacant**: When no residents assigned for 30+ days
9. **Auto-Active**: When residents are assigned to vacant property

### Visitor Access Control by Status

| Status | Create Passes | QR Scan Entry | IoT Gate Control | Notes |
|--------|---------------|---------------|------------------|-------|
| **Active** | ✅ Allowed | ✅ Allowed | ✅ Enabled | Normal operations |
| **Vacant** | ❌ Blocked | ❌ Blocked | ⚠️ Manual Only | No residents to host |
| **Access Restricted** | ⚠️ Admin Approval | ⚠️ Approval Required | ⚠️ Manual Only | Security restriction |
| **Maintenance** | ⚠️ Service Only | ⚠️ Service Personnel | ⚠️ Manual Only | Controlled access |
| **Emergency Lockdown** | ❌ Blocked | ❌ Blocked | ❌ Disabled | Security incident |
| **Guest Mode** | ✅ Allowed | ✅ Allowed | ✅ Enabled | Temporary occupancy |
| **Out of Service** | ❌ Blocked | ❌ Blocked | ❌ Offline | System maintenance |
| **Deactivated** | ❌ Blocked | ❌ Blocked | ❌ Disabled | Not in system |
| **Archived** | ❌ Blocked | ❌ Blocked | ❌ Disabled | Historical only |

---

## 🎨 Color Coding

### Status Color Scheme

| Color | Hex | RGB | Status Examples |
|-------|-----|-----|-----------------|
| 🟢 **Success Green** | `#4CAF50` | `rgb(76, 175, 80)` | Active, Available, Occupied |
| 🟡 **Warning Yellow** | `#FFC107` | `rgb(255, 193, 7)` | Pending, Reserved, Pre-Launch |
| 🟠 **Alert Orange** | `#FF9800` | `rgb(255, 152, 0)` | Maintenance, Under Renovation |
| 🔴 **Error Red** | `#F44336` | `rgb(244, 67, 54)` | Suspended, Condemned, Full Capacity |
| ⚫ **Neutral Gray** | `#9E9E9E` | `rgb(158, 158, 158)` | Inactive, Archived, Vacant |
| 🔵 **Info Blue** | `#2196F3` | `rgb(33, 150, 243)` | Under Construction, For Sale |
| 🟣 **Special Purple** | `#9C27B0` | `rgb(156, 39, 176)` | Seasonal Closure |

### Vuetify Color Mapping
```typescript
const statusColorMap = {
  // Green - Success
  'active': 'success',
  'available': 'success',
  'occupied': 'success',

  // Yellow - Warning
  'pending': 'warning',
  'reserved': 'warning',
  'pre-launch': 'warning',

  // Orange - Alert
  'maintenance': 'orange',
  'under-renovation': 'orange',

  // Red - Error
  'suspended': 'error',
  'condemned': 'error',
  'full-capacity': 'error',

  // Gray - Neutral
  'inactive': 'grey',
  'archived': 'grey',
  'vacant': 'grey',

  // Blue - Info
  'under-construction': 'info',
  'for-sale': 'info',

  // Purple - Special
  'seasonal-closure': 'purple',
}
```

---

## 🔄 Status Transitions

### Allowed Transitions Matrix

#### Users
| From / To | Active | Pending | Suspended | Inactive | Archived |
|-----------|--------|---------|-----------|----------|----------|
| **Active** | - | ❌ | ✅ Admin | ✅ User/Admin | ✅ Admin |
| **Pending** | ✅ Verify | - | ❌ | ❌ | ✅ Admin |
| **Suspended** | ✅ Admin | ❌ | - | ✅ Admin | ✅ Admin |
| **Inactive** | ✅ Reactivate | ❌ | ❌ | - | ✅ Admin |
| **Archived** | ❌ | ❌ | ❌ | ❌ | - |

#### Communities
| From / To | Active | Construction | Pre-Launch | Full | Maintenance | Seasonal | Inactive | Archived |
|-----------|--------|--------------|------------|------|-------------|----------|----------|----------|
| **Active** | - | ❌ | ❌ | ✅ Auto | ✅ Temp | ✅ Seasonal | ✅ Admin | ✅ Admin |
| **Construction** | ❌ | - | ✅ Ready | ❌ | ❌ | ❌ | ✅ Admin | ✅ Admin |
| **Pre-Launch** | ✅ Launch | ❌ | - | ❌ | ❌ | ❌ | ✅ Admin | ✅ Admin |
| **Full Capacity** | ✅ Vacancy | ❌ | ❌ | - | ✅ Temp | ✅ Seasonal | ❌ | ✅ Admin |
| **Maintenance** | ✅ Complete | ❌ | ❌ | ❌ | - | ❌ | ✅ Admin | ✅ Admin |
| **Seasonal** | ✅ Reopen | ❌ | ❌ | ❌ | ❌ | - | ✅ Admin | ✅ Admin |
| **Inactive** | ✅ Reactivate | ❌ | ❌ | ❌ | ❌ | ❌ | - | ✅ Admin |
| **Archived** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | - |

#### Properties (Access Control Focus)
| From / To | Active | Vacant | Restricted | Maintenance | Lockdown | Guest Mode | Out of Service | Deactivated | Archived |
|-----------|--------|--------|------------|-------------|----------|------------|----------------|-------------|----------|
| **Active** | - | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Vacant** | ✅ Assign | - | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Access Restricted** | ✅ Lifted | ✅ | - | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Maintenance** | ✅ Complete | ✅ | ✅ | - | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Emergency Lockdown** | ✅ Resolved | ✅ | ✅ | ✅ | - | ❌ | ✅ | ✅ | ✅ |
| **Guest Mode** | ✅ | ✅ | ✅ | ✅ | ✅ | - | ✅ | ✅ | ✅ |
| **Out of Service** | ✅ Restored | ✅ | ✅ | ✅ | ❌ | ❌ | - | ✅ | ✅ |
| **Deactivated** | ✅ Reactivate | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | - | ✅ |
| **Archived** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | - |

---

## 💾 Database Schema

### Users (profile table)

```sql
-- Add status column
ALTER TABLE profile
ADD COLUMN status VARCHAR(50) DEFAULT 'pending'
CHECK (status IN ('active', 'pending', 'suspended', 'inactive', 'archived'));

-- Add status tracking fields
ALTER TABLE profile
ADD COLUMN status_changed_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN status_changed_by UUID REFERENCES profile(id),
ADD COLUMN status_reason TEXT;

-- Add index for filtering
CREATE INDEX idx_profile_status ON profile(status);

-- Add index for auto-inactive detection
CREATE INDEX idx_profile_last_login ON profile(last_login_at)
WHERE status = 'active';
```

### Communities

```sql
-- Add status column
ALTER TABLE community
ADD COLUMN status VARCHAR(50) DEFAULT 'active'
CHECK (status IN (
  'active', 'under-construction', 'pre-launch', 'full-capacity',
  'maintenance', 'seasonal-closure', 'inactive', 'archived'
));

-- Add status tracking fields
ALTER TABLE community
ADD COLUMN status_changed_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN status_changed_by UUID REFERENCES profile(id),
ADD COLUMN status_reason TEXT;

-- Add seasonal closure fields
ALTER TABLE community
ADD COLUMN seasonal_reopening_date DATE,
ADD COLUMN maintenance_expected_completion DATE;

-- Add index for filtering
CREATE INDEX idx_community_status ON community(status);
```

### Properties

```sql
-- Add status column
ALTER TABLE property
ADD COLUMN status VARCHAR(50) DEFAULT 'available'
CHECK (status IN (
  'available', 'occupied', 'reserved', 'vacant',
  'under-renovation', 'maintenance', 'condemned',
  'for-sale', 'inactive', 'archived'
));

-- Add status tracking fields
ALTER TABLE property
ADD COLUMN status_changed_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN status_changed_by UUID REFERENCES profile(id),
ADD COLUMN status_reason TEXT;

-- Add occupancy tracking
ALTER TABLE property
ADD COLUMN occupied_since TIMESTAMPTZ,
ADD COLUMN available_since TIMESTAMPTZ,
ADD COLUMN lease_start_date DATE,
ADD COLUMN lease_end_date DATE;

-- Add index for filtering
CREATE INDEX idx_property_status ON property(status);
CREATE INDEX idx_property_community_status ON property(community_id, status);

-- Add index for lease expiration monitoring
CREATE INDEX idx_property_lease_end ON property(lease_end_date)
WHERE status = 'occupied';
```

### Status History Audit Table

```sql
CREATE TABLE status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('user', 'community', 'property')),
  entity_id TEXT NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES profile(id),
  reason TEXT,
  metadata JSONB, -- Store additional context
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX idx_status_history_entity ON status_history(entity_type, entity_id);
CREATE INDEX idx_status_history_changed_at ON status_history(changed_at DESC);
CREATE INDEX idx_status_history_changed_by ON status_history(changed_by);
```

---

## 🛠️ Implementation Recommendations

### 1. Database Functions for Status Changes

```sql
-- Function to change user status with audit trail
CREATE OR REPLACE FUNCTION change_user_status(
  p_user_id UUID,
  p_new_status VARCHAR(50),
  p_changed_by UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_old_status VARCHAR(50);
BEGIN
  -- Get current status
  SELECT status INTO v_old_status FROM profile WHERE id = p_user_id;

  -- Update status
  UPDATE profile
  SET
    status = p_new_status,
    status_changed_at = NOW(),
    status_changed_by = p_changed_by,
    status_reason = p_reason
  WHERE id = p_user_id;

  -- Record in history
  INSERT INTO status_history (entity_type, entity_id, old_status, new_status, changed_by, reason)
  VALUES ('user', p_user_id::TEXT, v_old_status, p_new_status, p_changed_by, p_reason);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### 2. Automated Status Changes

```sql
-- Function to auto-set users to inactive after 180 days
CREATE OR REPLACE FUNCTION auto_inactive_users() RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE profile
    SET
      status = 'inactive',
      status_changed_at = NOW(),
      status_reason = 'Auto-inactive: 180 days no login'
    WHERE
      status = 'active'
      AND last_login_at < NOW() - INTERVAL '180 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule this function to run daily via cron or scheduled job
```

### 3. Status Validation Functions

```sql
-- Check if community can be archived
CREATE OR REPLACE FUNCTION can_archive_community(p_community_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM property
    WHERE community_id = p_community_id
    AND status IN ('occupied', 'reserved')
  );
END;
$$ LANGUAGE plpgsql;
```

### 4. Frontend Composable

```typescript
// src/composables/useStatus.ts
import { supabase } from '@/lib/supabase'

export const useStatus = () => {
  const changeUserStatus = async (
    userId: string,
    newStatus: string,
    reason?: string
  ) => {
    const { data: userData } = await supabase.auth.getUser()

    const { error } = await supabase.rpc('change_user_status', {
      p_user_id: userId,
      p_new_status: newStatus,
      p_changed_by: userData.user?.id,
      p_reason: reason,
    })

    if (error) throw error
    return true
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      'active': 'success',
      'available': 'success',
      'occupied': 'success',
      'pending': 'warning',
      'reserved': 'warning',
      'suspended': 'error',
      'condemned': 'error',
      'inactive': 'grey',
      'archived': 'grey',
      // ... add more mappings
    }
    return colorMap[status] || 'grey'
  }

  const getStatusIcon = (status: string) => {
    const iconMap: Record<string, string> = {
      'active': 'tabler-check',
      'pending': 'tabler-clock',
      'suspended': 'tabler-ban',
      'inactive': 'tabler-moon',
      'archived': 'tabler-archive',
      // ... add more mappings
    }
    return iconMap[status] || 'tabler-circle'
  }

  return {
    changeUserStatus,
    getStatusColor,
    getStatusIcon,
  }
}
```

### 5. Status Badge Component

```vue
<!-- src/components/StatusBadge.vue -->
<script setup lang="ts">
const props = defineProps<{
  status: string
  entityType?: 'user' | 'community' | 'property'
}>()

const { getStatusColor, getStatusIcon } = useStatus()

const formattedStatus = computed(() => {
  return props.status
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
})
</script>

<template>
  <VChip
    :color="getStatusColor(status)"
    :prepend-icon="getStatusIcon(status)"
    size="small"
    variant="tonal"
  >
    {{ formattedStatus }}
  </VChip>
</template>
```

---

## ⚖️ Business Rules

### Critical Rules to Enforce

#### User Status Rules

1. **Email Verification Required**: Users with status 'pending' cannot log in until email is verified
2. **Suspension Reason Mandatory**: Changing status to 'suspended' requires a reason
3. **Archive Confirmation**: Archiving a user requires confirmation (cannot be undone)
4. **Role Preservation**: Archiving a user preserves their role assignments for audit
5. **Active Admin Check**: Cannot suspend/archive last active admin of a community

#### Community Status Rules

1. **Property Check**: Cannot archive community with occupied/reserved properties
2. **Auto Full Capacity**: Automatically set to 'full-capacity' when all properties occupied
3. **Auto Active**: Automatically revert from 'full-capacity' to 'active' when vacancy occurs
4. **Seasonal Dates**: 'seasonal-closure' status requires reopening date
5. **Maintenance Duration**: 'maintenance' status should include expected completion date
6. **Construction Progress**: Track construction milestones before allowing pre-launch

#### Property Status Rules

1. **Lease Dates**: 'occupied' status requires lease start/end dates
2. **Auto Vacancy**: Automatically change to 'vacant' on lease end date
3. **Visitor Access**: Only 'occupied' and certain 'maintenance' properties allow visitors
4. **Inspection Required**: 'vacant' → 'available' requires inspection approval
5. **Safety First**: 'condemned' properties cannot accept visitors or residents
6. **Reservation Expiry**: 'reserved' status expires after 30 days if not occupied

### Notification Rules

#### Trigger Notifications When:

**Users:**
- Status changes to 'suspended' → Notify user via email
- Status changes to 'active' from 'pending' → Welcome email
- Auto-inactive triggered → Warning email before, confirmation after

**Communities:**
- Status changes to 'maintenance' → Notify all residents
- Status changes to 'full-capacity' → Notify administrators
- Seasonal closure approaching → Notify residents 30 days before

**Properties:**
- Lease expiring soon → Notify resident and admin (30 days, 7 days, 1 day)
- Status changes to 'condemned' → Immediate notification to safety team
- Status changes to 'under-renovation' → Notify adjacent units

---

## 📊 Dashboard Integration

### Status Metrics to Display

#### User Dashboard
```typescript
const userStatusMetrics = {
  active: count,
  pending: count,
  suspended: count,
  inactive: count,
  total: count,
  percentageActive: (active / total) * 100
}
```

#### Community Dashboard
```typescript
const communityStatusMetrics = {
  active: count,
  underConstruction: count,
  fullCapacity: count,
  maintenance: count,
  total: count,
  averageOccupancyRate: percentage
}
```

#### Property Dashboard
```typescript
const propertyStatusMetrics = {
  available: count,
  occupied: count,
  reserved: count,
  vacant: count,
  total: count,
  occupancyRate: (occupied / total) * 100,
  availabilityRate: (available / total) * 100
}
```

### Status Filters

Add status dropdown filters to all list views:

```vue
<VSelect
  v-model="selectedStatus"
  :items="statusOptions"
  label="Filter by Status"
  multiple
  clearable
/>
```

---

## 🚀 Implementation Phases

### Phase 1: Database Setup (Week 1)
- [ ] Add status columns to all three tables
- [ ] Create status_history audit table
- [ ] Add indexes for performance
- [ ] Create database functions for status changes
- [ ] Add constraints and validation

### Phase 2: Backend Logic (Week 2)
- [ ] Implement status change functions
- [ ] Add RLS policies for status-based access
- [ ] Create automated status change jobs
- [ ] Implement notification triggers
- [ ] Add status validation rules

### Phase 3: Frontend Components (Week 3)
- [ ] Create StatusBadge component
- [ ] Create useStatus composable
- [ ] Add status filters to list views
- [ ] Create status change dialogs
- [ ] Add status to dashboard cards

### Phase 4: User Flows (Week 4)
- [ ] Implement user status change UI
- [ ] Add community status management
- [ ] Add property status management
- [ ] Create status history view
- [ ] Add bulk status operations

### Phase 5: Automation & Polish (Week 5)
- [ ] Set up automated status changes
- [ ] Configure notifications
- [ ] Add status analytics
- [ ] Performance optimization
- [ ] Documentation and training

---

## 🤔 Open Questions for Discussion

1. **User Auto-Inactive Duration**: Should it be 180 days or different (90, 365)?
2. **Reservation Expiry**: How long should 'reserved' status last before auto-canceling?
3. **Suspended Users Data**: Should suspended users' data be hidden from other users?
4. **Community Full Capacity**: Should there be a waitlist feature?
5. **Property Condemned**: What approval process is needed to un-condemn?
6. **Status Change Permissions**: Who can change what? Role-based matrix needed?
7. **Billing Impact**: How do status changes affect billing cycles?
8. **Historical Data**: How long to keep status_history records?
9. **Multi-Status**: Can a property be both 'occupied' and 'for-sale'? Need flags vs statuses?
10. **Migration Strategy**: How to set initial statuses for existing records?

---

## 📝 Notes

- This is a living document - update as requirements evolve
- Test status transitions thoroughly before production
- Consider edge cases in status logic
- Ensure all status changes are audited
- Review performance impact of status queries
- Plan for data migration of existing records

---

**Last Updated:** 2025-11-21
**Next Review Date:** [To be scheduled]
**Document Owner:** [To be assigned]
