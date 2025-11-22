# Status System i18n (Internationalization) Guide

**Created:** 2025-11-21
**Purpose:** Guide for using translated status values across English, Spanish, and Portuguese

---

## Table of Contents

1. [Overview](#overview)
2. [Translation Structure](#translation-structure)
3. [Database Storage](#database-storage)
4. [Frontend Usage](#frontend-usage)
5. [Component Examples](#component-examples)
6. [Testing Translations](#testing-translations)

---

## Overview

The status system uses **English-only values in the database** and displays **translated labels in the UI** based on the user's language preference.

### Supported Languages

- 🇺🇸 **English** (en)
- 🇪🇸 **Spanish** (es)
- 🇧🇷 **Portuguese** (pt)

### Translation Files

All status translations are located in:
```
src/plugins/i18n/locales/
├── en.json  (English)
├── es.json  (Spanish)
└── pt.json  (Portuguese)
```

---

## Translation Structure

### Complete Translation Keys

```typescript
// All available translation keys for statuses:

// Labels and Actions
status.label                   // "Status" | "Estado" | "Status"
status.filterByStatus          // "Filter by Status" | "Filtrar por Estado" | "Filtrar por Status"
status.changeStatus            // "Change Status" | "Cambiar Estado" | "Alterar Status"
status.currentStatus           // "Current Status" | "Estado Actual" | "Status Atual"
status.newStatus               // "New Status" | "Nuevo Estado" | "Novo Status"
status.statusReason            // "Reason" | "Motivo" | "Motivo"
status.statusReasonHint        // Hint text for reason field
status.statusReasonRequired    // Validation message
status.statusChanged           // Success message
status.statusChangeFailed      // Error message

// User Statuses
status.user.active             // "Active" | "Activo" | "Ativo"
status.user.pending            // "Pending" | "Pendiente" | "Pendente"
status.user.suspended          // "Suspended" | "Suspendido" | "Suspenso"
status.user.inactive           // "Inactive" | "Inactivo" | "Inativo"
status.user.archived           // "Archived" | "Archivado" | "Arquivado"

// Community Statuses
status.community.active
status.community.under-construction
status.community.pre-launch
status.community.full-capacity
status.community.maintenance
status.community.seasonal-closure
status.community.inactive
status.community.archived

// Property Statuses
status.property.active
status.property.vacant
status.property.access-restricted
status.property.maintenance
status.property.emergency-lockdown
status.property.guest-mode
status.property.out-of-service
status.property.deactivated
status.property.archived

// Status Descriptions (tooltips/help text)
status.descriptions.user.{status}
status.descriptions.community.{status}
status.descriptions.property.{status}

// Dialog-specific translations
status.dialog.title.user
status.dialog.title.community
status.dialog.title.property
status.dialog.entity.user
status.dialog.entity.community
status.dialog.entity.property
status.dialog.fields.reopeningDate
status.dialog.fields.reopeningDateRequired
status.dialog.fields.completionDate
status.dialog.fields.completionDateHint
status.dialog.confirm
status.dialog.cancel
```

---

## Database Storage

### ✅ Correct: Store English Slugs

```sql
-- Database always stores English values
INSERT INTO profile (email, status) VALUES ('user@example.com', 'active');
INSERT INTO community (name, status) VALUES ('Sunset Hills', 'under-construction');
INSERT INTO property (name, status) VALUES ('Apt 101', 'vacant');

-- Queries use English values
SELECT * FROM profile WHERE status = 'active';  -- ✅ Correct
SELECT * FROM property WHERE status IN ('active', 'guest-mode');  -- ✅ Correct
```

### ❌ Incorrect: Never Store Translated Values

```sql
-- ❌ WRONG - Don't do this!
INSERT INTO profile (email, status) VALUES ('user@example.com', 'Activo');  -- Spanish
INSERT INTO profile (email, status) VALUES ('user@example.com', 'Ativo');   -- Portuguese

-- ❌ WRONG - Queries will break
SELECT * FROM profile WHERE status = 'Activo';  -- Won't work!
```

---

## Frontend Usage

### Using i18n in Components

#### Import and Setup

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t, locale } = useI18n()

// Get current language
console.log(locale.value) // 'en', 'es', or 'pt'
</script>
```

#### Basic Status Translation

```vue
<template>
  <!-- Translate a user status -->
  <span>{{ $t('status.user.active') }}</span>
  <!-- Output: "Active" (en) | "Activo" (es) | "Ativo" (pt) -->

  <!-- Translate a community status -->
  <span>{{ $t('status.community.under-construction') }}</span>
  <!-- Output: "Under Construction" (en) | "En Construcción" (es) | "Em Construção" (pt) -->

  <!-- Translate a property status -->
  <span>{{ $t('status.property.vacant') }}</span>
  <!-- Output: "Vacant" (en) | "Vacante" (es) | "Vago" (pt) -->
</template>
```

#### Dynamic Status Translation

```vue
<script setup lang="ts">
const user = ref({
  email: 'john@example.com',
  status: 'active'  // Database value (English)
})

const { t } = useI18n()

// Translate dynamically
const translatedStatus = computed(() => {
  return t(`status.user.${user.value.status}`)
})
</script>

<template>
  <div>
    <p>User Status: {{ translatedStatus }}</p>
    <!-- Output: "Active" (en) | "Activo" (es) | "Ativo" (pt) -->
  </div>
</template>
```

#### Status Descriptions (Tooltips)

```vue
<template>
  <VTooltip>
    <template #activator="{ props }">
      <VChip v-bind="props" color="success">
        {{ $t('status.user.active') }}
      </VChip>
    </template>

    <span>{{ $t('status.descriptions.user.active') }}</span>
    <!-- Tooltip shows: "User can log in and use the system normally" (en) -->
    <!-- "El usuario puede iniciar sesión y usar el sistema normalmente" (es) -->
    <!-- "O usuário pode fazer login e usar o sistema normalmente" (pt) -->
  </VTooltip>
</template>
```

---

## Component Examples

### Example 1: Status Badge with i18n

```vue
<!-- src/components/StatusBadge.vue -->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
  status: string
  entityType?: 'user' | 'community' | 'property'
  size?: 'x-small' | 'small' | 'default' | 'large' | 'x-large'
  showIcon?: boolean
  showDescription?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  entityType: 'user',
  size: 'small',
  showIcon: true,
  showDescription: false,
})

const { t } = useI18n()
const { getStatusColor, getStatusIcon } = useStatus()

// Translate status based on entity type
const translatedStatus = computed(() => {
  return t(`status.${props.entityType}.${props.status}`)
})

// Get description if needed
const statusDescription = computed(() => {
  if (!props.showDescription) return ''
  return t(`status.descriptions.${props.entityType}.${props.status}`)
})
</script>

<template>
  <VTooltip v-if="showDescription" location="top">
    <template #activator="{ props: tooltipProps }">
      <VChip
        v-bind="tooltipProps"
        :color="getStatusColor(status)"
        :prepend-icon="showIcon ? getStatusIcon(status) : undefined"
        :size="size"
        variant="tonal"
      >
        {{ translatedStatus }}
      </VChip>
    </template>

    <span>{{ statusDescription }}</span>
  </VTooltip>

  <VChip
    v-else
    :color="getStatusColor(status)"
    :prepend-icon="showIcon ? getStatusIcon(status) : undefined"
    :size="size"
    variant="tonal"
  >
    {{ translatedStatus }}
  </VChip>
</template>
```

**Usage:**

```vue
<template>
  <!-- User status -->
  <StatusBadge
    status="active"
    entity-type="user"
    show-description
  />

  <!-- Community status -->
  <StatusBadge
    status="under-construction"
    entity-type="community"
  />

  <!-- Property status with large size -->
  <StatusBadge
    status="vacant"
    entity-type="property"
    size="large"
  />
</template>
```

### Example 2: Status Select Dropdown with i18n

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const selectedStatus = ref('')

// User status options
const userStatusOptions = computed(() => [
  {
    value: 'active',
    title: t('status.user.active'),
    description: t('status.descriptions.user.active')
  },
  {
    value: 'pending',
    title: t('status.user.pending'),
    description: t('status.descriptions.user.pending')
  },
  {
    value: 'suspended',
    title: t('status.user.suspended'),
    description: t('status.descriptions.user.suspended')
  },
  {
    value: 'inactive',
    title: t('status.user.inactive'),
    description: t('status.descriptions.user.inactive')
  },
  {
    value: 'archived',
    title: t('status.user.archived'),
    description: t('status.descriptions.user.archived')
  },
])
</script>

<template>
  <VSelect
    v-model="selectedStatus"
    :label="$t('status.newStatus')"
    :items="userStatusOptions"
    item-title="title"
    item-value="value"
  >
    <template #item="{ item, props }">
      <VListItem v-bind="props">
        <template #prepend>
          <VIcon :icon="getStatusIcon(item.value)" />
        </template>
        <VListItemTitle>{{ item.title }}</VListItemTitle>
        <VListItemSubtitle class="text-caption">
          {{ item.description }}
        </VListItemSubtitle>
      </VListItem>
    </template>
  </VSelect>
</template>
```

### Example 3: Status Filter with i18n

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const statusFilter = ref<string[]>([])

// Multi-select filter options
const statusFilterOptions = computed(() => [
  { value: 'active', title: t('status.user.active') },
  { value: 'pending', title: t('status.user.pending') },
  { value: 'suspended', title: t('status.user.suspended') },
  { value: 'inactive', title: t('status.user.inactive') },
  { value: 'archived', title: t('status.user.archived') },
])
</script>

<template>
  <VSelect
    v-model="statusFilter"
    :label="$t('status.filterByStatus')"
    :items="statusFilterOptions"
    multiple
    clearable
    chips
    closable-chips
  />
</template>
```

### Example 4: Status Change Dialog with i18n

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface Props {
  isOpen: boolean
  entityType: 'user' | 'community' | 'property'
  entityId: string
  currentStatus: string
  entityName?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void
  (e: 'statusChanged'): void
}>()

const { t } = useI18n()
const { changeUserStatus, changeCommunityStatus, changePropertyStatus } = useStatus()

const newStatus = ref('')
const reason = ref('')

// Get dialog title based on entity type
const dialogTitle = computed(() => {
  return t(`status.dialog.title.${props.entityType}`)
})

// Get entity label
const entityLabel = computed(() => {
  return t(`status.dialog.entity.${props.entityType}`)
})

// Status options based on entity type
const statusOptions = computed(() => {
  const statuses = {
    user: ['active', 'pending', 'suspended', 'inactive', 'archived'],
    community: ['active', 'under-construction', 'pre-launch', 'full-capacity', 'maintenance', 'seasonal-closure', 'inactive', 'archived'],
    property: ['active', 'vacant', 'access-restricted', 'maintenance', 'emergency-lockdown', 'guest-mode', 'out-of-service', 'deactivated', 'archived'],
  }

  return statuses[props.entityType].map(status => ({
    value: status,
    title: t(`status.${props.entityType}.${status}`),
  }))
})

const handleSubmit = async () => {
  try {
    if (props.entityType === 'user') {
      await changeUserStatus(props.entityId, newStatus.value as any, reason.value)
    } else if (props.entityType === 'community') {
      await changeCommunityStatus(props.entityId, newStatus.value as any, { reason: reason.value })
    } else {
      await changePropertyStatus(props.entityId, newStatus.value as any, reason.value)
    }

    // Show success message
    alert(t('status.statusChanged'))

    emit('statusChanged')
    emit('update:isOpen', false)
  } catch (error: any) {
    alert(t('status.statusChangeFailed'))
  }
}
</script>

<template>
  <VDialog
    :model-value="isOpen"
    max-width="600"
    @update:model-value="emit('update:isOpen', $event)"
  >
    <VCard>
      <VCardTitle>{{ dialogTitle }}</VCardTitle>

      <VCardText>
        <VRow>
          <VCol cols="12">
            <div class="text-body-1 mb-2">
              <strong>{{ entityLabel }}:</strong> {{ entityName || entityId }}
            </div>
            <div class="text-body-2 mb-4">
              <strong>{{ $t('status.currentStatus') }}:</strong>
              <StatusBadge :status="currentStatus" :entity-type="entityType" />
            </div>
          </VCol>

          <VCol cols="12">
            <VSelect
              v-model="newStatus"
              :label="$t('status.newStatus')"
              :items="statusOptions"
            />
          </VCol>

          <VCol cols="12">
            <VTextarea
              v-model="reason"
              :label="$t('status.statusReason')"
              :hint="$t('status.statusReasonHint')"
              rows="3"
            />
          </VCol>
        </VRow>
      </VCardText>

      <VCardActions>
        <VSpacer />
        <VBtn variant="text" @click="emit('update:isOpen', false)">
          {{ $t('status.dialog.cancel') }}
        </VBtn>
        <VBtn color="primary" :disabled="!newStatus" @click="handleSubmit">
          {{ $t('status.dialog.confirm') }}
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
```

---

## Testing Translations

### Test Language Switching

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const changeLanguage = (newLocale: string) => {
  locale.value = newLocale
  // Language change is reactive - all translations update automatically
}
</script>

<template>
  <div>
    <h2>Current Language: {{ locale }}</h2>

    <VBtn @click="changeLanguage('en')">English</VBtn>
    <VBtn @click="changeLanguage('es')">Español</VBtn>
    <VBtn @click="changeLanguage('pt')">Português</VBtn>

    <div class="mt-4">
      <!-- These will update automatically when language changes -->
      <p>{{ $t('status.user.active') }}</p>
      <p>{{ $t('status.community.under-construction') }}</p>
      <p>{{ $t('status.property.vacant') }}</p>
    </div>
  </div>
</template>
```

### Console Testing

```javascript
// In browser console
console.log(window.$i18n.global.t('status.user.active'))
// English: "Active"
// Spanish: "Activo"
// Portuguese: "Ativo"

// Change language
window.$i18n.global.locale = 'es'
console.log(window.$i18n.global.t('status.user.active'))
// Output: "Activo"

window.$i18n.global.locale = 'pt'
console.log(window.$i18n.global.t('status.user.active'))
// Output: "Ativo"
```

---

## Best Practices

### ✅ Do's

1. **Always store English in database**
   ```sql
   INSERT INTO profile (status) VALUES ('active');  -- ✅
   ```

2. **Always use translation keys in UI**
   ```vue
   <span>{{ $t('status.user.active') }}</span>  <!-- ✅ -->
   ```

3. **Use entity type prefix**
   ```typescript
   t(`status.${entityType}.${status}`)  // ✅ Correct
   ```

4. **Provide descriptions for tooltips**
   ```vue
   <VTooltip>
     {{ $t(`status.descriptions.user.${status}`) }}
   </VTooltip>
   ```

### ❌ Don'ts

1. **Don't store translated values in database**
   ```sql
   INSERT INTO profile (status) VALUES ('Activo');  -- ❌ Wrong!
   ```

2. **Don't hardcode status labels**
   ```vue
   <span>Active</span>  <!-- ❌ Wrong! Won't translate -->
   ```

3. **Don't manually format status strings**
   ```typescript
   // ❌ Wrong - won't work for all languages
   const formatted = status.charAt(0).toUpperCase() + status.slice(1)

   // ✅ Correct - use translation
   const formatted = t(`status.user.${status}`)
   ```

---

## Quick Reference

### Translation Cheat Sheet

| Entity Type | Database Value | English | Spanish | Portuguese |
|-------------|---------------|---------|---------|------------|
| User | `active` | Active | Activo | Ativo |
| User | `pending` | Pending | Pendiente | Pendente |
| User | `suspended` | Suspended | Suspendido | Suspenso |
| Community | `under-construction` | Under Construction | En Construcción | Em Construção |
| Community | `full-capacity` | Full Capacity | Capacidad Completa | Capacidade Total |
| Property | `vacant` | Vacant | Vacante | Vago |
| Property | `guest-mode` | Guest Mode | Modo Invitado | Modo Convidado |
| Property | `emergency-lockdown` | Emergency Lockdown | Bloqueo de Emergencia | Bloqueio de Emergência |

---

## Related Documentation

- [STATUS_SYSTEM_DESIGN.md](./STATUS_SYSTEM_DESIGN.md) - Status system design and business rules
- [STATUS_SYSTEM_IMPLEMENTATION.md](./STATUS_SYSTEM_IMPLEMENTATION.md) - Implementation guide
- [Vue I18n Documentation](https://vue-i18n.intlify.dev/) - Official i18n plugin docs

---

**Last Updated:** 2025-11-21
**Languages:** English, Spanish, Portuguese
**Translation Coverage:** 100% (All statuses translated)
