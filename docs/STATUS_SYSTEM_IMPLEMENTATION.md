# Status System Implementation Plan

**Created:** 2025-11-21
**Status:** Ready for Implementation
**Reference:** [STATUS_SYSTEM_DESIGN.md](./STATUS_SYSTEM_DESIGN.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Implementation Checklist](#pre-implementation-checklist)
3. [Phase 1: Database Schema](#phase-1-database-schema)
4. [Phase 2: Database Functions](#phase-2-database-functions)
5. [Phase 3: RLS Policies & Types](#phase-3-rls-policies--types)
6. [Phase 4: Frontend Composables & Components](#phase-4-frontend-composables--components)
7. [Phase 5: UI Integration](#phase-5-ui-integration)
8. [Phase 6: Testing & Validation](#phase-6-testing--validation)
9. [Migration Strategy](#migration-strategy)
10. [Rollback Plan](#rollback-plan)
11. [Multilingual Support](#multilingual-support)

---

## Overview

This implementation plan adds comprehensive status management to Users (profile), Communities, and Properties with:
- Status columns with CHECK constraints
- Audit trail via `status_history` table
- Database functions for status changes
- Frontend components and composables
- Status-based filtering and display
- **Multilingual support** (English, Spanish, Portuguese)

**Estimated Time:** 2-3 days
**Risk Level:** Medium (database schema changes)

**Related Documentation:**
- [STATUS_SYSTEM_DESIGN.md](./STATUS_SYSTEM_DESIGN.md) - Status system design and business rules
- [STATUS_I18N_GUIDE.md](./STATUS_I18N_GUIDE.md) - Multilingual translation guide

---

## Pre-Implementation Checklist

### CRITICAL: Create Database Backup

```bash
# Run this BEFORE making any changes
./scripts/backup-database.sh before_status_system_implementation

# Verify backup was created
ls -lh backups/
```

### Verify Current Schema

```sql
-- Check if status columns already exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('profile', 'community', 'property')
  AND column_name = 'status';
```

### Prerequisites

- [ ] Database backup completed and verified
- [ ] Current schema documented
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Development environment running
- [ ] No active users in production (if applying to production)

---

## Phase 1: Database Schema

### Migration 1: Add Status Columns to Profile Table

**File:** Create new Supabase migration

```bash
# Create migration file
supabase migration new add_status_to_profile
```

**SQL Content:**

```sql
-- Migration: add_status_to_profile
-- Description: Add status management to profile table

-- Add status column with default 'pending' for new users
ALTER TABLE profile
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending'
CHECK (status IN ('active', 'pending', 'suspended', 'inactive', 'archived'));

-- Add status tracking fields
ALTER TABLE profile
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE profile
ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES profile(id);

ALTER TABLE profile
ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- Add last_login_at if it doesn't exist (for auto-inactive detection)
ALTER TABLE profile
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- Create index for filtering by status
CREATE INDEX IF NOT EXISTS idx_profile_status ON profile(status);

-- Create index for auto-inactive detection
CREATE INDEX IF NOT EXISTS idx_profile_last_login
ON profile(last_login_at)
WHERE status = 'active';

-- Set existing users to 'active' status
UPDATE profile
SET status = 'active',
    status_changed_at = NOW()
WHERE status IS NULL OR status = 'pending';

-- Add comment
COMMENT ON COLUMN profile.status IS 'User status: active, pending, suspended, inactive, archived';
```

### Migration 2: Add Status Columns to Community Table

```bash
supabase migration new add_status_to_community
```

**SQL Content:**

```sql
-- Migration: add_status_to_community
-- Description: Add status management to community table

-- Add status column with default 'active'
ALTER TABLE community
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'
CHECK (status IN (
  'active',
  'under-construction',
  'pre-launch',
  'full-capacity',
  'maintenance',
  'seasonal-closure',
  'inactive',
  'archived'
));

-- Add status tracking fields
ALTER TABLE community
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE community
ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES profile(id);

ALTER TABLE community
ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- Add seasonal and maintenance tracking
ALTER TABLE community
ADD COLUMN IF NOT EXISTS seasonal_reopening_date DATE;

ALTER TABLE community
ADD COLUMN IF NOT EXISTS maintenance_expected_completion DATE;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_community_status ON community(status);

-- Set existing communities to 'active' status
UPDATE community
SET status = 'active',
    status_changed_at = NOW()
WHERE status IS NULL;

-- Add comment
COMMENT ON COLUMN community.status IS 'Community status: active, under-construction, pre-launch, full-capacity, maintenance, seasonal-closure, inactive, archived';
```

### Migration 3: Add Status Columns to Property Table

```bash
supabase migration new add_status_to_property
```

**SQL Content:**

```sql
-- Migration: add_status_to_property
-- Description: Add access control status management to property table

-- Add status column with default 'vacant'
ALTER TABLE property
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'vacant'
CHECK (status IN (
  'active',
  'vacant',
  'access-restricted',
  'maintenance',
  'emergency-lockdown',
  'guest-mode',
  'out-of-service',
  'deactivated',
  'archived'
));

-- Add status tracking fields
ALTER TABLE property
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE property
ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES profile(id);

ALTER TABLE property
ADD COLUMN IF NOT EXISTS status_reason TEXT;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_property_status ON property(status);

-- Create composite index for community+status queries
CREATE INDEX IF NOT EXISTS idx_property_community_status
ON property(community_id, status);

-- Set existing properties to 'active' or 'vacant' based on owner assignment
UPDATE property
SET status = CASE
  WHEN EXISTS (SELECT 1 FROM property_owner WHERE property_id = property.id)
  THEN 'active'
  ELSE 'vacant'
END,
status_changed_at = NOW()
WHERE status IS NULL;

-- Add comment
COMMENT ON COLUMN property.status IS 'Property access control status: active, vacant, access-restricted, maintenance, emergency-lockdown, guest-mode, out-of-service, deactivated, archived';
```

### Migration 4: Create Status History Audit Table

```bash
supabase migration new create_status_history_table
```

**SQL Content:**

```sql
-- Migration: create_status_history_table
-- Description: Create audit trail for all status changes

-- Create status_history table
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(50) NOT NULL
    CHECK (entity_type IN ('user', 'community', 'property')),
  entity_id TEXT NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES profile(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_status_history_entity
ON status_history(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_status_history_changed_at
ON status_history(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_status_history_changed_by
ON status_history(changed_by);

CREATE INDEX IF NOT EXISTS idx_status_history_entity_type
ON status_history(entity_type);

-- Add comments
COMMENT ON TABLE status_history IS 'Audit trail for all status changes across users, communities, and properties';
COMMENT ON COLUMN status_history.metadata IS 'Additional context as JSON (e.g., IP address, user agent, approval info)';

-- Enable RLS
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to view status history
CREATE POLICY "Users can view status history"
ON status_history FOR SELECT
TO authenticated
USING (true);

-- RLS Policy: Only system can insert status history (via functions)
CREATE POLICY "Only functions can insert status history"
ON status_history FOR INSERT
TO authenticated
WITH CHECK (false); -- Will be inserted via SECURITY DEFINER functions
```

---

## Phase 2: Database Functions

### Function 1: Change User Status

```sql
-- Function to change user status with validation and audit trail
CREATE OR REPLACE FUNCTION change_user_status(
  p_user_id UUID,
  p_new_status VARCHAR(50),
  p_changed_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_old_status VARCHAR(50);
  v_result JSON;
BEGIN
  -- Validate new status
  IF p_new_status NOT IN ('active', 'pending', 'suspended', 'inactive', 'archived') THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  -- Get current status
  SELECT status INTO v_old_status
  FROM profile
  WHERE id = p_user_id;

  -- Check if user exists
  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Validate transition (archived is permanent)
  IF v_old_status = 'archived' THEN
    RAISE EXCEPTION 'Cannot change status of archived user';
  END IF;

  -- Require reason for suspension
  IF p_new_status = 'suspended' AND p_reason IS NULL THEN
    RAISE EXCEPTION 'Reason required when suspending user';
  END IF;

  -- Update status
  UPDATE profile
  SET
    status = p_new_status,
    status_changed_at = NOW(),
    status_changed_by = p_changed_by,
    status_reason = p_reason
  WHERE id = p_user_id;

  -- Record in history
  INSERT INTO status_history (
    entity_type,
    entity_id,
    old_status,
    new_status,
    changed_by,
    reason
  )
  VALUES (
    'user',
    p_user_id::TEXT,
    v_old_status,
    p_new_status,
    p_changed_by,
    p_reason
  );

  -- Return result
  v_result := json_build_object(
    'success', true,
    'user_id', p_user_id,
    'old_status', v_old_status,
    'new_status', p_new_status
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION change_user_status IS 'Changes user status with validation and creates audit trail entry';
```

### Function 2: Change Community Status

```sql
-- Function to change community status with validation
CREATE OR REPLACE FUNCTION change_community_status(
  p_community_id TEXT,
  p_new_status VARCHAR(50),
  p_changed_by UUID,
  p_reason TEXT DEFAULT NULL,
  p_reopening_date DATE DEFAULT NULL,
  p_completion_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_old_status VARCHAR(50);
  v_occupied_count INTEGER;
  v_result JSON;
BEGIN
  -- Validate new status
  IF p_new_status NOT IN (
    'active', 'under-construction', 'pre-launch', 'full-capacity',
    'maintenance', 'seasonal-closure', 'inactive', 'archived'
  ) THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  -- Get current status
  SELECT status INTO v_old_status
  FROM community
  WHERE id = p_community_id;

  -- Check if community exists
  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Community not found: %', p_community_id;
  END IF;

  -- Archived is permanent
  IF v_old_status = 'archived' THEN
    RAISE EXCEPTION 'Cannot change status of archived community';
  END IF;

  -- Validate archival - check for active properties
  IF p_new_status = 'archived' THEN
    SELECT COUNT(*) INTO v_occupied_count
    FROM property
    WHERE community_id = p_community_id
      AND status IN ('active', 'guest-mode');

    IF v_occupied_count > 0 THEN
      RAISE EXCEPTION 'Cannot archive community with % active properties', v_occupied_count;
    END IF;
  END IF;

  -- Validate seasonal closure requires reopening date
  IF p_new_status = 'seasonal-closure' AND p_reopening_date IS NULL THEN
    RAISE EXCEPTION 'Seasonal closure requires a reopening date';
  END IF;

  -- Update status
  UPDATE community
  SET
    status = p_new_status,
    status_changed_at = NOW(),
    status_changed_by = p_changed_by,
    status_reason = p_reason,
    seasonal_reopening_date = p_reopening_date,
    maintenance_expected_completion = p_completion_date
  WHERE id = p_community_id;

  -- Record in history
  INSERT INTO status_history (
    entity_type,
    entity_id,
    old_status,
    new_status,
    changed_by,
    reason,
    metadata
  )
  VALUES (
    'community',
    p_community_id,
    v_old_status,
    p_new_status,
    p_changed_by,
    p_reason,
    json_build_object(
      'reopening_date', p_reopening_date,
      'completion_date', p_completion_date
    )::jsonb
  );

  -- Return result
  v_result := json_build_object(
    'success', true,
    'community_id', p_community_id,
    'old_status', v_old_status,
    'new_status', p_new_status
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Function 3: Change Property Status

```sql
-- Function to change property status with visitor access validation
CREATE OR REPLACE FUNCTION change_property_status(
  p_property_id TEXT,
  p_new_status VARCHAR(50),
  p_changed_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_old_status VARCHAR(50);
  v_active_passes INTEGER;
  v_result JSON;
BEGIN
  -- Validate new status
  IF p_new_status NOT IN (
    'active', 'vacant', 'access-restricted', 'maintenance',
    'emergency-lockdown', 'guest-mode', 'out-of-service',
    'deactivated', 'archived'
  ) THEN
    RAISE EXCEPTION 'Invalid status: %', p_new_status;
  END IF;

  -- Get current status
  SELECT status INTO v_old_status
  FROM property
  WHERE id = p_property_id;

  -- Check if property exists
  IF v_old_status IS NULL THEN
    RAISE EXCEPTION 'Property not found: %', p_property_id;
  END IF;

  -- Archived is permanent
  IF v_old_status = 'archived' THEN
    RAISE EXCEPTION 'Cannot change status of archived property';
  END IF;

  -- Check for active visitor passes when changing to restricted status
  IF p_new_status IN ('emergency-lockdown', 'out-of-service', 'archived') THEN
    SELECT COUNT(*) INTO v_active_passes
    FROM visitor_records_uid
    WHERE property_id = p_property_id
      AND is_used = false
      AND expiry_date > NOW();

    IF v_active_passes > 0 THEN
      RAISE WARNING 'Property has % active visitor passes that will be invalidated', v_active_passes;
    END IF;
  END IF;

  -- Update status
  UPDATE property
  SET
    status = p_new_status,
    status_changed_at = NOW(),
    status_changed_by = p_changed_by,
    status_reason = p_reason
  WHERE id = p_property_id;

  -- Record in history
  INSERT INTO status_history (
    entity_type,
    entity_id,
    old_status,
    new_status,
    changed_by,
    reason
  )
  VALUES (
    'property',
    p_property_id,
    v_old_status,
    p_new_status,
    p_changed_by,
    p_reason
  );

  -- Return result
  v_result := json_build_object(
    'success', true,
    'property_id', p_property_id,
    'old_status', v_old_status,
    'new_status', p_new_status,
    'active_passes_affected', v_active_passes
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Function 4: Auto-Inactive Users

```sql
-- Function to automatically set users to inactive after 180 days
CREATE OR REPLACE FUNCTION auto_inactive_users(
  p_days_threshold INTEGER DEFAULT 180
)
RETURNS JSON AS $$
DECLARE
  v_updated_count INTEGER := 0;
  v_user_record RECORD;
  v_result JSON;
BEGIN
  -- Update users to inactive
  FOR v_user_record IN
    SELECT id, email, last_login_at
    FROM profile
    WHERE status = 'active'
      AND (
        last_login_at < NOW() - (p_days_threshold || ' days')::INTERVAL
        OR last_login_at IS NULL
      )
  LOOP
    -- Change status
    PERFORM change_user_status(
      v_user_record.id,
      'inactive',
      NULL, -- System action
      format('Auto-inactive: %s days no login', p_days_threshold)
    );

    v_updated_count := v_updated_count + 1;
  END LOOP;

  v_result := json_build_object(
    'success', true,
    'users_set_inactive', v_updated_count,
    'threshold_days', p_days_threshold
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION auto_inactive_users IS 'Sets users to inactive status after specified days of no login (default: 180)';
```

### Function 5: Validation Helpers

```sql
-- Check if property can be archived
CREATE OR REPLACE FUNCTION can_archive_property(p_property_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_recent_logs INTEGER;
  v_active_passes INTEGER;
BEGIN
  -- Check for recent entry logs (last 30 days)
  SELECT COUNT(*) INTO v_recent_logs
  FROM visitor_record_logs
  WHERE property_id = p_property_id
    AND created_at > NOW() - INTERVAL '30 days';

  -- Check for active visitor passes
  SELECT COUNT(*) INTO v_active_passes
  FROM visitor_records_uid
  WHERE property_id = p_property_id
    AND is_used = false
    AND expiry_date > NOW();

  RETURN (v_recent_logs = 0 AND v_active_passes = 0);
END;
$$ LANGUAGE plpgsql;

-- Get status statistics
CREATE OR REPLACE FUNCTION get_status_statistics(
  p_entity_type VARCHAR(50)
)
RETURNS JSON AS $$
DECLARE
  v_stats JSON;
BEGIN
  IF p_entity_type = 'user' THEN
    SELECT json_agg(row_to_json(t))
    INTO v_stats
    FROM (
      SELECT
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM profile
      GROUP BY status
      ORDER BY count DESC
    ) t;
  ELSIF p_entity_type = 'community' THEN
    SELECT json_agg(row_to_json(t))
    INTO v_stats
    FROM (
      SELECT
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM community
      GROUP BY status
      ORDER BY count DESC
    ) t;
  ELSIF p_entity_type = 'property' THEN
    SELECT json_agg(row_to_json(t))
    INTO v_stats
    FROM (
      SELECT
        status,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
      FROM property
      GROUP BY status
      ORDER BY count DESC
    ) t;
  ELSE
    RAISE EXCEPTION 'Invalid entity type: %', p_entity_type;
  END IF;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql;
```

---

## Phase 3: RLS Policies & Types

### Update RLS Policies

```sql
-- Add RLS policy to restrict viewing suspended/archived users
CREATE POLICY "Users cannot view suspended profiles unless admin"
ON profile FOR SELECT
TO authenticated
USING (
  -- User can see their own profile
  auth.uid() = id
  OR
  -- Or if they're not suspended/archived
  status NOT IN ('suspended', 'archived')
  OR
  -- Or if viewer is admin/super-admin
  EXISTS (
    SELECT 1 FROM profile_role pr
    JOIN role r ON pr.role_id = r.id
    WHERE pr.profile_id = auth.uid()
    AND r.name IN ('Super Admin', 'Administrator')
  )
);
```

### Generate TypeScript Types

```bash
# Generate updated Supabase types
pnpm supabase gen types typescript --local > src/types/supabase/database.types.ts

# Or if using remote Supabase
supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/supabase/database.types.ts
```

---

## Phase 4: Frontend Composables & Components

### Composable: useStatus.ts

**File:** `src/composables/useStatus.ts`

```typescript
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase/database.types'

type UserStatus = Database['public']['Tables']['profile']['Row']['status']
type CommunityStatus = Database['public']['Tables']['community']['Row']['status']
type PropertyStatus = Database['public']['Tables']['property']['Row']['status']

export const useStatus = () => {
  /**
   * Change user status
   */
  const changeUserStatus = async (
    userId: string,
    newStatus: UserStatus,
    reason?: string
  ) => {
    const { data: userData } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc('change_user_status', {
      p_user_id: userId,
      p_new_status: newStatus,
      p_changed_by: userData.user?.id,
      p_reason: reason || null,
    })

    if (error) throw error
    return data
  }

  /**
   * Change community status
   */
  const changeCommunityStatus = async (
    communityId: string,
    newStatus: CommunityStatus,
    options?: {
      reason?: string
      reopeningDate?: string
      completionDate?: string
    }
  ) => {
    const { data: userData } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc('change_community_status', {
      p_community_id: communityId,
      p_new_status: newStatus,
      p_changed_by: userData.user?.id,
      p_reason: options?.reason || null,
      p_reopening_date: options?.reopeningDate || null,
      p_completion_date: options?.completionDate || null,
    })

    if (error) throw error
    return data
  }

  /**
   * Change property status
   */
  const changePropertyStatus = async (
    propertyId: string,
    newStatus: PropertyStatus,
    reason?: string
  ) => {
    const { data: userData } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc('change_property_status', {
      p_property_id: propertyId,
      p_new_status: newStatus,
      p_changed_by: userData.user?.id,
      p_reason: reason || null,
    })

    if (error) throw error
    return data
  }

  /**
   * Get status color for Vuetify
   */
  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      // Success - Green
      'active': 'success',

      // Warning - Yellow
      'pending': 'warning',
      'pre-launch': 'warning',
      'guest-mode': 'warning',
      'access-restricted': 'warning',

      // Error - Red
      'suspended': 'error',
      'emergency-lockdown': 'error',
      'full-capacity': 'error',

      // Info - Blue
      'under-construction': 'info',

      // Grey - Neutral
      'inactive': 'grey',
      'archived': 'grey',
      'vacant': 'grey',
      'deactivated': 'grey',
      'out-of-service': 'grey',

      // Orange - Alert
      'maintenance': 'orange',

      // Purple - Special
      'seasonal-closure': 'purple',
    }

    return colorMap[status] || 'grey'
  }

  /**
   * Get status icon
   */
  const getStatusIcon = (status: string): string => {
    const iconMap: Record<string, string> = {
      'active': 'tabler-check',
      'pending': 'tabler-clock',
      'suspended': 'tabler-ban',
      'inactive': 'tabler-moon',
      'archived': 'tabler-archive',
      'vacant': 'tabler-door',
      'under-construction': 'tabler-building',
      'pre-launch': 'tabler-rocket',
      'full-capacity': 'tabler-building-warehouse',
      'maintenance': 'tabler-tool',
      'seasonal-closure': 'tabler-snowflake',
      'emergency-lockdown': 'tabler-alert-triangle',
      'access-restricted': 'tabler-lock',
      'guest-mode': 'tabler-users',
      'out-of-service': 'tabler-x',
      'deactivated': 'tabler-circle-off',
    }

    return iconMap[status] || 'tabler-circle'
  }

  /**
   * Format status for display with i18n translation
   * NOTE: For multilingual apps, use i18n instead of this function
   * See STATUS_I18N_GUIDE.md for translation implementation
   */
  const formatStatus = (
    status: string,
    entityType: 'user' | 'community' | 'property' = 'user'
  ): string => {
    // For multilingual support, use:
    // const { t } = useI18n()
    // return t(`status.${entityType}.${status}`)

    // Fallback: Simple English formatting
    return status
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Get status statistics
   */
  const getStatusStatistics = async (entityType: 'user' | 'community' | 'property') => {
    const { data, error } = await supabase.rpc('get_status_statistics', {
      p_entity_type: entityType,
    })

    if (error) throw error
    return data
  }

  /**
   * Get status history for an entity
   */
  const getStatusHistory = async (entityType: string, entityId: string) => {
    const { data, error } = await supabase
      .from('status_history')
      .select(`
        *,
        changed_by_profile:profile!status_history_changed_by_fkey(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('changed_at', { ascending: false })

    if (error) throw error
    return data
  }

  return {
    changeUserStatus,
    changeCommunityStatus,
    changePropertyStatus,
    getStatusColor,
    getStatusIcon,
    formatStatus,
    getStatusStatistics,
    getStatusHistory,
  }
}
```

### Component: StatusBadge.vue

**File:** `src/components/StatusBadge.vue`

**Note:** For multilingual apps, see the i18n version in [STATUS_I18N_GUIDE.md](./STATUS_I18N_GUIDE.md)

```vue
<script setup lang="ts">
// For multilingual support, add:
// import { useI18n } from 'vue-i18n'
// const { t } = useI18n()

interface Props {
  status: string
  entityType?: 'user' | 'community' | 'property'
  size?: 'x-small' | 'small' | 'default' | 'large' | 'x-large'
  showIcon?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  entityType: 'user',
  size: 'small',
  showIcon: true,
})

const { getStatusColor, getStatusIcon, formatStatus } = useStatus()

// For i18n, use instead:
// const translatedStatus = computed(() => t(`status.${props.entityType}.${props.status}`))
</script>

<template>
  <VChip
    :color="getStatusColor(status)"
    :prepend-icon="showIcon ? getStatusIcon(status) : undefined"
    :size="size"
    variant="tonal"
  >
    {{ formatStatus(status, entityType) }}
    <!-- For i18n, use: {{ $t(`status.${entityType}.${status}`) }} -->
  </VChip>
</template>
```

### Component: StatusChangeDialog.vue

**File:** `src/components/StatusChangeDialog.vue`

**Note:** For multilingual apps with i18n, see the complete example in [STATUS_I18N_GUIDE.md](./STATUS_I18N_GUIDE.md)

```vue
<script setup lang="ts">
// For multilingual support, add:
// import { useI18n } from 'vue-i18n'
// const { t } = useI18n()

interface Props {
  isOpen: boolean
  entityType: 'user' | 'community' | 'property'
  entityId: string
  currentStatus: string
  entityName?: string
}

interface Emits {
  (e: 'update:isOpen', value: boolean): void
  (e: 'statusChanged'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { changeUserStatus, changeCommunityStatus, changePropertyStatus } = useStatus()

const newStatus = ref('')
const reason = ref('')
const reopeningDate = ref('')
const completionDate = ref('')
const isLoading = ref(false)

// Status options based on entity type
// NOTE: For i18n, map titles to translation keys like:
// { value: 'active', title: t('status.user.active') }
const statusOptions = computed(() => {
  if (props.entityType === 'user') {
    return [
      { value: 'active', title: 'Active' },
      { value: 'pending', title: 'Pending' },
      { value: 'suspended', title: 'Suspended' },
      { value: 'inactive', title: 'Inactive' },
      { value: 'archived', title: 'Archived' },
    ]
  } else if (props.entityType === 'community') {
    return [
      { value: 'active', title: 'Active' },
      { value: 'under-construction', title: 'Under Construction' },
      { value: 'pre-launch', title: 'Pre-Launch' },
      { value: 'full-capacity', title: 'Full Capacity' },
      { value: 'maintenance', title: 'Maintenance' },
      { value: 'seasonal-closure', title: 'Seasonal Closure' },
      { value: 'inactive', title: 'Inactive' },
      { value: 'archived', title: 'Archived' },
    ]
  } else {
    return [
      { value: 'active', title: 'Active' },
      { value: 'vacant', title: 'Vacant' },
      { value: 'access-restricted', title: 'Access Restricted' },
      { value: 'maintenance', title: 'Maintenance' },
      { value: 'emergency-lockdown', title: 'Emergency Lockdown' },
      { value: 'guest-mode', title: 'Guest Mode' },
      { value: 'out-of-service', title: 'Out of Service' },
      { value: 'deactivated', title: 'Deactivated' },
      { value: 'archived', title: 'Archived' },
    ]
  }
})

const handleSubmit = async () => {
  if (!newStatus.value) return

  isLoading.value = true

  try {
    if (props.entityType === 'user') {
      await changeUserStatus(props.entityId, newStatus.value as any, reason.value)
    } else if (props.entityType === 'community') {
      await changeCommunityStatus(props.entityId, newStatus.value as any, {
        reason: reason.value,
        reopeningDate: reopeningDate.value,
        completionDate: completionDate.value,
      })
    } else {
      await changePropertyStatus(props.entityId, newStatus.value as any, reason.value)
    }

    emit('statusChanged')
    emit('update:isOpen', false)

    // Reset form
    newStatus.value = ''
    reason.value = ''
    reopeningDate.value = ''
    completionDate.value = ''
  } catch (error: any) {
    console.error('Error changing status:', error)
    alert(error.message || 'Failed to change status')
  } finally {
    isLoading.value = false
  }
}

const requiresReason = computed(() => {
  return newStatus.value === 'suspended' || newStatus.value === 'archived'
})

const showSeasonalFields = computed(() => {
  return props.entityType === 'community' && newStatus.value === 'seasonal-closure'
})

const showMaintenanceFields = computed(() => {
  return props.entityType === 'community' && newStatus.value === 'maintenance'
})
</script>

<template>
  <VDialog
    :model-value="isOpen"
    max-width="600"
    @update:model-value="emit('update:isOpen', $event)"
  >
    <VCard>
      <VCardTitle>
        Change {{ entityType === 'user' ? 'User' : entityType === 'community' ? 'Community' : 'Property' }} Status
      </VCardTitle>

      <VCardText>
        <VRow>
          <VCol cols="12">
            <div class="text-body-1 mb-2">
              <strong>{{ entityType === 'user' ? 'User' : entityType === 'community' ? 'Community' : 'Property' }}:</strong>
              {{ entityName || entityId }}
            </div>
            <div class="text-body-2 mb-4">
              <strong>Current Status:</strong>
              <StatusBadge :status="currentStatus" />
            </div>
          </VCol>

          <VCol cols="12">
            <VSelect
              v-model="newStatus"
              label="New Status"
              :items="statusOptions"
              :rules="[v => !!v || 'Status is required']"
            />
          </VCol>

          <VCol
            v-if="requiresReason || newStatus"
            cols="12"
          >
            <VTextarea
              v-model="reason"
              label="Reason"
              :rules="requiresReason ? [v => !!v || 'Reason is required'] : []"
              rows="3"
              :hint="requiresReason ? 'Reason is required for this status' : 'Optional: Explain why this status is being changed'"
            />
          </VCol>

          <VCol
            v-if="showSeasonalFields"
            cols="12"
          >
            <VTextField
              v-model="reopeningDate"
              label="Reopening Date"
              type="date"
              :rules="[v => !!v || 'Reopening date is required for seasonal closure']"
            />
          </VCol>

          <VCol
            v-if="showMaintenanceFields"
            cols="12"
          >
            <VTextField
              v-model="completionDate"
              label="Expected Completion Date"
              type="date"
              hint="Optional: When is maintenance expected to complete?"
            />
          </VCol>
        </VRow>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn
          variant="text"
          @click="emit('update:isOpen', false)"
        >
          Cancel
        </VBtn>
        <VBtn
          color="primary"
          :loading="isLoading"
          :disabled="!newStatus"
          @click="handleSubmit"
        >
          Change Status
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
```

---

## Phase 5: UI Integration

### Update User List Page

**File:** `src/pages/apps/user/list/index.vue`

Add status filter and badge display:

```typescript
// Add to script section
const statusFilter = ref<string[]>([])

const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Pending', value: 'pending' },
  { title: 'Suspended', value: 'suspended' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Archived', value: 'archived' },
]

// Update fetchUsers query
const { data: users } = await supabase
  .from('profile')
  .select('*')
  .in('status', statusFilter.value.length ? statusFilter.value : ['active', 'pending', 'suspended', 'inactive'])
  .order('created_at', { ascending: false })
```

```vue
<!-- Add to template -->
<VSelect
  v-model="statusFilter"
  label="Filter by Status"
  :items="statusOptions"
  multiple
  clearable
  chips
  class="mb-4"
/>

<!-- In table columns, add StatusBadge -->
<template #item.status="{ item }">
  <StatusBadge :status="item.status" />
</template>
```

### Update Dashboard Cards

Add status counts to the dashboard cards:

```typescript
// In PortunCmdUsersCard.vue
const activeUsers = ref(0)
const pendingUsers = ref(0)

const fetchUsersData = async () => {
  // ... existing code ...

  // Get status breakdown
  const { data: stats } = await supabase.rpc('get_status_statistics', {
    p_entity_type: 'user'
  })

  if (stats) {
    const activeCount = stats.find(s => s.status === 'active')?.count || 0
    const pendingCount = stats.find(s => s.status === 'pending')?.count || 0
    activeUsers.value = activeCount
    pendingUsers.value = pendingCount
  }
}
```

---

## Phase 6: Testing & Validation

### Test Checklist

- [ ] **Database Schema**
  - [ ] All status columns added successfully
  - [ ] CHECK constraints working
  - [ ] Indexes created
  - [ ] Existing data migrated correctly

- [ ] **Database Functions**
  - [ ] `change_user_status()` works with all transitions
  - [ ] `change_community_status()` validates correctly
  - [ ] `change_property_status()` handles visitor passes
  - [ ] `auto_inactive_users()` identifies correct users
  - [ ] Audit trail (`status_history`) records all changes

- [ ] **Frontend**
  - [ ] StatusBadge displays correct colors and icons
  - [ ] Status filters work on all list pages
  - [ ] Status change dialog validates inputs
  - [ ] Status changes reflect immediately in UI
  - [ ] Error messages display properly

### SQL Test Queries

```sql
-- Test user status change
SELECT change_user_status(
  'USER_ID_HERE'::uuid,
  'suspended',
  'ADMIN_ID_HERE'::uuid,
  'Test suspension'
);

-- Verify audit trail
SELECT * FROM status_history
WHERE entity_type = 'user'
ORDER BY changed_at DESC
LIMIT 10;

-- Test status statistics
SELECT get_status_statistics('user');
SELECT get_status_statistics('community');
SELECT get_status_statistics('property');

-- Test auto-inactive (dry run)
SELECT id, email, last_login_at,
       NOW() - last_login_at as days_since_login
FROM profile
WHERE status = 'active'
  AND last_login_at < NOW() - INTERVAL '180 days'
ORDER BY last_login_at;
```

---

## Migration Strategy

### For Development Environment

1. Run migrations sequentially
2. Test each function individually
3. Verify with sample data

### For Production Environment

**CRITICAL STEPS:**

1. **Schedule Maintenance Window** (1-2 hours recommended)
2. **Create Backup** (MANDATORY)
   ```bash
   ./scripts/backup-database.sh before_status_production_deployment
   ```
3. **Notify Users** of downtime
4. **Apply Migrations**
   ```bash
   supabase db push
   ```
5. **Run Validation Queries**
6. **Monitor Error Logs**
7. **Deploy Frontend Updates**
8. **Verify All Features Working**

---

## Rollback Plan

### If Issues Occur

1. **Stop Immediately**
2. **Assess Damage**
3. **Restore from Backup**
   ```bash
   # See docs/DATABASE_BACKUP.md for full instructions
   psql -h db.PROJECT_ID.supabase.co \
        -U postgres \
        -d postgres \
        -f backups/BACKUP_FILE.sql
   ```

### Specific Rollback Scripts

```sql
-- Drop status columns (DESTRUCTIVE - loses data!)
ALTER TABLE profile DROP COLUMN IF EXISTS status;
ALTER TABLE profile DROP COLUMN IF EXISTS status_changed_at;
ALTER TABLE profile DROP COLUMN IF EXISTS status_changed_by;
ALTER TABLE profile DROP COLUMN IF EXISTS status_reason;

ALTER TABLE community DROP COLUMN IF EXISTS status;
-- ... repeat for all columns ...

-- Drop functions
DROP FUNCTION IF EXISTS change_user_status;
DROP FUNCTION IF EXISTS change_community_status;
DROP FUNCTION IF EXISTS change_property_status;
DROP FUNCTION IF EXISTS auto_inactive_users;
DROP FUNCTION IF EXISTS get_status_statistics;

-- Drop status_history table
DROP TABLE IF EXISTS status_history CASCADE;
```

---

## Next Steps After Implementation

1. **Set up automated jobs** for `auto_inactive_users()`
2. **Create notification templates** for status changes
3. **Add status-based filtering** to reports
4. **Implement status-based permissions** in RLS policies
5. **Add status dashboard widgets**
6. **Create admin tools** for bulk status operations
7. **Implement multilingual support** - See [STATUS_I18N_GUIDE.md](./STATUS_I18N_GUIDE.md)

---

## Multilingual Support

This implementation includes **English-only** status values in the database. For multilingual applications:

### Translation Files Available

Complete translations are available in:
- 🇺🇸 English (en)
- 🇪🇸 Spanish (es)
- 🇧🇷 Portuguese (pt)

All translation files are located in `src/plugins/i18n/locales/` and include:
- User statuses (5)
- Community statuses (8)
- Property statuses (9)
- Status descriptions for tooltips
- Dialog labels and validation messages

### Implementation Guide

See [STATUS_I18N_GUIDE.md](./STATUS_I18N_GUIDE.md) for:
- Complete translation key reference
- Component examples with i18n
- Best practices for multilingual apps
- Database storage recommendations

**Key Principle:** Database stores English slugs (`'active'`, `'pending'`), UI displays translated labels via `$t('status.user.active')`.

---

## Support & Questions

- Review [STATUS_SYSTEM_DESIGN.md](./STATUS_SYSTEM_DESIGN.md) for business rules
- Review [STATUS_I18N_GUIDE.md](./STATUS_I18N_GUIDE.md) for multilingual support
- Check [DATABASE_BACKUP.md](./DATABASE_BACKUP.md) for backup procedures
- Review Supabase logs for error details
- Contact development team for assistance

---

**Document Version:** 1.1
**Last Updated:** 2025-11-21
**Ready for Implementation:** ✅
**Multilingual Support:** ✅ (EN/ES/PT)
