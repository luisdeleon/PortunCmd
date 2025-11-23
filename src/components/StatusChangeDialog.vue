<script setup lang="ts">
interface Props {
  isOpen: boolean
  entityType: 'user' | 'community' | 'property'
  entityId?: string
  currentStatus?: string
  entityName?: string
}

interface Emits {
  (e: 'update:isOpen', value: boolean): void
  (e: 'statusChanged'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { changeUserStatus, changeCommunityStatus, changePropertyStatus } = useStatus()

const newStatus = ref('')
const reason = ref('')
const reopeningDate = ref('')
const completionDate = ref('')
const isLoading = ref(false)
const errorSnackbar = ref({ show: false, message: '' })

// Status options based on entity type
const statusOptions = computed(() => {
  if (props.entityType === 'user') {
    return [
      { value: 'active', title: 'Active' },
      { value: 'pending', title: 'Pending' },
      { value: 'suspended', title: 'Suspended' },
      { value: 'inactive', title: 'Inactive' },
      { value: 'archived', title: 'Archived' },
    ]
  }
  else if (props.entityType === 'community') {
    return [
      { value: 'active', title: 'Active' },
      { value: 'under-construction', title: 'Under Construction' },
      { value: 'pre-launch', title: 'Pre-Launch' },
      { value: 'full-capacity', title: 'Full Capacity' },
      { value: 'maintenance', title: 'Maintenance' },
      { value: 'seasonal-closure', title: 'Seasonal Closure' },
      { value: 'inactive', title: 'Inactive' },
      { value: 'archived', title: 'Archived' },
    ]
  }
  else {
    return [
      { value: 'active', title: 'Active' },
      { value: 'vacant', title: 'Vacant' },
      { value: 'access-restricted', title: 'Access Restricted' },
      { value: 'maintenance', title: 'Maintenance' },
      { value: 'emergency-lockdown', title: 'Emergency Lockdown' },
      { value: 'guest-mode', title: 'Guest Mode' },
      { value: 'out-of-service', title: 'Out of Service' },
      { value: 'deactivated', title: 'Deactivated' },
      { value: 'archived', title: 'Archived' },
    ]
  }
})

const handleSubmit = async () => {
  if (!newStatus.value || !props.entityId)
    return

  isLoading.value = true

  try {
    if (props.entityType === 'user') {
      await changeUserStatus(props.entityId, newStatus.value as any, reason.value)
    }
    else if (props.entityType === 'community') {
      await changeCommunityStatus(props.entityId, newStatus.value as any, {
        reason: reason.value,
        reopeningDate: reopeningDate.value,
        completionDate: completionDate.value,
      })
    }
    else {
      await changePropertyStatus(props.entityId, newStatus.value as any, reason.value)
    }

    emit('statusChanged')
    emit('update:isOpen', false)

    // Reset form
    newStatus.value = ''
    reason.value = ''
    reopeningDate.value = ''
    completionDate.value = ''
  }
  catch (error: any) {
    console.error('Error changing status:', error)
    errorSnackbar.value = {
      show: true,
      message: error.message || 'Failed to change status'
    }
  }
  finally {
    isLoading.value = false
  }
}

const requiresReason = computed(() => {
  return newStatus.value === 'suspended' || newStatus.value === 'archived'
})

const showSeasonalFields = computed(() => {
  return props.entityType === 'community' && newStatus.value === 'seasonal-closure'
})

const showMaintenanceFields = computed(() => {
  return props.entityType === 'community' && newStatus.value === 'maintenance'
})

const entityTypeLabel = computed(() => {
  return props.entityType === 'user' ? 'User' : props.entityType === 'community' ? 'Community' : 'Property'
})

// Validate that all required fields are filled and status has changed
const isFormValid = computed(() => {
  // Must have a new status selected
  if (!newStatus.value)
    return false

  // Status must be different from current status
  if (newStatus.value === props.currentStatus)
    return false

  // Check if reason is required and filled
  if (requiresReason.value && !reason.value.trim())
    return false

  // Check if seasonal closure requires reopening date
  if (showSeasonalFields.value && !reopeningDate.value)
    return false

  return true
})
</script>

<template>
  <VDialog
    :model-value="isOpen"
    max-width="600"
    @update:model-value="emit('update:isOpen', $event)"
  >
    <VCard>
      <VCardTitle>
        Change {{ entityTypeLabel }} Status
      </VCardTitle>

      <VCardText>
        <VRow>
          <VCol cols="12">
            <div class="text-body-1 mb-2">
              <strong>{{ entityTypeLabel }}:</strong>
              {{ entityName || entityId }}
            </div>
            <div
              v-if="currentStatus"
              class="text-body-2 mb-4 d-flex align-center gap-2"
            >
              <strong>Current Status:</strong>
              <StatusBadge
                :status="currentStatus"
                :entity-type="entityType"
              />
            </div>
          </VCol>

          <VCol cols="12">
            <VSelect
              v-model="newStatus"
              label="New Status"
              :items="statusOptions"
              :rules="[v => !!v || 'Status is required']"
            />
          </VCol>

          <VCol
            v-if="requiresReason || newStatus"
            cols="12"
          >
            <VTextarea
              v-model="reason"
              label="Reason"
              :rules="requiresReason ? [v => !!v || 'Reason is required'] : []"
              rows="3"
              :hint="requiresReason ? 'Reason is required for this status' : 'Optional: Explain why this status is being changed'"
            />
          </VCol>

          <VCol
            v-if="showSeasonalFields"
            cols="12"
          >
            <VTextField
              v-model="reopeningDate"
              label="Reopening Date"
              type="date"
              :rules="[v => !!v || 'Reopening date is required for seasonal closure']"
            />
          </VCol>

          <VCol
            v-if="showMaintenanceFields"
            cols="12"
          >
            <VTextField
              v-model="completionDate"
              label="Expected Completion Date"
              type="date"
              hint="Optional: When is maintenance expected to complete?"
            />
          </VCol>
        </VRow>

        <VRow class="mt-8">
          <VCol
            cols="12"
            sm="6"
            order="2"
            order-sm="1"
          >
            <VBtn
              color="secondary"
              variant="outlined"
              :disabled="isLoading"
              prepend-icon="tabler-x"
              size="large"
              block
              @click="emit('update:isOpen', false)"
            >
              Cancel
            </VBtn>
          </VCol>
          <VCol
            cols="12"
            sm="6"
            order="1"
            order-sm="2"
          >
            <VBtn
              color="primary"
              :loading="isLoading"
              :disabled="!isFormValid || isLoading"
              prepend-icon="tabler-check"
              size="large"
              block
              @click="handleSubmit"
            >
              {{ isLoading ? 'Changing...' : 'Change Status' }}
            </VBtn>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>

    <!-- 👉 Error Snackbar -->
    <VSnackbar
      v-model="errorSnackbar.show"
      color="error"
      location="top end"
      :timeout="4000"
    >
      {{ errorSnackbar.message }}
    </VSnackbar>
  </VDialog>
</template>
