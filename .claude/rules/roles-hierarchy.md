---
paths: src/plugins/casl/**, src/composables/useAuth.ts, src/plugins/1.router/**
---

# Role Hierarchy & Authorization

## 7-Level Role Hierarchy

| Level | Role | Scope Type | Description |
|-------|------|------------|-------------|
| 1 | Super Admin | Global | Full system access |
| 2 | Mega Dealer | Dealer | Manages multiple dealers |
| 3 | Dealer | Dealer | Manages administrators |
| 4 | Administrator | Community | Manages residents, properties |
| 5 | Guard | Community | Controls access gates |
| 5 | Client | Community | External client access |
| 6 | Resident | Property | Creates visitor access |

## Scope Types

- `global` - Unrestricted access (Super Admin only)
- `dealer` - Scoped to dealer's communities
- `community` - Scoped to specific communities
- `property` - Scoped to specific properties

## Role Icons & Colors

| Role | Icon | Color |
|------|------|-------|
| Super Admin | `tabler-crown` | error (red) |
| Mega Dealer | `tabler-building-store` | purple |
| Dealer | `tabler-briefcase` | warning |
| Administrator | `tabler-shield-check` | primary |
| Guard | `tabler-shield-lock` | info |
| Client | `tabler-user-circle` | secondary |
| Resident | `tabler-home` | success |

## CASL Authorization

```typescript
// Route meta
<route lang="yaml">
meta:
  action: read
  subject: Admin
</route>

// Programmatic check
import { useAbility } from '@casl/vue'
const ability = useAbility()
if (ability.can('read', 'Admin')) {
  // Has permission
}
```

## Key Files

- Abilities: `src/plugins/casl/ability.ts`
- Auth composable: `src/composables/useAuth.ts`
- Route guards: `src/plugins/1.router/guards.ts`

## Full RBAC Reference

See @docs/RBAC_GUIDE.md for complete implementation guide.
