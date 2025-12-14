---
paths: src/**/*.vue, src/components/**, src/views/**
---

# Vue Component Standards

## Component Organization

- `src/@core/components/` - Core reusable components (auto-imported)
- `src/components/` - App-specific components (auto-imported)
- `src/views/` - View components for complex pages
- `src/@core/` - Framework-level code (not specific to this app)
- `src/@layouts/` - Layout components and utilities

## Modal/Dialog Design Standard

**CRITICAL: All confirmation and action dialogs MUST follow this pattern:**

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
        <VBtn color="secondary" variant="tonal" @click="cancelAction">
          Cancel
        </VBtn>
        <VBtn color="warning|error|primary" variant="elevated" @click="confirmAction">
          Confirm/Delete/Remove
        </VBtn>
      </div>
    </VCardText>
  </VCard>
</VDialog>
```

## Modal Design Rules

1. **Icon** - Large (56px), centered, appropriate color
2. **Title** - Clear, concise action title
3. **Message** - Descriptive text explaining consequences
4. **Button Order** - Cancel LEFT, Confirm RIGHT
5. **Button Colors**:
   - Cancel: `color="secondary" variant="tonal"`
   - Delete/Remove: `color="error"` or `color="warning"`
   - Confirm/Assign: `color="primary"`
6. **Max Width** - `max-width="500"` for standard dialogs
7. **Padding** - `class="text-center px-10 py-6"` on VCardText

## Icon Color Guidelines

- `error` (red) - Destructive actions (Delete permanently)
- `warning` (orange) - Caution actions (Remove, Disable)
- `primary` (blue) - Neutral/positive actions (Assign, Confirm)
- `success` (green) - Positive confirmations (Enable, Activate)
