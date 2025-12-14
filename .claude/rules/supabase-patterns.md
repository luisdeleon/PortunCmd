---
paths: src/**/*.ts, src/lib/supabase.ts, src/composables/**
---

# Supabase Integration Patterns

## Client Setup

```typescript
import { supabase } from '@/lib/supabase'
```

## Types

Generated types in `src/types/supabase/`:
- `Database` - Full database schema
- `Tables<'table_name'>` - Table row types
- `TablesInsert<'table_name'>` - Insert types
- `TablesUpdate<'table_name'>` - Update types

## Query Patterns

```typescript
// Fetch data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value)

// Single record
const { data, error } = await supabase
  .from('profile')
  .select('*')
  .eq('id', userId)
  .single()
```

## Key Tables

| Table | Purpose |
|-------|---------|
| `profile` | User profiles (links to auth.users) |
| `role` | Available roles (7-level hierarchy) |
| `profile_role` | User-role assignments with scope |
| `community` | Communities/condominiums |
| `property` | Properties within communities |
| `visitor_records_uid` | Visitor access records with QR |
| `visitor_record_logs` | Entry/exit logs |
| `automation_devices` | IoT devices (Shelly) |

## Full Schema Reference

See @docs/SUPABASE_SCHEMA.md for complete database schema.

## Backup Policy

**CRITICAL**: Always backup before database changes.
```bash
./scripts/backup-database.sh before_[operation]
```
See @docs/DATABASE_BACKUP.md for procedures.
