# Supabase Usage Guide

This guide shows how to use Supabase in your PortunCmd application.

## Setup

The Supabase client is already configured and ready to use. Make sure your `.env` file contains:

```env
VITE_SUPABASE_URL=https://data.portun.app
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## Basic Usage

### Using the Supabase Client Directly

```typescript
import { supabase } from '@/lib/supabase'

// Query data
const { data, error } = await supabase
  .from('profile')
  .select('*')
  .eq('enabled', true)

// Insert data
const { data, error } = await supabase
  .from('profile')
  .insert({ email: 'user@example.com', enabled: true })

// Update data
const { data, error } = await supabase
  .from('profile')
  .update({ display_name: 'New Name' })
  .eq('id', 'user-id')
```

### Using the Composable in Vue Components

```vue
<script setup lang="ts">
import { useSupabase } from '@/composables/useSupabase'
import type { Tables } from '@/types/supabase'

const { client } = useSupabase()

// Fetch profiles
const profiles = ref<Tables<'profile'>[]>([])

async function fetchProfiles() {
  const { data, error } = await client
    .from('profile')
    .select('*')
  
  if (error) {
    console.error('Error fetching profiles:', error)
    return
  }
  
  profiles.value = data || []
}

onMounted(() => {
  fetchProfiles()
})
</script>

<template>
  <div>
    <div v-for="profile in profiles" :key="profile.id">
      {{ profile.email }}
    </div>
  </div>
</template>
```

## Type-Safe Queries

The Supabase client is fully typed with your database schema. You'll get autocomplete and type checking:

```typescript
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase'

// Typed table access
type Profile = Tables<'profile'>
type ProfileInsert = TablesInsert<'profile'>
type ProfileUpdate = TablesUpdate<'profile'>

// Insert with type checking
const newProfile: ProfileInsert = {
  id: 'user-id',
  email: 'user@example.com',
  enabled: true,
}

const { data, error } = await supabase
  .from('profile')
  .insert(newProfile)
```

## Common Patterns

### Fetching Related Data

```typescript
// Fetch profile with related community and property
const { data, error } = await supabase
  .from('profile')
  .select(`
    *,
    community:def_community_id (
      id,
      name,
      address
    ),
    property:def_property_id (
      id,
      name,
      address
    )
  `)
  .eq('id', userId)
  .single()
```

### Real-time Subscriptions

```typescript
import { useSupabase } from '@/composables/useSupabase'

const { client } = useSupabase()

// Subscribe to changes
const subscription = client
  .channel('visitor-records')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'visitor_records_uid',
    },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

// Cleanup on component unmount
onUnmounted(() => {
  subscription.unsubscribe()
})
```

### Authentication

```typescript
import { supabase } from '@/lib/supabase'

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123',
})

// Sign out
await supabase.auth.signOut()

// Get current user
const { data: { user } } = await supabase.auth.getUser()
```

### Using Database Functions

```typescript
// Call a database function
const { data, error } = await supabase.rpc('func_count_table_rows', {
  p_table_name: 'visitor_record_logs',
  p_host_uid: userId,
  p_column_name: 'created_at',
  p_compare_date: '2024-01-01',
  p_compare_operator: '>=',
})

// Delete user completely (from auth.users and all related tables)
const { data, error } = await supabase.rpc('delete_user_completely', {
  user_id: 'uuid-here'
})

// Check both error and function result
if (error) {
  console.error('Supabase error:', error)
} else if (data && !data.success) {
  console.error('Function error:', data.message)
} else {
  console.log('User deleted successfully')
}
```

## Error Handling

Always handle errors when working with Supabase:

```typescript
const { data, error } = await supabase
  .from('profile')
  .select('*')

if (error) {
  console.error('Supabase error:', error)
  // Handle error (show notification, log, etc.)
  return
}

// Use data
console.log('Profiles:', data)
```

## Best Practices

1. **Use TypeScript types**: Import and use the generated types for type safety
2. **Handle errors**: Always check for errors in responses
3. **Use composables**: Use the `useSupabase` composable in Vue components
4. **Clean up subscriptions**: Unsubscribe from real-time subscriptions when components unmount
5. **Use RPC functions**: For complex queries, use database functions
6. **Optimize queries**: Use `.select()` to only fetch needed columns
7. **Use filters**: Apply filters on the server side, not client side

## Available Tables

Your database includes the following tables:

- `profile` - User profiles
- `community` - Communities/condominiums
- `property` - Properties/units
- `role` - User roles
- `profile_role` - Profile-role relationships
- `community_manager` - Community manager assignments
- `property_owner` - Property owner assignments
- `visitor_records_uid` - Visitor access records
- `visitor_record_logs` - Visitor entry/exit logs
- `automation_devices` - Automation devices
- `notifications` - System notifications
- `notification_users` - User notification preferences
- `translations` - Multi-language translations

See [SUPABASE_SCHEMA.md](./SUPABASE_SCHEMA.md) for detailed schema documentation.

