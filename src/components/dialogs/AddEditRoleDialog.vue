<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'
import { supabase } from '@/lib/supabase'

interface Permission {
  id: string
  name: string
  resource: string
  action: string
  description?: string
  checked: boolean
}

interface PermissionGroup {
  resource: string
  icon: string
  color: string
  permissions: Permission[]
}

interface Roles {
  id?: string
  name: string
  permissions: Permission[]
}

interface Props {
  rolePermissions?: Roles
  isDialogVisible: boolean
}
interface Emit {
  (e: 'update:isDialogVisible', value: boolean): void
  (e: 'update:rolePermissions', value: Roles): void
}

const props = withDefaults(defineProps<Props>(), {
  rolePermissions: () => ({
    name: '',
    permissions: [],
  }),
})

const emit = defineEmits<Emit>()

// 👉 Permission Groups
const permissionGroups = ref<PermissionGroup[]>([])
const isLoading = ref(false)

const isSelectAll = ref(false)
const role = ref('')
const refPermissionForm = ref<VForm>()

// Resource icons and colors
const resourceConfig: Record<string, { icon: string; color: string }> = {
  community: { icon: 'tabler-building-community', color: 'primary' },
  property: { icon: 'tabler-home', color: 'success' },
  resident: { icon: 'tabler-users', color: 'info' },
  visitor: { icon: 'tabler-door-enter', color: 'warning' },
  automation: { icon: 'tabler-bolt', color: 'error' },
  administrator: { icon: 'tabler-shield-check', color: 'secondary' },
  analytics: { icon: 'tabler-chart-bar', color: 'primary' },
  notification: { icon: 'tabler-bell', color: 'warning' },
  system: { icon: 'tabler-settings', color: 'secondary' },
}

// Fetch all permissions and group by resource
const fetchPermissions = async () => {
  try {
    isLoading.value = true

    // Fetch all permissions
    const { data: allPermissions, error } = await supabase
      .from('permissions')
      .select('id, name, resource, action, description')
      .order('resource')
      .order('action')

    if (error) {
      console.error('Error fetching permissions:', error)
      return
    }

    // If we have a role ID, fetch which permissions it has
    let rolePermissionIds: string[] = []
    if (props.rolePermissions?.id) {
      const { data: rolePerms } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', props.rolePermissions.id)

      rolePermissionIds = rolePerms?.map(rp => rp.permission_id) || []
    }

    // Group permissions by resource
    const grouped = (allPermissions || []).reduce((acc, perm) => {
      const resource = perm.resource
      if (!acc[resource]) {
        acc[resource] = []
      }
      acc[resource].push({
        ...perm,
        checked: rolePermissionIds.includes(perm.id),
      })
      return acc
    }, {} as Record<string, Permission[]>)

    // Convert to array of PermissionGroup
    permissionGroups.value = Object.entries(grouped).map(([resource, permissions]) => ({
      resource: resource.charAt(0).toUpperCase() + resource.slice(1),
      icon: resourceConfig[resource]?.icon || 'tabler-file',
      color: resourceConfig[resource]?.color || 'secondary',
      permissions,
    }))
  } catch (err) {
    console.error('Error in fetchPermissions:', err)
  } finally {
    isLoading.value = false
  }
}

// Count checked permissions
const checkedCount = computed(() => {
  let counter = 0
  permissionGroups.value.forEach(group => {
    group.permissions.forEach(permission => {
      if (permission.checked) counter++
    })
  })
  return counter
})

// Total permissions count
const totalPermissions = computed(() => {
  let total = 0
  permissionGroups.value.forEach(group => {
    total += group.permissions.length
  })
  return total
})

const isIndeterminate = computed(() =>
  checkedCount.value > 0 && checkedCount.value < totalPermissions.value
)

// Select all functionality
watch(isSelectAll, val => {
  permissionGroups.value.forEach(group => {
    group.permissions.forEach(permission => {
      permission.checked = val
    })
  })
})

// Watch for dialog visibility and fetch permissions
watch(() => props.isDialogVisible, async (newVal) => {
  if (newVal) {
    role.value = props.rolePermissions?.name || ''
    await fetchPermissions()
    updateSelectAll()
  }
})

// Watch for role changes
watch(() => props.rolePermissions, async (newVal) => {
  if (newVal && props.isDialogVisible) {
    role.value = newVal.name || ''
    await fetchPermissions()
    updateSelectAll()
  }
}, { deep: true })

// Update select all checkbox state
const updateSelectAll = () => {
  isSelectAll.value = checkedCount.value === totalPermissions.value && totalPermissions.value > 0
}

// Watch permission changes to update select all state
watch(permissionGroups, () => {
  updateSelectAll()
}, { deep: true })

const isSaving = ref(false)

const onSubmit = async () => {
  if (!props.rolePermissions?.id) {
    alert('No role selected for editing')
    return
  }

  try {
    isSaving.value = true

    // Collect all checked permissions
    const checkedPermissionIds: string[] = []
    permissionGroups.value.forEach(group => {
      group.permissions.forEach(permission => {
        if (permission.checked) {
          checkedPermissionIds.push(permission.id)
        }
      })
    })

    // Delete existing permissions for this role
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', props.rolePermissions.id)

    if (deleteError) throw deleteError

    // Insert new permissions
    if (checkedPermissionIds.length > 0) {
      const records = checkedPermissionIds.map(permId => ({
        role_id: props.rolePermissions!.id,
        permission_id: permId,
      }))

      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(records)

      if (insertError) throw insertError
    }

    // Success - emit event and close dialog
    emit('update:isDialogVisible', false)
    isSelectAll.value = false
    refPermissionForm.value?.reset()

    // Reload parent component (role cards)
    window.location.reload()
  } catch (err) {
    console.error('Error saving role permissions:', err)
    alert('Failed to save role permissions. Please try again.')
  } finally {
    isSaving.value = false
  }
}

const onReset = () => {
  emit('update:isDialogVisible', false)
  isSelectAll.value = false
  permissionGroups.value = []
  refPermissionForm.value?.reset()
}
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 900"
    :model-value="props.isDialogVisible"
    @update:model-value="onReset"
  >
    <!-- 👉 Dialog close btn -->
    <DialogCloseBtn @click="onReset" />

    <VCard class="pa-sm-10 pa-2">
      <VCardText>
        <!-- 👉 Title -->
        <h4 class="text-h4 text-center mb-2">
          {{ props.rolePermissions.name ? 'Edit' : 'Add New' }} Role
        </h4>
        <p class="text-body-1 text-center mb-6">
          Set Role Permissions
        </p>

        <!-- 👉 Form -->
        <VForm ref="refPermissionForm">
          <!-- 👉 Role name -->
          <AppTextField
            v-model="role"
            label="Role Name"
            placeholder="Enter Role Name"
          />

          <div class="d-flex justify-space-between align-center my-6">
            <h5 class="text-h5">
              Role Permissions
            </h5>
            <VCheckbox
              v-model="isSelectAll"
              v-model:indeterminate="isIndeterminate"
              label="Select All"
              hide-details
            />
          </div>

          <div class="text-caption text-disabled mb-4">
            {{ checkedCount }} of {{ totalPermissions }} permissions selected
          </div>

          <!-- 👉 Loading State -->
          <VCard
            v-if="isLoading"
            flat
            class="mb-6"
          >
            <VCardText class="text-center py-10">
              <VProgressCircular
                indeterminate
                color="primary"
                size="48"
              />
              <div class="mt-4 text-body-2">
                Loading permissions...
              </div>
            </VCardText>
          </VCard>

          <!-- 👉 Permission Groups -->
          <VExpansionPanels
            v-else
            multiple
            variant="accordion"
            class="mb-6"
          >
            <VExpansionPanel
              v-for="group in permissionGroups"
              :key="group.resource"
            >
              <VExpansionPanelTitle>
                <div class="d-flex align-center gap-3">
                  <VAvatar
                    size="32"
                    :color="group.color"
                    variant="tonal"
                  >
                    <VIcon
                      :icon="group.icon"
                      size="20"
                    />
                  </VAvatar>
                  <div>
                    <div class="text-body-1 font-weight-medium">
                      {{ group.resource }}
                    </div>
                    <div class="text-caption text-disabled">
                      {{ group.permissions.filter(p => p.checked).length }} / {{ group.permissions.length }} selected
                    </div>
                  </div>
                </div>
              </VExpansionPanelTitle>
              <VExpansionPanelText>
                <VRow>
                  <VCol
                    v-for="permission in group.permissions"
                    :key="permission.id"
                    cols="12"
                    sm="6"
                  >
                    <VCheckbox
                      v-model="permission.checked"
                      hide-details
                    >
                      <template #label>
                        <div>
                          <div class="text-body-2">
                            {{ permission.name }}
                          </div>
                          <div
                            v-if="permission.description"
                            class="text-caption text-disabled"
                          >
                            {{ permission.description }}
                          </div>
                        </div>
                      </template>
                    </VCheckbox>
                  </VCol>
                </VRow>
              </VExpansionPanelText>
            </VExpansionPanel>
          </VExpansionPanels>

          <!-- 👉 Actions button -->
          <div class="d-flex align-center justify-center gap-4">
            <VBtn
              :loading="isSaving"
              :disabled="isSaving"
              @click="onSubmit"
            >
              {{ isSaving ? 'Saving...' : 'Submit' }}
            </VBtn>

            <VBtn
              color="secondary"
              variant="tonal"
              :disabled="isSaving"
              @click="onReset"
            >
              Cancel
            </VBtn>
          </div>
        </VForm>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
// Custom styles for permission dialog
.v-expansion-panel-text :deep(.v-expansion-panel-text__wrapper) {
  padding-block: 1rem;
}
</style>
