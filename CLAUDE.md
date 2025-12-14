# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Overview

PortunCmd is a Vue 3 + Vuetify + Supabase property management system with visitor access control, multi-tenant architecture, and IoT automation. Uses file-based routing, auto-imported composables, and CASL for authorization.

## Development Commands

```bash
pnpm dev              # Start dev server at localhost:5173
pnpm dev:host         # Start with network access
pnpm build            # Production build (outputs to dist/)
pnpm preview          # Preview production build
pnpm typecheck        # Run TypeScript checks
pnpm lint             # Run ESLint with auto-fix
```

## Environment Setup

Required in `.env`:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_MAPBOX_ACCESS_TOKEN` - (Optional) For map features

## Architecture

### Core Concepts

1. **File-based Routing**: Pages in `src/pages/` auto-become routes via `unplugin-vue-router`. Route names are kebab-case.

2. **Auto-imports**: Composables from `src/composables/`, Vue APIs (ref, computed), VueUse, Pinia, and i18n are auto-imported.

3. **Plugin System**: Plugins in `src/plugins/` auto-register. Alphabetical order (hence `1.router`).

4. **Layout System**: Uses `vite-plugin-vue-meta-layouts` with layouts in `src/layouts/`.

5. **Path Aliases**: `@/` → `src/`, `@core/` → `src/@core/`, `@layouts/` → `src/@layouts/`

### Authentication Flow

Managed via `src/composables/useAuth.ts`:

1. **Login**: Authenticates with Supabase → fetches profile → checks enabled → fetches roles → generates CASL abilities

2. **Session**: Stored in cookies (`userData`, `accessToken`, `userAbilityRules`). Router guards check cookies first, background session verification.

3. **Authorization**: CASL-based in `src/plugins/casl/ability.ts`. Routes specify permissions via meta. See @.claude/rules/roles-hierarchy.md

### Supabase Integration

Client: `src/lib/supabase.ts`. Types in `src/types/supabase/`.
See @.claude/rules/supabase-patterns.md for query patterns.
See @docs/SUPABASE_SCHEMA.md for full database schema.

### Role Hierarchy

7-level hierarchy with 4 scope types (global, dealer, community, property).
See @.claude/rules/roles-hierarchy.md for details.

## Design Guidelines

**CRITICAL: Do not deviate from the established template design and theme colors.**

- Preserve existing Vuetify template patterns
- Maintain theme colors from `themeConfig.ts`
- Use existing components from `src/@core/components/`
- Respect bordered skin (`Skins.Bordered`)
- Follow modal/dialog standard: @.claude/rules/vue-components.md
- Styling guidelines: @.claude/rules/styling.md

## Common Patterns

### Creating a New Page

```vue
<!-- src/pages/my-page.vue -->
<route lang="yaml">
meta:
  public: false
  layout: default
</route>
```

### Using Supabase

```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value)
```

### Authorization

```typescript
// Route meta
<route lang="yaml">
meta:
  action: read
  subject: Admin
</route>

// Programmatic
import { useAbility } from '@casl/vue'
const ability = useAbility()
if (ability.can('read', 'Admin')) { /* allowed */ }
```

### Creating a Composable

Add to `src/composables/` - auto-imported:
```typescript
export const useMyFeature = () => {
  return { ... }
}
```

## Important Notes

- Router guards run on every navigation (cookies checked first)
- `profile.enabled` must be true for login
- Roles are extensible via `role` table
- TypeScript strict mode enabled
- Vuetify components globally available
- Icons: Iconify with Tabler (`tabler-icon-name`)
- MSW is installed but disabled

## Git Workflow

- **No Claude Code branding** in commit messages
- **No "Co-Authored-By: Claude"** attribution
- Write clear, concise commit messages

## Documentation Guidelines

- All docs in `/docs` folder (never root)
- Reference new docs in README.md (both sections)
- Use UPPERCASE_SNAKE_CASE filenames
- Available docs: @docs/SETUP_GUIDE.md, @docs/RBAC_GUIDE.md, @docs/SUPABASE_SCHEMA.md, @docs/CLOUDFLARE_SETUP.md

## Database Backup Policy

**CRITICAL: Always backup before database changes.**

```bash
./scripts/backup-database.sh before_[operation_name]
```

See @docs/DATABASE_BACKUP.md for full procedures.

## Testing & Deployment

No test suite configured. Deployed to Cloudflare Pages.
See @docs/CLOUDFLARE_SETUP.md for deployment guide.
