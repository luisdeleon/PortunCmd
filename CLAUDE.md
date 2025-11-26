# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

PortunCmd is a Vue 3 + Vuetify + Supabase property management system with visitor access control, multi-tenant architecture, and IoT automation capabilities. The application uses file-based routing, auto-imported composables, and CASL for authorization.

## Development Commands

```bash
# Development
pnpm dev              # Start dev server at localhost:5173
pnpm dev:host         # Start with network access

# Building & Preview
pnpm build            # Production build (outputs to dist/)
pnpm preview          # Preview production build locally

# Code Quality
pnpm typecheck        # Run TypeScript checks
pnpm lint             # Run ESLint with auto-fix
```

## Environment Setup

Required environment variables in `.env`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_MAPBOX_ACCESS_TOKEN` - (Optional) For map features

The app will gracefully degrade if Supabase variables are missing, creating a placeholder client to prevent crashes during development.

## Architecture

### Core Concepts

1. **File-based Routing**: Pages in `src/pages/` automatically become routes via `unplugin-vue-router`. Route names are kebab-case (e.g., `user-list`).

2. **Auto-imports**: Composables from `src/composables/`, `src/@core/composable/`, and utils are auto-imported. Vue APIs (ref, computed, etc.), VueUse, Pinia, and i18n are also auto-imported.

3. **Plugin System**: Plugins in `src/plugins/` or `src/plugins/*/index.ts` are automatically registered via `registerPlugins()`. Plugins are loaded in alphabetical order (hence `1.router` for router precedence).

4. **Layout System**: Uses `vite-plugin-vue-meta-layouts` with layouts in `src/layouts/`. Components specify layouts via route meta or component options.

5. **Path Aliases**:
   - `@/` → `src/`
   - `@core/` → `src/@core/`
   - `@layouts/` → `src/@layouts/`
   - `@images/` → `src/assets/images/`
   - `@styles/` → `src/assets/styles/`
   - `@themeConfig` → `themeConfig.ts`

### Authentication Flow

Authentication is managed via `src/composables/useAuth.ts`:

1. **Login** (`login(email, password)`):
   - Authenticates with Supabase
   - Fetches user profile from `profile` table
   - Checks if profile is enabled
   - Fetches user roles from `profile_role` joined with `role` table
   - Determines primary role (admin takes precedence)
   - Generates CASL ability rules based on role
   - Returns `accessToken`, `userData`, and `userAbilityRules`

2. **Session Management**:
   - Session data stored in cookies: `userData`, `accessToken`, `userAbilityRules`
   - Router guards (`src/plugins/1.router/guards.ts`) check cookies for auth state
   - Background session verification via `supabase.auth.getSession()` (non-blocking)

3. **Authorization**:
   - CASL-based permissions defined in `src/plugins/casl/ability.ts`
   - Admin roles get `{ action: 'manage', subject: 'all' }`
   - Other roles get limited permissions
   - Routes can specify required permissions via meta
   - `canNavigate()` function checks if user can access route

### Supabase Integration

**Client Setup**: `src/lib/supabase.ts` creates a typed Supabase client:
```typescript
import { supabase } from '@/lib/supabase'
```

**Types**: Generated Supabase types in `src/types/supabase/`:
- `Database` - Full database schema
- `Tables<'table_name'>` - Table row types
- `TablesInsert<'table_name'>` - Insert types
- `TablesUpdate<'table_name'>` - Update types

**Composable**: `useSupabase()` provides access to the client and types.

### Key Database Tables

- `profile` - User profiles (links to auth.users)
- `role` - Available roles in hierarchy order: Super Admin, Mega Dealer, Dealer, Administrator, Guard, Client, Resident
- `profile_role` - User-role assignments with scope-based access control (many-to-many)
- `permissions` - 34 granular permissions for RBAC system
- `role_permissions` - Role-permission mappings
- `dealer_administrators` - Tracks dealer-administrator relationships
- `community` - Communities/condominiums
- `property` - Properties/units within communities
- `community_manager` - Manager-community assignments
- `property_owner` - Owner-property relationships
- `visitor_records_uid` - Visitor access records with QR codes
- `visitor_record_logs` - Entry/exit logs
- `automation_devices` - IoT devices (Shelly) for gate control
- `notifications` & `notification_users` - Notification system

### Role Hierarchy

The system uses a 7-level role hierarchy with 4 scope types:

| Level | Role | Scope Type | Description |
|-------|------|------------|-------------|
| 1 | Super Admin | Global | Full system access |
| 2 | Mega Dealer | Dealer | Manages multiple dealers and their communities |
| 3 | Dealer | Dealer | Manages their administrators and communities |
| 4 | Administrator | Community | Manages residents, properties, visitors |
| 5 | Guard | Community | Controls access gates, views visitor records |
| 5 | Client | Community | External client with limited access |
| 6 | Resident | Property | Creates visitor access for their properties |

**Scope Types:**
- `global` - Unrestricted access (Super Admin only)
- `dealer` - Scoped to dealer's communities (Mega Dealer and Dealer)
- `community` - Scoped to specific communities (Administrator, Guard, Client)
- `property` - Scoped to specific properties (Resident)

### Component Organization

- `src/@core/components/` - Core reusable components (auto-imported)
- `src/components/` - App-specific components (auto-imported)
- `src/views/` - View components for complex pages
- `src/@core/` - Framework-level code (not specific to this app)
- `src/@layouts/` - Layout components and utilities

### Styling

- Vuetify for component library (Material Design)
- SCSS with Vuetify variables in `src/assets/styles/variables/_vuetify.scss`
- Theme config in `themeConfig.ts` (app title, logo, i18n, theme, skin)
- Supports light/dark mode with system preference detection
- Bordered skin (`Skins.Bordered`) applied by default

### Internationalization

Configured in `src/plugins/i18n/`:
- Supported languages: English (en), Spanish (es), Portuguese (pt)
- Enabled by default (`themeConfig.app.i18n.enable: true`)
- Default locale: English
- Translation files in `src/plugins/i18n/locales/`

## Design Guidelines

**CRITICAL: Do not deviate from the established template design and theme colors.**

- **Preserve existing design system** - The application uses a carefully crafted Vuetify template with specific design patterns. Do not introduce new design paradigms or UI patterns that conflict with the existing template.
- **Maintain theme colors** - Theme colors are defined in `themeConfig.ts` and `src/assets/styles/variables/_vuetify.scss`. Do not modify the color scheme or introduce custom colors that break the established palette.
- **Use existing components** - Leverage components from `src/@core/components/` and Vuetify's component library. Do not create custom styled components that deviate from the template's visual language.
- **Respect the bordered skin** - The app uses `Skins.Bordered` as the default skin. Maintain this design choice and the associated visual styling.
- **Follow layout patterns** - Use the existing layout system in `src/@layouts/` and `src/layouts/`. Do not create custom layouts that break the visual consistency.

When adding new features or components, study similar existing pages and components to ensure visual and interaction consistency with the rest of the application.

### Modal/Dialog Design Standard

**CRITICAL: All confirmation and action dialogs MUST follow this consistent design pattern:**

```vue
<VDialog v-model="isDialogVisible" max-width="500">
  <VCard>
    <VCardText class="text-center px-10 py-6">
      <!-- 1. Icon at top (large, centered) -->
      <VIcon
        icon="tabler-icon-name"
        color="warning|error|primary|success"
        size="56"
        class="my-4"
      />

      <!-- 2. Title -->
      <h6 class="text-h6 mb-4">
        Dialog Title
      </h6>

      <!-- 3. Description/Message -->
      <p class="text-body-1 mb-6">
        Are you sure you want to [action] <strong>{{ itemName }}</strong>?
        This action cannot be undone.
      </p>

      <!-- 4. Buttons: Cancel (left) → Confirm (right) -->
      <div class="d-flex gap-4 justify-center">
        <VBtn
          color="secondary"
          variant="tonal"
          @click="cancelAction"
        >
          Cancel
        </VBtn>

        <VBtn
          color="warning|error|primary"
          variant="elevated"
          @click="confirmAction"
        >
          Confirm/Delete/Remove
        </VBtn>
      </div>
    </VCardText>
  </VCard>
</VDialog>
```

**Modal Design Rules:**
1. **Icon** - Always include a large (56px) icon at the top, centered, with appropriate color
2. **Title** - Clear, concise action title (e.g., "Delete Community", "Remove User")
3. **Message** - Descriptive text explaining the action and consequences
4. **Button Order** - Cancel button on LEFT, Confirm/Action button on RIGHT
5. **Button Colors**:
   - Cancel: `color="secondary" variant="tonal"`
   - Delete/Remove: `color="error" variant="elevated"` or `color="warning" variant="elevated"`
   - Confirm/Assign: `color="primary" variant="elevated"`
6. **Max Width** - Use `max-width="500"` for standard dialogs
7. **Padding** - Use `class="text-center px-10 py-6"` on VCardText

**Icon Color Guidelines:**
- `error` (red) - Destructive actions (Delete permanently)
- `warning` (orange) - Caution actions (Remove, Disable)
- `primary` (blue) - Neutral/positive actions (Assign, Confirm)
- `success` (green) - Positive confirmations (Enable, Activate)

## Common Patterns

### Creating a New Page

1. Add Vue file to `src/pages/` (e.g., `src/pages/my-page.vue`)
2. Route is auto-generated as `/my-page`
3. Use route meta for configuration:
```vue
<route lang="yaml">
meta:
  public: false  # Requires authentication
  layout: default
</route>
```

### Using Supabase

```typescript
// Fetch data
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value)

// With types
const { data, error } = await supabase
  .from('profile')
  .select('*')
  .eq('id', userId)
  .single() // Returns single object
```

### Authorization

```typescript
// In route meta
<route lang="yaml">
meta:
  action: read
  subject: Admin
</route>

// Check ability programmatically
import { useAbility } from '@casl/vue'
const ability = useAbility()
if (ability.can('read', 'Admin')) {
  // User has permission
}
```

### Creating a Composable

Add to `src/composables/` - it will be auto-imported:
```typescript
// src/composables/useMyFeature.ts
export const useMyFeature = () => {
  // Your logic
  return { ... }
}

// Use anywhere without import
const { ... } = useMyFeature()
```

## MSW (Mock Service Worker)

MSW is installed but currently disabled. The worker directory is in `public/`. If re-enabling, update service worker registration in the app initialization.

## Important Notes

- **Router guards run on every navigation** - cookies are checked first for performance, session verification happens in background
- **Profile must be enabled** - `profile.enabled` must be true for users to log in
- **Roles are extensible** - new roles can be added to the `role` table and ability rules updated in `useAuth.ts`
- **Role hierarchy is enforced** - 7-level hierarchy (Super Admin → Mega Dealer → Dealer → Administrator → Guard/Client → Resident)
- **Scope-based access control** - Users can only access data within their assigned scope (global, dealer, community, or property)
- **File-based routing** - nested routes use folder structure, dynamic routes use `[param]` syntax
- **TypeScript strict mode** - enabled, so all types must be properly defined
- **Vuetify components** - don't need imports, globally available
- **Icon system** - uses Iconify with Tabler icons (`tabler-icon-name`)

### Role Icons & Colors
| Role | Icon | Color |
|------|------|-------|
| Super Admin | `tabler-crown` | error (red) |
| Mega Dealer | `tabler-building-store` | purple |
| Dealer | `tabler-briefcase` | warning (orange) |
| Administrator | `tabler-shield-check` | primary (blue) |
| Guard | `tabler-shield-lock` | info (cyan) |
| Client | `tabler-user-circle` | secondary (gray) |
| Resident | `tabler-home` | success (green) |

## Git Workflow

When creating commits or pull requests:
- **Do not include Claude Code branding** in commit messages or PR descriptions
- Write clear, concise commit messages that follow the repository's existing style
- Do not add "Co-Authored-By: Claude" or similar attribution

## Documentation Guidelines

When creating documentation, tutorials, or guides:
- **All documentation must be placed in the `/docs` folder** - Never create documentation files in the root directory
- **Reference all documentation in README.md** - Update BOTH the "Documentation" section at the top AND the "Complete Documentation Index" section at the bottom of `README.md` to include links to new guides
- **Use descriptive filenames** - Use UPPERCASE names with underscores (e.g., `RBAC_GUIDE.md`, `API_REFERENCE.md`)
- **Follow existing structure** - Review existing documentation to maintain consistent formatting and organization
- **Categorize appropriately** - Place new documentation in the appropriate category in the "Complete Documentation Index" section (Getting Started, Database & Backend, Security & Access Control, Deployment, etc.)
- **Keep README.md updated** - The README serves as the main entry point; ensure all documentation is discoverable through it

**IMPORTANT**: When adding new documentation, you MUST update the "Complete Documentation Index" section at the bottom of README.md with:
1. A link to the new document
2. A brief description of what it covers
3. Placement in the appropriate category or create a new category if needed

Available documentation in `/docs`:
- `SETUP_GUIDE.md` - Complete setup instructions
- `GETTING_STARTED.md` - Development environment setup
- `AUTHENTICATION.md` - User management and auth configuration
- `CLOUDFLARE_SETUP.md` - Production deployment guide
- `SUPABASE_SCHEMA.md` - Complete database schema
- `SUPABASE_USAGE.md` - Code examples and patterns
- `RBAC_GUIDE.md` - Role-based access control implementation guide

## Database Backup Policy

**CRITICAL: ALWAYS create a database backup before making any database changes.**

### When to Backup

Create a backup before:
- Running database migrations
- Modifying table schemas (ALTER TABLE)
- Adding/removing columns or constraints
- Updating Row Level Security (RLS) policies
- Making bulk data changes
- Testing new features that modify data structure
- Deploying database changes to production

### How to Backup

**Use the provided backup script:**
```bash
# Before migration
./scripts/backup-database.sh before_migration_name

# Before schema changes
./scripts/backup-database.sh before_adding_permissions_table

# Before RLS updates
./scripts/backup-database.sh before_rls_policies
```

**Never skip backups.** See `docs/DATABASE_BACKUP.md` for complete backup procedures, restoration guides, and automation options.

### Backup Verification

After creating a backup:
1. Verify the backup file exists in `backups/` directory
2. Check the file size is reasonable (not 0 bytes)
3. If compressed, verify with: `gunzip -t backups/backup_file.sql.gz`

### Emergency Recovery

If something goes wrong:
1. Stop the application immediately
2. Assess the damage
3. Review `docs/DATABASE_BACKUP.md` recovery procedures
4. Restore from the most recent backup before the issue
5. Document the incident

## Testing & Deployment

No test suite is currently configured. The app is deployed to Cloudflare Pages (see `docs/CLOUDFLARE_SETUP.md` for deployment guide).

Build outputs to `dist/` and includes:
- Chunk size warning limit: 5000kb
- Vuetify excluded from pre-bundling for optimal loading
- All assets hashed for cache busting
