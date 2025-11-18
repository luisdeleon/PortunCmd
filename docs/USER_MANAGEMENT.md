# User Management Guide

This guide covers user CRUD operations, bulk operations, and user data management in PortunCmd.

## Table of Contents

1. [Overview](#overview)
2. [User View Page](#user-view-page)
3. [User List Operations](#user-list-operations)
4. [Bulk Import](#bulk-import)
5. [Bulk Delete](#bulk-delete)
6. [Deleting Users](#deleting-users)
7. [Enable/Disable Users](#enabledisable-users)
8. [Database Function Reference](#database-function-reference)

---

## Overview

The PortunCmd user management system provides comprehensive CRUD operations for managing user profiles, including:

- View detailed user information with related data counts
- Edit user profiles
- Delete users (with cascade cleanup)
- Enable/disable user accounts
- Bulk import users from CSV
- Bulk delete multiple users
- Assign roles and manage permissions

---

## User View Page

**Location**: `/apps/user/view/[id]`
**Component**: `src/pages/apps/user/view/[id].vue`
**Panel Component**: `src/views/apps/user/view/UserBioPanel.vue`

### Features

The user view page displays:

#### 1. User Profile Header
- Avatar (with fallback to initials)
- Full name
- Role badge (color-coded)

#### 2. Statistics Cards
- **Communities Count**: Number of communities the user manages
  - Fetched from `community_manager` table
  - Icon: `tabler-building-community`
- **Properties Count**: Number of properties the user owns
  - Fetched from `property_owner` table
  - Icon: `tabler-home`

#### 3. User Details Section

All detail fields include icons for better visual hierarchy:

| Field | Icon | Data Source |
|-------|------|-------------|
| Username | `tabler-user` | `display_name` |
| UUID | `tabler-key` | `id` (profile primary key) |
| Email | `tabler-mail` | `email` |
| Status | `tabler-circle-check` | `enabled` (as colored chip) |
| Role | `tabler-shield` | `profile_role.role.role_name` |
| Tax ID | `tabler-id` | `taxId` |
| Contact | `tabler-phone` | `contact` |
| Language | `tabler-language` | `language` |
| Country | `tabler-map-pin` | `country` |

#### 4. Status Display

The status is shown as a colored chip:
- **Active** (Green): `enabled: true`
- **Inactive** (Red): `enabled: false`

```vue
<VChip
  :color="props.userData.enabled ? 'success' : 'error'"
  size="small"
  class="ms-2 text-capitalize"
>
  {{ props.userData.status }}
</VChip>
```

#### 5. Action Buttons

**Edit Button**
- Opens user info edit dialog
- Updates profile information

**Delete Button** (Red/Error color)
- Opens confirmation dialog
- Calls `delete_user_completely()` database function
- Deletes user from both `auth.users` and `profile` tables
- Removes all related records (see [Deleting Users](#deleting-users))
- Navigates back to user list on success

**Enable/Disable Button** (Warning/Success color)
- Dynamic button text based on current status
- Opens confirmation dialog
- Toggles `enabled` field in `profile` table
- Reloads page to reflect changes

### Data Fetching

```typescript
const fetchUserData = async () => {
  // Fetch profile with role
  const { data, error } = await supabase
    .from('profile')
    .select(`
      id,
      display_name,
      email,
      enabled,
      def_community_id,
      def_property_id,
      profile_role!profile_role_profile_id_fkey(
        role_id,
        role!profile_role_role_id_fkey(role_name)
      )
    `)
    .eq('id', route.params.id)
    .single()

  // Fetch community count
  const { count: communityCount } = await supabase
    .from('community_manager')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', route.params.id)

  // Fetch property count
  const { count: propertyCount } = await supabase
    .from('property_owner')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', route.params.id)

  // Transform to UI format
  userData.value = {
    id: data.id,
    fullName: data.display_name || 'No Name',
    role: data.profile_role?.[0]?.role?.role_name || 'No Role',
    enabled: data.enabled || false,
    communitiesCount: communityCount || 0,
    propertiesCount: propertyCount || 0,
    // ... other fields
  }
}
```

---

## User List Operations

**Location**: `/apps/user/list`
**Component**: `src/pages/apps/user/list/index.vue`

### Features

1. **User Table** with columns:
   - User (avatar + name + email)
   - Role
   - Community
   - Property
   - Enabled status
   - Actions (edit, delete, assign role)

2. **Filters**:
   - Search by name/email
   - Filter by role
   - Filter by community
   - Filter by enabled status

3. **Sorting**: All columns sortable

4. **Selection**: Multi-select with checkboxes

5. **Actions**:
   - Add new user
   - Edit user
   - Delete user (single)
   - Bulk delete users
   - Assign roles

---

## Bulk Import

**Feature**: Import multiple users from CSV file
**Location**: User list page, Community list page, Property list page

### Property Bulk Import

**Component**: `src/components/dialogs/ImportPropertyDialog.vue`
**Composable**: `src/composables/usePropertyImport.ts`
**Template**: `/public/templates/property-import-template.csv`

#### CSV Template Format

```csv
id,name,address,community_id
PROP-001,Apartment 101,123 Main Street Unit 101,COMM-001
PROP-002,Apartment 102,123 Main Street Unit 102,COMM-001
PROP-003,House 5,456 Oak Avenue House 5,COMM-002
```

#### Import Flow

1. **Upload File**
   - Click "Import Properties" button
   - Drag & drop or browse for CSV file
   - File validation

2. **Preview Data**
   - Click "Preview Data" button
   - Shows parsed CSV in data table
   - Verify data is correct

3. **Confirm Import**
   - Click "Confirm Import" button
   - Shows progress indicator
   - Displays success/error counts

#### Implementation

```typescript
// src/composables/usePropertyImport.ts
export const usePropertyImport = () => {
  const isImporting = ref(false)

  // Parse CSV content
  const parseCSV = (content: string): PropertyImportRow[] => {
    const lines = content.split('\n').filter(line => line.trim())
    const headers = lines[0].split(',').map(h => h.trim())

    // Validate required columns
    const requiredColumns = ['id', 'name', 'address', 'community_id']
    const missingColumns = requiredColumns.filter(col => !headers.includes(col))

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
    }

    // Parse rows
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim())
      return {
        id: values[headers.indexOf('id')],
        name: values[headers.indexOf('name')],
        address: values[headers.indexOf('address')],
        community_id: values[headers.indexOf('community_id')],
      }
    })
  }

  // Import properties with upsert
  const importFromCSV = async (csvContent: string): Promise<ImportResult> => {
    const rows = parseCSV(csvContent)
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const row of rows) {
      const { error } = await supabase
        .from('property')
        .upsert({
          id: row.id,
          name: row.name,
          address: row.address,
          community_id: row.community_id,
        }, { onConflict: 'id' })

      if (error) {
        errorCount++
        errors.push(`Failed to import ${row.id}: ${error.message}`)
      } else {
        successCount++
      }
    }

    return { successCount, errorCount, errors }
  }

  return { isImporting, parseCSV, importFromCSV, downloadTemplate }
}
```

#### Download Template

```typescript
const downloadTemplate = () => {
  const link = document.createElement('a')
  link.href = '/templates/property-import-template.csv'
  link.download = 'property-import-template.csv'
  link.click()
}
```

---

## Bulk Delete

**Feature**: Delete multiple records at once
**Available for**: Users, Communities, Properties

### User Bulk Delete

**Location**: User list page (`src/pages/apps/user/list/index.vue`)

#### Features

1. **Smart Button**
   - Only shows when users are selected
   - Shows count: "Delete (3)"
   - Red/error color with trash icon

2. **Validation**
   - Checks if user is a community manager
   - Prevents deletion if user has critical relationships
   - Shows appropriate error messages

3. **Confirmation Dialog**
   - Shows count of users to delete
   - Warning message
   - Delete All / Cancel buttons

#### Implementation

```typescript
// Computed property for button visibility
const hasSelectedRows = computed(() => selectedRows.value.length > 0)

// Bulk delete handler
const bulkDeleteUsers = async () => {
  if (selectedRows.value.length === 0) return

  let successCount = 0
  let errorCount = 0
  const errors: string[] = []

  for (const userId of selectedRows.value) {
    try {
      // Check for community manager relationships
      const { data: communityManagers } = await supabase
        .from('community_manager')
        .select('id')
        .eq('profile_id', userId)
        .limit(1)

      if (communityManagers && communityManagers.length > 0) {
        errorCount++
        errors.push(`User ${userId} is a community manager`)
        continue
      }

      // Delete user using RPC function
      const { data, error } = await supabase
        .rpc('delete_user_completely', { user_id: userId })

      if (error || (data && !data.success)) {
        errorCount++
        errors.push(`Failed to delete user ${userId}`)
      } else {
        successCount++
      }
    } catch (err: any) {
      errorCount++
      errors.push(`Error: ${err.message}`)
    }
  }

  // Show result message
  if (errorCount === 0) {
    snackbar.value = {
      show: true,
      message: `Successfully deleted ${successCount} users`,
      color: 'success',
    }
  } else if (successCount === 0) {
    snackbar.value = {
      show: true,
      message: `Failed to delete ${errorCount} users`,
      color: 'error',
    }
  } else {
    snackbar.value = {
      show: true,
      message: `Deleted ${successCount} users, ${errorCount} failed`,
      color: 'warning',
    }
  }

  // Clear selection and refresh
  selectedRows.value = []
  fetchUsers()
  fetchUserGrowth()
  fetchResidentStats()
  fetchActiveInactiveStats()

  isBulkDeleteDialogVisible.value = false
}
```

### Community Bulk Delete

**Location**: Community list page (`src/pages/apps/community/list/index.vue`)

Similar implementation to user bulk delete, but simpler (no relationship checks).

### Property Bulk Delete

**Location**: Property list page (`src/pages/apps/property/list/index.vue`)

Similar implementation to community bulk delete.

---

## Deleting Users

### Overview

Deleting a user is a complex operation that requires removing records from multiple tables to maintain data integrity.

### The Problem

Users exist in two places:
1. **`auth.users`** table (Supabase Auth schema) - requires admin privileges
2. **`profile`** table (Public schema) - application data

Simply deleting from `profile` leaves orphaned authentication records.

### The Solution: Database Function

A PostgreSQL function with `SECURITY DEFINER` privilege that can access the `auth` schema.

**File**: `supabase/migrations/delete_user_function.sql`

#### Function Definition

```sql
CREATE OR REPLACE FUNCTION delete_user_completely(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  deleted_count INT := 0;
BEGIN
  -- Delete related records first (to avoid FK constraint issues)

  -- 1. Delete from visitor_record_logs (action/transaction logs)
  DELETE FROM visitor_record_logs WHERE host_uid = user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- 2. Delete from visitor_records_uid
  DELETE FROM visitor_records_uid WHERE host_uid = user_id;

  -- 3. Delete from notification_users
  DELETE FROM notification_users WHERE profile_id = user_id;

  -- 4. Delete from community_manager
  DELETE FROM community_manager WHERE profile_id = user_id;

  -- 5. Delete from property_owner
  DELETE FROM property_owner WHERE profile_id = user_id;

  -- 6. Delete from dealer_administrators
  DELETE FROM dealer_administrators WHERE profile_id = user_id;

  -- 7. Delete from profile_role
  DELETE FROM profile_role WHERE profile_id = user_id;

  -- 8. Delete from profile
  DELETE FROM profile WHERE id = user_id;

  -- 9. Finally, delete from auth.users (requires SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = user_id;

  -- Return success
  result := json_build_object(
    'success', true,
    'message', 'User and all related records deleted successfully'
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'message', SQLERRM
    );
    RETURN result;
END;
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated;
```

#### Tables Cleaned Up (in order)

1. **`visitor_record_logs`** - Action/transaction logs where user is host
2. **`visitor_records_uid`** - Visitor records where user is host
3. **`notification_users`** - User notification preferences
4. **`community_manager`** - Community management assignments
5. **`property_owner`** - Property ownership assignments
6. **`dealer_administrators`** - Dealer admin assignments
7. **`profile_role`** - Role assignments
8. **`profile`** - User profile data
9. **`auth.users`** - Authentication record

#### Installation

Run this SQL in your Supabase SQL Editor:

```sql
-- Copy the entire function from the file
-- supabase/migrations/delete_user_function.sql
```

### Usage in Code

#### Single User Delete

```typescript
// src/views/apps/user/view/UserBioPanel.vue
const deleteUser = async () => {
  try {
    // Call the database function
    const { data, error } = await supabase
      .rpc('delete_user_completely', { user_id: props.userData.id })

    if (error) {
      console.error('Error deleting user:', error)
      alert(`Failed to delete user: ${error.message}`)
      return
    }

    // Check function result
    if (data && !data.success) {
      console.error('Error deleting user:', data.message)
      alert(`Failed to delete user: ${data.message}`)
      return
    }

    // Navigate back to user list
    router.push({ name: 'apps-user-list' })
  } catch (err) {
    console.error('Error in deleteUser:', err)
    alert('Failed to delete user')
  }
}
```

#### Bulk User Delete

```typescript
// src/pages/apps/user/list/index.vue
for (const userId of selectedRows.value) {
  const { data, error } = await supabase
    .rpc('delete_user_completely', { user_id: userId })

  if (error || (data && !data.success)) {
    errorCount++
  } else {
    successCount++
  }
}
```

### Error Handling

The function returns a JSON object:

```json
// Success
{
  "success": true,
  "message": "User and all related records deleted successfully"
}

// Error
{
  "success": false,
  "message": "foreign key violation: ..."
}
```

Always check both the `error` from Supabase AND the `data.success` from the function:

```typescript
if (error) {
  // Supabase error (network, permissions, etc.)
  console.error('Supabase error:', error)
} else if (data && !data.success) {
  // Function error (database constraints, etc.)
  console.error('Function error:', data.message)
} else {
  // Success
  console.log('User deleted successfully')
}
```

---

## Enable/Disable Users

### Overview

Users can be enabled or disabled without deleting them. Disabled users cannot log in.

### Implementation

**Location**: User view page (`src/views/apps/user/view/UserBioPanel.vue`)

```typescript
const toggleUserStatus = async () => {
  try {
    const newStatus = !props.userData.enabled

    const { error } = await supabase
      .from('profile')
      .update({ enabled: newStatus })
      .eq('id', props.userData.id)

    if (error) {
      console.error('Error updating user status:', error)
      alert('Failed to update user status')
      return
    }

    // Refresh page to show updated status
    window.location.reload()
  } catch (err) {
    console.error('Error in toggleUserStatus:', err)
    alert('Failed to update user status')
  }
}
```

### UI Components

**Button** (dynamic color and text):
```vue
<VBtn
  variant="tonal"
  :color="props.userData.enabled ? 'warning' : 'success'"
  @click="isToggleStatusDialogVisible = true"
>
  {{ props.userData.enabled ? 'Disable' : 'Enable' }}
</VBtn>
```

**Confirmation Dialog**:
```vue
<VDialog v-model="isToggleStatusDialogVisible" max-width="500">
  <VCard>
    <VCardText class="text-center px-10 py-6">
      <VIcon
        :icon="props.userData.enabled ? 'tabler-user-off' : 'tabler-user-check'"
        :color="props.userData.enabled ? 'warning' : 'success'"
        size="56"
      />

      <h6 class="text-h6 mb-4">
        {{ props.userData.enabled ? 'Disable User' : 'Enable User' }}
      </h6>

      <p class="text-body-1 mb-6">
        Are you sure you want to {{ props.userData.enabled ? 'disable' : 'enable' }}
        <strong>{{ props.userData.fullName }}</strong>?
      </p>

      <VAlert :color="props.userData.enabled ? 'warning' : 'info'" variant="tonal">
        <template v-if="props.userData.enabled">
          <strong>Disabling this user</strong> will prevent them from logging in.
        </template>
        <template v-else>
          <strong>Enabling this user</strong> will allow them to log in again.
        </template>
      </VAlert>

      <div class="d-flex gap-4 justify-center">
        <VBtn
          :color="props.userData.enabled ? 'warning' : 'success'"
          @click="toggleUserStatus(); isToggleStatusDialogVisible = false"
        >
          {{ props.userData.enabled ? 'Disable' : 'Enable' }} User
        </VBtn>
        <VBtn variant="tonal" @click="isToggleStatusDialogVisible = false">
          Cancel
        </VBtn>
      </div>
    </VCardText>
  </VCard>
</VDialog>
```

### Authentication Guard

The login flow checks `profile.enabled`:

```typescript
// src/composables/useAuth.ts
const login = async (email: string, password: string) => {
  // ... authenticate with Supabase Auth

  // Fetch profile
  const { data: profileData, error: profileError } = await supabase
    .from('profile')
    .select('*')
    .eq('id', authData.user.id)
    .single()

  // Check if profile is enabled
  if (!profileData.enabled) {
    await supabase.auth.signOut()
    throw new Error('Account is disabled. Please contact support.')
  }

  // ... continue login
}
```

---

## Database Function Reference

### `delete_user_completely(user_id UUID)`

**Purpose**: Completely remove a user from the system, including all related records.

**Parameters**:
- `user_id` (UUID) - The user's profile ID (also their auth.users ID)

**Returns**: JSON
```typescript
{
  success: boolean
  message: string
}
```

**Usage**:
```typescript
const { data, error } = await supabase.rpc('delete_user_completely', {
  user_id: 'uuid-here'
})
```

**Permissions**: Granted to `authenticated` users

**Security**: `SECURITY DEFINER` - runs with elevated privileges to access `auth.users`

**Tables Modified**:
- `visitor_record_logs` (DELETE)
- `visitor_records_uid` (DELETE)
- `notification_users` (DELETE)
- `community_manager` (DELETE)
- `property_owner` (DELETE)
- `dealer_administrators` (DELETE)
- `profile_role` (DELETE)
- `profile` (DELETE)
- `auth.users` (DELETE)

**Error Handling**:
- Returns `{ success: false, message: "error details" }` on failure
- Catches all PostgreSQL errors

**Best Practices**:
1. Always check for community manager relationships before calling
2. Always check both Supabase `error` and function `data.success`
3. Show appropriate error messages to users
4. Refresh data after successful deletion

---

## File Reference

### Components

- `src/pages/apps/user/list/index.vue` - User list with CRUD operations
- `src/pages/apps/user/view/[id].vue` - User view page container
- `src/views/apps/user/view/UserBioPanel.vue` - User details panel with actions
- `src/components/dialogs/ImportPropertyDialog.vue` - Property import dialog
- `src/pages/apps/community/list/index.vue` - Community list with bulk delete
- `src/pages/apps/property/list/index.vue` - Property list with bulk import/delete

### Composables

- `src/composables/usePropertyImport.ts` - Property CSV import logic
- `src/composables/useAuth.ts` - Authentication with enabled check

### Database

- `supabase/migrations/delete_user_function.sql` - User deletion function

### Templates

- `public/templates/property-import-template.csv` - Property import CSV template

---

## Related Documentation

- [RBAC Guide](./RBAC_GUIDE.md) - Role-based access control
- [Supabase Schema](./SUPABASE_SCHEMA.md) - Database schema reference
- [Supabase Usage](./SUPABASE_USAGE.md) - General Supabase patterns
- [Authentication](./AUTHENTICATION.md) - Authentication setup
- [Community/User/Property Guide](./COMMUNITY_USER_PROPERTY_GUIDE.md) - Relationships
