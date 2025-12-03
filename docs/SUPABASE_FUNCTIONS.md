# Supabase Edge Functions

> Complete reference for all Supabase Edge Functions deployed in PortunCmd.

## Overview

PortunCmd uses **8 Supabase Edge Functions** to handle server-side operations that require elevated permissions or external API integrations.

| Function | Purpose | JWT Required |
|----------|---------|--------------|
| [onesignal-notification](#onesignal-notification) | Generic push notification sender | No |
| [onesignal-single-entry](#onesignal-single-entry) | Visitor arrival notification | No |
| [onesignal-single-exit](#onesignal-single-exit) | Visitor departure notification | No |
| [onesignal-updatesub](#onesignal-updatesub) | Update user subscription/tags | No |
| [create-user](#create-user) | Create new user with role assignment | Yes |
| [deleteUser](#deleteuser) | Delete user from auth.users | Yes |
| [shelly-control](#shelly-control) | IoT gate control via Shelly devices | Yes |
| [portun-web-send-contact-email](#portun-web-send-contact-email) | Contact form email via AWS SES | Yes |

---

## OneSignal Notification Functions

These functions handle push notifications via the OneSignal API. They are used to notify property owners and residents about visitor activity.

### Environment Variables Required

All OneSignal functions require these secrets configured in Supabase:

| Variable | Description |
|----------|-------------|
| `ONESIGNAL_APP_ID` | Your OneSignal Application ID |
| `ONESIGNAL_API_KEY` | Your OneSignal REST API Key |

---

### onesignal-notification

**Slug:** `onesignal-notification`
**Path:** `supabase/functions/onesignal-notification/index.ts`
**JWT Required:** No
**Purpose:** Generic notification sender for custom notifications

#### Request Payload

```typescript
interface NotificationPayload {
  title: string           // Required - Notification title
  message: string         // Required - Notification body
  player_ids?: string[]   // Optional - Target specific users
  segments?: string[]     // Optional - Target segments (e.g., "Subscribed Users")
  data?: Record<string, unknown>  // Optional - Custom data payload
}
```

#### Example Request

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/onesignal-notification' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Community Alert",
    "message": "Scheduled maintenance tomorrow at 9 AM",
    "segments": ["Subscribed Users"]
  }'
```

#### Response

```json
{
  "success": true,
  "onesignal_response": {
    "id": "notification-uuid",
    "recipients": 150
  }
}
```

#### Targeting Options

1. **Specific Users** - Use `player_ids` array with OneSignal player IDs
2. **Segments** - Use `segments` array (e.g., `["Active Users", "Subscribed Users"]`)
3. **All Subscribed** - Omit both to target all subscribed users

---

### onesignal-single-entry

**Slug:** `onesignal-single-entry`
**Path:** `supabase/functions/onesignal-single-entry/index.ts`
**JWT Required:** No
**Purpose:** Sends arrival notification when a visitor enters

#### Request Payload

```typescript
interface EntryPayload {
  visitor_name: string    // Required - Visitor's name
  property_id?: string    // Optional - Property being visited
  host_id?: string        // Optional - Host user ID
  record_uid?: string     // Optional - Visitor record UID
  player_ids?: string[]   // Optional - Target specific users
}
```

#### Example Request

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/onesignal-single-entry' \
  -H 'Content-Type: application/json' \
  -d '{
    "visitor_name": "John Smith",
    "property_id": "CRM1-LHD",
    "player_ids": ["10f42d52-862d-44cb-9051-f33f8b6e80c4"]
  }'
```

#### Notification Output

```
Title: "Arrival Notification!"
Body: "John Smith has just arrived."
```

---

### onesignal-single-exit

**Slug:** `onesignal-single-exit`
**Path:** `supabase/functions/onesignal-single-exit/index.ts`
**JWT Required:** No
**Purpose:** Sends departure notification when a visitor leaves

#### Request Payload

```typescript
interface ExitPayload {
  visitor_name: string    // Required - Visitor's name
  property_id?: string    // Optional - Property being visited
  host_id?: string        // Optional - Host user ID
  record_uid?: string     // Optional - Visitor record UID
  player_ids?: string[]   // Optional - Target specific users
}
```

#### Example Request

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/onesignal-single-exit' \
  -H 'Content-Type: application/json' \
  -d '{
    "visitor_name": "John Smith",
    "player_ids": ["10f42d52-862d-44cb-9051-f33f8b6e80c4"]
  }'
```

#### Notification Output

```
Title: "Farewell Notification!"
Body: "John Smith has just left."
```

---

### onesignal-updatesub

**Slug:** `onesignal-updatesub`
**Path:** `supabase/functions/onesignal-updatesub/index.ts`
**JWT Required:** No
**Purpose:** Update OneSignal player subscription status, tags, or external user ID

#### Request Payload

```typescript
interface UpdateSubscriptionPayload {
  player_id: string                        // Required - OneSignal player ID
  subscription_status?: boolean            // Optional - Enable/disable notifications
  tags?: Record<string, string | number | boolean>  // Optional - User tags
  external_user_id?: string                // Optional - Link to Supabase user ID
}
```

#### Example Request

```bash
# Enable notifications and set tags
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/onesignal-updatesub' \
  -H 'Content-Type: application/json' \
  -d '{
    "player_id": "10f42d52-862d-44cb-9051-f33f8b6e80c4",
    "subscription_status": true,
    "tags": {
      "community_id": "CRM1",
      "role": "Resident"
    },
    "external_user_id": "debe9968-e1c3-446a-93cb-a1dc0cc3df0e"
  }'
```

#### Tag Use Cases

Tags enable targeted notifications:

| Tag | Description | Example |
|-----|-------------|---------|
| `community_id` | User's community | `"CRM1"` |
| `property_id` | User's property | `"CRM1-LHD"` |
| `role` | User's role | `"Resident"` |
| `language` | Preferred language | `"es"` |

---

## User Management Functions

### create-user

**Slug:** `create-user`
**Path:** Deployed via Supabase Dashboard
**JWT Required:** Yes
**Purpose:** Create a new user with profile, role, and property assignments

This function uses the Admin API to create users without affecting the current session.

#### Authorization

Only users with these roles can create new users:
- Super Admin
- Mega Dealer
- Dealer
- Administrator

#### Request Headers

```
Authorization: Bearer <user_jwt_token>
Content-Type: application/json
```

#### Request Payload

```typescript
interface CreateUserPayload {
  email: string              // Required - User email
  password: string           // Required - User password
  display_name?: string      // Optional - Display name
  enabled?: boolean          // Optional - Account enabled (default: true)
  language?: string          // Optional - Language preference (default: "en")
  def_community_id?: string  // Optional - Default community
  def_property_id?: string   // Optional - Default property
  communities?: string[]     // Optional - Community IDs for scope
  properties?: string[]      // Optional - Property IDs for scope
  roles?: string[]           // Optional - Role IDs to assign
}
```

#### Example Request

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/create-user' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePassword123!",
    "display_name": "New User",
    "enabled": true,
    "language": "es",
    "def_community_id": "CRM1",
    "communities": ["CRM1"],
    "properties": ["CRM1-LHD"],
    "roles": ["resident-role-uuid"]
  }'
```

#### Response

```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "new-user-uuid",
    "email": "newuser@example.com"
  }
}
```

#### What This Function Does

1. Verifies the requesting user is authenticated
2. Checks the requesting user has permission (Super Admin, Mega Dealer, Dealer, or Administrator)
3. Creates the user in `auth.users` with auto-confirmed email
4. Updates the user's profile in the `profile` table
5. Assigns roles with proper scope in `profile_role` table
6. Creates property owner records in `property_owner` table

---

### deleteUser

**Slug:** `deleteUser`
**Path:** `supabase/functions/deleteUser/index.ts`
**JWT Required:** Yes
**Purpose:** Delete a user from auth.users

#### Request Payload

```typescript
interface DeleteUserPayload {
  userId: string  // Required - User UUID to delete
}
```

#### Example Request

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/deleteUser' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "user-uuid-to-delete"
  }'
```

#### Response

```
Usuario eliminado correctamente
```

#### Important Notes

- This only deletes from `auth.users`
- Profile and related records may remain (cascade delete depends on FK setup)
- For complete cleanup, use the `delete_user_completely()` database function

---

## IoT Control Functions

### shelly-control

**Slug:** `shelly-control`
**Path:** Deployed via Supabase Dashboard
**JWT Required:** Yes
**Purpose:** Control Shelly IoT devices for gate access

This function acts as a secure proxy to control Shelly devices without exposing API credentials to the client.

#### Request Payload

```typescript
interface ShellyControlPayload {
  device_id: string       // Required - Automation device UUID from database
  direction: "in" | "out" // Required - Gate direction
}
```

#### Example Request

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/shelly-control' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "device_id": "device-uuid-from-automation_devices",
    "direction": "in"
  }'
```

#### Response

```json
{
  "isok": true,
  "errors": null
}
```

#### How It Works

1. Receives device ID and direction from client
2. Fetches device credentials from `automation_devices` table
3. Validates device is enabled and has guest access
4. Selects correct Shelly device ID and channel based on direction
5. Makes authenticated request to Shelly Cloud API
6. Returns result without exposing credentials

#### Database Fields Used

From `automation_devices` table:

| Field | Description |
|-------|-------------|
| `api_url` | Shelly Cloud API URL |
| `auth_key` | Shelly authentication key |
| `device_id_in` | Shelly device ID for entry gate |
| `device_id_out` | Shelly device ID for exit gate |
| `device_channel_in` | Channel number for entry |
| `device_channel_out` | Channel number for exit |
| `divice_turn` | Turn action (default: "on") |
| `enabled` | Device enabled status |
| `guest_access` | Allow guest access |

---

## Email Functions

### portun-web-send-contact-email

**Slug:** `portun-web-send-contact-email`
**Path:** Deployed via Supabase Dashboard
**JWT Required:** Yes
**Purpose:** Send contact form emails via AWS SES

#### Environment Variables Required

| Variable | Description |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_REGION` | AWS region (default: us-east-1) |

#### Request Payload

```typescript
interface ContactEmailPayload {
  name: string                                    // Required - Sender name
  email: string                                   // Required - Sender email
  message: string                                 // Required - Message content
  pricingPlan: "Starter" | "Professional" | "Enterprise"  // Required - Selected plan
}
```

#### Example Request

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/portun-web-send-contact-email' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "message": "I am interested in the Professional plan for my community.",
    "pricingPlan": "Professional"
  }'
```

#### Response

```json
{
  "success": true,
  "message": "Email sent successfully",
  "messageId": "aws-ses-message-id"
}
```

#### Email Recipients

- **To:** hello@portun.app
- **BCC:** Sender's email (for their reference)
- **Reply-To:** Sender's email

---

## Deployment

### Deploy a Function

```bash
# Deploy a specific function
supabase functions deploy function-name

# Deploy all functions
supabase functions deploy
```

### Set Secrets

```bash
# Set OneSignal secrets
supabase secrets set ONESIGNAL_APP_ID=your-app-id
supabase secrets set ONESIGNAL_API_KEY=your-api-key

# Set AWS secrets for email
supabase secrets set AWS_ACCESS_KEY_ID=your-access-key
supabase secrets set AWS_SECRET_ACCESS_KEY=your-secret-key
supabase secrets set AWS_REGION=us-east-1
```

### View Logs

```bash
# View function logs
supabase functions logs function-name

# View all function logs
supabase functions logs
```

---

## Security Considerations

### JWT Verification

- Functions with `verify_jwt: true` require valid authentication
- JWT is verified against Supabase Auth
- Unauthenticated requests receive 401 Unauthorized

### CORS Headers

All functions include CORS headers for browser access:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### Credential Security

- API keys and secrets are stored as Supabase secrets
- Never exposed to client-side code
- Service role key used only server-side

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check JWT token is valid and not expired |
| 403 Forbidden | Verify user has required role/permissions |
| 404 Not Found | Check function slug and deployment status |
| 500 Internal Error | Check function logs for details |

### Debug Commands

```bash
# Check function status
supabase functions list

# View recent logs
supabase functions logs function-name --scroll

# Check secrets are set
supabase secrets list
```

---

## Related Documentation

- [Supabase Usage](./SUPABASE_USAGE.md) - Client-side Supabase patterns
- [Supabase Schema](./SUPABASE_SCHEMA.md) - Database schema reference
- [Authentication](./AUTHENTICATION.md) - Auth flow and user management
- [User Management](./USER_MANAGEMENT.md) - User CRUD operations
