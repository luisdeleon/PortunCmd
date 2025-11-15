# Supabase Database Schema

This document describes the database schema for the PortunCmd project.

## Tables

### `profile`
User profiles linked to authentication users.

**Columns:**
- `id` (uuid, primary key) - Links to auth.users.id
- `email` (text) - User email
- `display_name` (text, nullable) - Display name
- `enabled` (boolean) - Account enabled status
- `language` (text, nullable) - User preferred language (default: 'es')
- `def_community_id` (text, nullable) - Default community ID
- `def_property_id` (text, nullable) - Default property ID
- `created_at` (timestamptz) - Creation timestamp
- `updated_at` (timestamptz) - Last update timestamp

**Relationships:**
- Foreign key to `community.id` (def_community_id)
- Foreign key to `property.id` (def_property_id)
- Referenced by: `community_manager.profile_id`, `property_owner.profile_id`, `profile_role.profile_id`, `visitor_records_uid.host_uid`

### `community`
Community/condominium information.

**Columns:**
- `id` (text, primary key)
- `name` (text, nullable)
- `address` (text, nullable)
- `city` (text, nullable)
- `state` (text, nullable)
- `postal_code` (text, nullable)
- `country` (text, nullable)
- `geolocation` (text, nullable)
- `googlemaps` (text, nullable)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Relationships:**
- Referenced by: `property.community_id`, `community_manager.community_id`, `property_owner.community_id`, `profile.def_community_id`, `visitor_records_uid.community_id`, `automation_devices.community_id`

### `property`
Property/unit information within a community.

**Columns:**
- `id` (text, primary key)
- `name` (text)
- `address` (text)
- `community_id` (text) - Foreign key to community
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Relationships:**
- Foreign key to `community.id`
- Referenced by: `community_manager.property_id`, `property_owner.property_id`, `profile.def_property_id`, `visitor_records_uid.property_id`

### `role`
User roles in the system.

**Columns:**
- `id` (uuid, primary key)
- `role_name` (text)
- `enabled` (boolean)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Relationships:**
- Referenced by: `profile_role.role_id`

### `profile_role`
Junction table linking profiles to roles with scope-based access control.

**Columns:**
- `id` (uuid, primary key, unique)
- `profile_id` (uuid) - Foreign key to profile
- `role_id` (uuid) - Foreign key to role
- `scope_type` (varchar(50), nullable) - Scope level: global, dealer, community, or property (default: 'global')
- `scope_dealer_id` (uuid, nullable) - Dealer ID for dealer-scoped roles (self-referencing)
- `scope_community_ids` (text[], nullable) - Array of community IDs for community-scoped roles
- `scope_property_ids` (text[], nullable) - Array of property IDs for property-scoped roles
- `granted_by` (uuid, nullable) - Profile ID of user who granted this role
- `granted_at` (timestamptz, nullable) - Timestamp when role was granted
- `expires_at` (timestamptz, nullable) - Optional expiration timestamp for temporary role assignments
- `notes` (text, nullable) - Additional notes about the role assignment
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Relationships:**
- Foreign keys to `profile.id` (profile_id, granted_by, scope_dealer_id) and `role.id`

**Scope Types:**
- `global` - Unrestricted access (Super Admin only)
- `dealer` - Scoped to dealer's communities
- `community` - Scoped to specific communities
- `property` - Scoped to specific properties

### `community_manager`
Community managers assignment.

**Columns:**
- `id` (uuid, primary key)
- `profile_id` (uuid, nullable) - Foreign key to profile
- `property_id` (text) - Foreign key to property
- `community_id` (text) - Foreign key to community
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Relationships:**
- Foreign keys to `profile.id`, `property.id`, and `community.id`

### `property_owner`
Property owners assignment.

**Columns:**
- `id` (uuid, primary key)
- `profile_id` (uuid) - Foreign key to profile
- `property_id` (text, nullable) - Foreign key to property
- `community_id` (text, nullable) - Foreign key to community
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Relationships:**
- Foreign keys to `profile.id`, `property.id`, and `community.id`

### `visitor_records_uid`
Visitor access records and QR codes.

**Columns:**
- `id` (uuid, primary key)
- `record_uid` (text, nullable) - Record unique identifier
- `rand_record_uid` (text, nullable) - Random record UID
- `record_url` (text, nullable) - Record URL
- `qrcode_image_url` (text, nullable) - QR code image URL
- `host_uid` (uuid, nullable) - Foreign key to profile (host)
- `visitor_name` (text, nullable) - Visitor name
- `visitor_type` (text, nullable) - Visitor type
- `validity_start` (timestamptz, nullable) - Access validity start
- `validity_end` (timestamptz, nullable) - Access validity end
- `property_id` (text, nullable) - Foreign key to property
- `community_id` (text, nullable) - Foreign key to community
- `document_num` (text, nullable) - Document number
- `doc1_upload_url` (text, nullable) - Document 1 URL
- `doc2_upload_url` (text, nullable) - Document 2 URL
- `doc3_upload_url` (text, nullable) - Document 3 URL
- `doc4_upload_url` (text, nullable) - Document 4 URL
- `doc1_hash` (text, nullable) - Document 1 hash
- `doc2_hash` (text, nullable) - Document 2 hash
- `doc3_hash` (text, nullable) - Document 3 hash
- `doc4_hash` (text, nullable) - Document 4 hash
- `entries_used` (integer, nullable) - Number of entries used (default: 0)
- `entries_allowed` (integer, nullable) - Number of entries allowed (default: 1)
- `notes` (text, nullable) - Additional notes
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Relationships:**
- Foreign keys to `profile.id` (host_uid), `property.id`, and `community.id`

### `visitor_record_logs`
Visitor entry/exit logs.

**Columns:**
- `id` (uuid, primary key)
- `record_uid` (text) - Related record UID
- `host_uid` (uuid) - Foreign key to profile (host)
- `visitor_name` (text) - Visitor name
- `in_time` (timestamptz, nullable) - Entry time
- `out_time` (timestamptz, nullable) - Exit time
- `doc1_upload_url` (text, nullable) - Document 1 URL
- `doc2_upload_url` (text, nullable) - Document 2 URL
- `doc3_upload_url` (text, nullable) - Document 3 URL
- `doc4_upload_url` (text, nullable) - Document 4 URL
- `doc1_hash` (text, nullable) - Document 1 hash
- `doc2_hash` (text, nullable) - Document 2 hash
- `doc3_hash` (text, nullable) - Document 3 hash
- `doc4_hash` (text, nullable) - Document 4 hash
- `notes` (text, nullable) - Additional notes
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `automation_devices`
Automation devices (e.g., Shelly devices) for access control.

**Columns:**
- `id` (uuid, primary key)
- `device_name` (text, nullable)
- `device_brand` (text, nullable)
- `device_model` (text, nullable)
- `device_id_in` (text, nullable) - Input device ID
- `device_id_out` (text, nullable) - Output device ID
- `device_channel_in` (smallint, nullable) - Input channel
- `device_channel_out` (smallint, nullable) - Output channel
- `api_url` (text, nullable) - API URL (default: 'https://shelly-144-eu.shelly.cloud')
- `api_endpoint` (text, nullable) - API endpoint (default: 'device/relay/control')
- `auth_key` (text, nullable) - Authentication key
- `direction_type` (text, nullable) - Direction type
- `divice_turn` (text, nullable) - Device turn configuration
- `community_id` (text, nullable) - Foreign key to community
- `geolocation` (text, nullable) - Device geolocation
- `enabled` (boolean, nullable) - Device enabled status (default: false)
- `guest_access` (boolean, nullable) - Guest access enabled (default: false)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Relationships:**
- Foreign key to `community.id`

### `permissions`
Granular permissions for role-based access control.

**Columns:**
- `id` (uuid, primary key)
- `name` (varchar(100), unique) - Unique permission identifier (e.g., 'communities:manage')
- `description` (text, nullable) - Human-readable description of the permission
- `resource` (varchar(50)) - Resource type (e.g., 'community', 'resident', 'property')
- `action` (varchar(50)) - Action type (e.g., 'create', 'read', 'update', 'delete', 'manage')
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Relationships:**
- Referenced by: `role_permissions.permission_id`

**Permission Categories:**
- System-level: `system:manage`, `system:config`
- Dealer: `dealers:manage`, `dealers:view`
- Administrator: `administrators:manage`, `administrators:view`
- Community: `communities:view_all`, `communities:view_own`, `communities:create`, `communities:update`, `communities:delete`, `communities:manage`
- Property: `properties:view`, `properties:create`, `properties:update`, `properties:delete`, `properties:manage`
- Resident: `residents:view`, `residents:create`, `residents:update`, `residents:delete`, `residents:manage`
- Visitor: `visitors:create`, `visitors:view`, `visitors:update`, `visitors:delete`, `visitors:logs_view`
- Automation: `automation:view`, `automation:control`, `automation:manage`
- Report: `reports:view`, `reports:export`
- Notification: `notifications:send`, `notifications:view`

**Total Permissions:** 34

### `role_permissions`
Maps permissions to roles for flexible RBAC system.

**Columns:**
- `id` (uuid, primary key)
- `role_id` (uuid) - Foreign key to role
- `permission_id` (uuid) - Foreign key to permissions
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Relationships:**
- Foreign keys to `role.id` and `permissions.id`
- Unique constraint on (role_id, permission_id)

**Permission Assignments by Role:**
- **Super Admin**: All 34 permissions
- **Dealer**: 10 permissions (manage admins, view communities/reports)
- **Administrator**: 15 permissions (manage residents/properties, control automation)
- **Guard**: 6 permissions (view visitors/residents, control gates)
- **Resident**: 4 permissions (create visitors, view own property)

### `dealer_administrators`
Tracks which administrators work under which dealers.

**Columns:**
- `id` (uuid, primary key)
- `dealer_id` (uuid) - Foreign key to profile (dealer)
- `administrator_id` (uuid) - Foreign key to profile (administrator)
- `assigned_community_ids` (text[]) - Array of community IDs the admin can manage (default: [])
- `assigned_at` (timestamptz, nullable) - Timestamp when administrator was assigned (default: NOW())
- `assigned_by` (uuid, nullable) - Profile ID of user who assigned this administrator
- `is_active` (boolean, nullable) - Whether this assignment is currently active (default: true)
- `notes` (text, nullable) - Additional notes about the assignment
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Relationships:**
- Foreign keys to `profile.id` (dealer_id, administrator_id, assigned_by)
- Unique constraint on (dealer_id, administrator_id)

**Constraints:**
- `different_users` - Ensures dealer and administrator are different people
- Trigger validates that dealer has Dealer role and administrator has Administrator role

**Triggers:**
- `trigger_sync_admin_scope` - Auto-syncs administrator's scope in profile_role when assigned
- `trigger_validate_dealer_admin_roles` - Validates roles before insert/update

### `notifications`
System notifications.

**Columns:**
- `id` (uuid, primary key)
- `title` (text, nullable) - Notification title
- `message` (text, nullable) - Notification message
- `image` (text, nullable) - Notification image URL
- `type` (text, nullable) - Notification type
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `notification_users`
User notification preferences and tokens.

**Columns:**
- `id` (uuid, primary key)
- `external_user_id` (text) - External user identifier
- `onesignal_token` (text, nullable) - OneSignal token
- `fcm_token` (text, nullable) - Firebase Cloud Messaging token
- `property_id` (text, nullable) - Foreign key to property
- `community_id` (text, nullable) - Foreign key to community
- `notifications_enabled` (boolean) - Notifications enabled (default: false)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `translations`
Multi-language translations.

**Columns:**
- `id` (uuid, primary key)
- `key` (text) - Translation key
- `language` (text) - Language code
- `text` (jsonb) - Translation text (JSON)

## Database Functions

### `func_count_table_rows`
Count rows in a table with optional filtering.

**Parameters:**
- `p_table_name` (string) - Table name
- `p_host_uid` (string) - Host user ID
- `p_column_name` (string, optional) - Column name for filtering
- `p_compare_date` (string, optional) - Date to compare
- `p_compare_operator` (string, optional) - Comparison operator

**Returns:** `number`

### `func_create_user_onesignal`
Create OneSignal user subscription.

**Parameters:**
- `user_id` (string) - User ID
- `fcmtoken` (string) - FCM token
- `status` (boolean) - Subscription status

**Returns:** `Json`

### `func_get_subscription_id`
Get OneSignal subscription ID for a user.

**Parameters:**
- `user_id` (string) - User ID

**Returns:** `string`

### `func_get_weekly_averages`
Get weekly averages for a table.

**Parameters:**
- `p_table_name` (string) - Table name
- `p_host_uid` (string) - Host user ID

**Returns:** Array of `{ day_name: string, average: number }`

### `func_get_weekly_counts`
Get weekly counts for a table.

**Parameters:**
- `p_table_name` (string) - Table name
- `p_host_uid` (string) - Host user ID

**Returns:** Array of `{ day_name: string, count: number }`

### `func_update_onesignal_external_id`
Update OneSignal external user ID.

**Parameters:** None

**Returns:** `undefined`

## Row Level Security (RLS)

**Status:** Enabled on 5 core tables (as of 2025-11-14)

### Protected Tables:

#### `profile` (9 policies)
- Users can view/update their own profile
- Super Admins can view/manage all profiles
- Dealers can view their administrators and residents in their communities
- Administrators can view residents in assigned communities

#### `community` (8 policies)
- Super Admins can view all communities
- Dealers can view their communities
- Administrators can view/update assigned communities
- Guards can view assigned communities
- Residents can view their communities
- Super Admins can create/delete communities

#### `property` (8 policies)
- Super Admins can view all properties
- Dealers can view properties in their communities
- Administrators can view/manage properties in assigned communities
- Guards can view properties in their communities
- Residents can view their own properties

#### `visitor_records_uid` (10 policies)
- Super Admins can view all visitor records
- Hosts can view/manage their own visitor records
- Administrators can view/update records in their communities
- Guards can view/update records in their communities
- Dealers can view records in their communities
- Residents can create visitor records

#### `automation_devices` (5 policies)
- Super Admins can manage all devices
- Administrators can view/update devices in their communities
- Guards can view devices in their communities

**Total RLS Policies:** 40

### Unprotected Tables:
- `property_owner`, `community_manager` - No RLS policies yet
- `role`, `permissions`, `role_permissions`, `dealer_administrators` - Admin-only tables
- `notifications`, `notification_users`, `translations` - Support tables

## Schema Statistics

- **Total Tables:** 16 (13 original + 3 new RBAC tables)
- **Total Rows:** ~500+ (across all tables)
- **New Tables Added (2025-11-14):**
  - `permissions` - 34 rows
  - `role_permissions` - ~90 rows
  - `dealer_administrators` - 0 rows (ready for use)
- **Modified Tables:**
  - `profile_role` - Added 8 scope and audit columns

## Notes

- All tables use UUID primary keys except `community`, `property` which use text IDs
- Timestamps use `timestamptz` (timestamp with time zone)
- Most nullable fields allow for flexible data entry
- Foreign key relationships enforce referential integrity
- The schema supports a multi-tenant architecture with communities and properties
- **RBAC System:** Fully implemented with granular permissions, scope-based access control, and Row Level Security
- **Scope Types:** global (Super Admin), dealer (Dealer), community (Administrator/Guard), property (Resident)
- **Permission System:** 34 granular permissions mapped to 5 roles via database

