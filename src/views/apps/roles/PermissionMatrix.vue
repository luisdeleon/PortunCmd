<script setup lang="ts">
import { supabase } from '@/lib/supabase'

interface Permission {
  id: string
  name: string
  resource: string
  action: string
  description?: string
}

interface Role {
  id: string
  role_name: string
  permissions: string[] // Permission IDs
}

interface MatrixCell {
  roleId: string
  permissionId: string
  hasPermission: boolean
}

// Data
const roles = ref<Role[]>([])
const permissions = ref<Permission[]>([])
const matrix = ref<Record<string, Record<string, boolean>>>({}) // { roleId: { permissionId: boolean } }
const isLoading = ref(false)
const isSaving = ref(false)

// Filters
const selectedResource = ref<string | null>(null)
const searchQuery = ref('')

// Fetch roles with their permissions
const fetchRoles = async () => {
  try {
    const { data, error } = await supabase
      .from('role')
      .select('id, role_name')
      .eq('enabled', true)
      .order('role_name')

    if (error) throw error

    // For each role, fetch its permissions
    const rolesWithPerms = await Promise.all(
      (data || []).map(async (role) => {
        const { data: rolePerms } = await supabase
          .from('role_permissions')
          .select('permission_id')
          .eq('role_id', role.id)

        return {
          id: role.id,
          role_name: role.role_name,
          permissions: rolePerms?.map(rp => rp.permission_id) || [],
        }
      })
    )

    roles.value = rolesWithPerms
  } catch (err) {
    console.error('Error fetching roles:', err)
  }
}

// Fetch all permissions
const fetchPermissions = async () => {
  try {
    const { data, error } = await supabase
      .from('permissions')
      .select('id, name, resource, action, description')
      .order('resource')
      .order('name')

    if (error) throw error

    permissions.value = data || []
  } catch (err) {
    console.error('Error fetching permissions:', err)
  }
}

// Build matrix from roles and permissions
const buildMatrix = () => {
  const newMatrix: Record<string, Record<string, boolean>> = {}

  roles.value.forEach(role => {
    newMatrix[role.id] = {}
    permissions.value.forEach(permission => {
      newMatrix[role.id][permission.id] = role.permissions.includes(permission.id)
    })
  })

  matrix.value = newMatrix
}

// Load data
const loadData = async () => {
  isLoading.value = true
  await Promise.all([fetchRoles(), fetchPermissions()])
  buildMatrix()
  isLoading.value = false
}

// Toggle permission for role
const togglePermission = async (roleId: string, permissionId: string) => {
  const currentValue = matrix.value[roleId][permissionId]
  const newValue = !currentValue

  // Optimistic update
  matrix.value[roleId][permissionId] = newValue

  try {
    if (newValue) {
      // Add permission
      const { error } = await supabase
        .from('role_permissions')
        .insert({
          role_id: roleId,
          permission_id: permissionId,
        })

      if (error) throw error
    } else {
      // Remove permission
      const { error } = await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
        .eq('permission_id', permissionId)

      if (error) throw error
    }

    // Update local role permissions array
    const role = roles.value.find(r => r.id === roleId)
    if (role) {
      if (newValue) {
        role.permissions.push(permissionId)
      } else {
        role.permissions = role.permissions.filter(p => p !== permissionId)
      }
    }
  } catch (err) {
    // Revert on error
    matrix.value[roleId][permissionId] = currentValue
    console.error('Error toggling permission:', err)
    alert('Failed to update permission. Please try again.')
  }
}

// Get unique resources for filter
const resources = computed(() => {
  const uniqueResources = [...new Set(permissions.value.map(p => p.resource))]
  return uniqueResources.map(resource => ({
    title: resource.charAt(0).toUpperCase() + resource.slice(1),
    value: resource,
  }))
})

// Filtered permissions based on resource and search
const filteredPermissions = computed(() => {
  let filtered = permissions.value

  if (selectedResource.value) {
    filtered = filtered.filter(p => p.resource === selectedResource.value)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    )
  }

  return filtered
})

// Group permissions by resource for display
const groupedPermissions = computed(() => {
  const groups: Record<string, Permission[]> = {}

  filteredPermissions.value.forEach(permission => {
    if (!groups[permission.resource]) {
      groups[permission.resource] = []
    }
    groups[permission.resource].push(permission)
  })

  return groups
})

// Role ordering
const roleOrder = ['Super Admin', 'Mega Dealer', 'Dealer', 'Administrator', 'Guard', 'Client', 'Resident']
const sortedRoles = computed(() => {
  return [...roles.value].sort((a, b) => {
    const indexA = roleOrder.indexOf(a.role_name)
    const indexB = roleOrder.indexOf(b.role_name)

    if (indexA === -1 && indexB === -1) return 0
    if (indexA === -1) return 1
    if (indexB === -1) return -1

    return indexA - indexB
  })
})

// Role-Scope Matrix data
const roleScopeMatrix = [
  { role: 'Super Admin', scope: 'Global', scopeType: 'global', description: 'Unrestricted access to all data', icon: 'tabler-crown', color: 'error' },
  { role: 'Mega Dealer', scope: 'Dealer', scopeType: 'dealer', description: 'Manages multiple dealers and their communities', icon: 'tabler-building-store', color: 'purple' },
  { role: 'Dealer', scope: 'Dealer', scopeType: 'dealer', description: 'Manages their administrators and communities', icon: 'tabler-briefcase', color: 'warning' },
  { role: 'Administrator', scope: 'Community', scopeType: 'community', description: 'Limited to specific communities', icon: 'tabler-shield-check', color: 'primary' },
  { role: 'Guard', scope: 'Community', scopeType: 'community', description: 'Limited to assigned communities', icon: 'tabler-shield-lock', color: 'info' },
  { role: 'Client', scope: 'Community', scopeType: 'community', description: 'Limited to assigned communities', icon: 'tabler-user-circle', color: 'secondary' },
  { role: 'Resident', scope: 'Property', scopeType: 'property', description: 'Limited to their own properties', icon: 'tabler-home', color: 'success' },
]

// Show/hide scope matrix
const showScopeMatrix = ref(true)

// Stats
const totalPermissions = computed(() => permissions.value.length)
const totalCells = computed(() => roles.value.length * permissions.value.length)
const checkedCells = computed(() => {
  let count = 0
  Object.values(matrix.value).forEach(rolePerms => {
    Object.values(rolePerms).forEach(hasPermission => {
      if (hasPermission) count++
    })
  })
  return count
})

// Export to CSV
const exportToCSV = () => {
  let csv = 'Role,'
  filteredPermissions.value.forEach(permission => {
    csv += `"${permission.name}",`
  })
  csv += '\n'

  sortedRoles.value.forEach(role => {
    csv += `"${role.role_name}",`
    filteredPermissions.value.forEach(permission => {
      const hasPermission = matrix.value[role.id]?.[permission.id]
      csv += hasPermission ? '✓,' : '✗,'
    })
    csv += '\n'
  })

  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'permission-matrix.csv'
  a.click()
  window.URL.revokeObjectURL(url)
}

// Load data on mount
onMounted(() => {
  loadData()
})

// Resolve role color
const resolveRoleColor = (roleName: string) => {
  const lowerRole = roleName.toLowerCase()
  if (lowerRole.includes('super admin')) return 'error'
  if (lowerRole.includes('mega dealer')) return 'purple'
  if (lowerRole.includes('dealer')) return 'warning'
  if (lowerRole.includes('administrator')) return 'primary'
  if (lowerRole.includes('guard')) return 'info'
  if (lowerRole.includes('client')) return 'secondary'
  if (lowerRole.includes('resident')) return 'success'
  return 'secondary'
}
</script>

<template>
  <!-- Role-Scope Matrix Card -->
  <VCard class="mb-6">
    <VCardItem>
      <template #prepend>
        <VIcon
          icon="tabler-hierarchy-2"
          size="24"
          color="primary"
        />
      </template>
      <VCardTitle>Role-Scope Matrix</VCardTitle>
      <VCardSubtitle>Each role is assigned a specific scope type that defines where they can exercise their permissions</VCardSubtitle>
      <template #append>
        <VBtn
          variant="text"
          :icon="showScopeMatrix ? 'tabler-chevron-up' : 'tabler-chevron-down'"
          size="small"
          @click="showScopeMatrix = !showScopeMatrix"
        />
      </template>
    </VCardItem>

    <VExpandTransition>
      <div v-show="showScopeMatrix">
        <VDivider />
        <VCardText>
          <VTable
            class="text-no-wrap"
            density="comfortable"
          >
            <thead>
              <tr>
                <th class="text-left">
                  Role
                </th>
                <th class="text-left">
                  Scope Type
                </th>
                <th class="text-left">
                  Description
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in roleScopeMatrix"
                :key="item.role"
              >
                <td>
                  <div class="d-flex align-center gap-2">
                    <VAvatar
                      :color="item.color"
                      variant="tonal"
                      size="32"
                    >
                      <VIcon
                        :icon="item.icon"
                        size="18"
                      />
                    </VAvatar>
                    <span class="font-weight-medium">{{ item.role }}</span>
                  </div>
                </td>
                <td>
                  <VChip
                    :color="item.scopeType === 'global' ? 'error' : item.scopeType === 'dealer' ? 'warning' : item.scopeType === 'community' ? 'primary' : 'success'"
                    size="small"
                    label
                  >
                    {{ item.scope }}
                  </VChip>
                </td>
                <td class="text-medium-emphasis">
                  {{ item.description }}
                </td>
              </tr>
            </tbody>
          </VTable>

          <VAlert
            color="info"
            variant="tonal"
            class="mt-4"
          >
            <template #prepend>
              <VIcon icon="tabler-info-circle" />
            </template>
            <div class="text-body-2">
              <strong>Note:</strong> Dealer Scope is shared by both Mega Dealer and Dealer roles.
              Community Scope is shared by Administrator, Guard, and Client roles.
              The difference between roles with the same scope type is in their <strong>permissions</strong>, not their scope.
            </div>
          </VAlert>
        </VCardText>
      </div>
    </VExpandTransition>
  </VCard>

  <!-- Permission Matrix Card -->
  <VCard>
    <VCardItem>
      <VCardTitle>Permission Matrix</VCardTitle>
      <template #append>
        <VBtn
          variant="tonal"
          color="secondary"
          prepend-icon="tabler-download"
          size="small"
          @click="exportToCSV"
        >
          Export CSV
        </VBtn>
      </template>
    </VCardItem>

    <VCardText>
      <!-- Filters -->
      <VRow class="mb-4">
        <VCol
          cols="12"
          md="6"
        >
          <AppTextField
            v-model="searchQuery"
            placeholder="Search permissions..."
            clearable
            clear-icon="tabler-x"
          >
            <template #prepend-inner>
              <VIcon icon="tabler-search" />
            </template>
          </AppTextField>
        </VCol>
        <VCol
          cols="12"
          md="6"
        >
          <AppSelect
            v-model="selectedResource"
            :items="resources"
            placeholder="Filter by resource"
            clearable
            clear-icon="tabler-x"
          >
            <template #prepend-inner>
              <VIcon icon="tabler-filter" />
            </template>
          </AppSelect>
        </VCol>
      </VRow>

      <!-- Stats -->
      <div class="d-flex gap-4 mb-4">
        <VChip
          color="primary"
          variant="tonal"
        >
          <VIcon
            start
            icon="tabler-shield"
          />
          {{ roles.length }} Roles
        </VChip>
        <VChip
          color="info"
          variant="tonal"
        >
          <VIcon
            start
            icon="tabler-key"
          />
          {{ filteredPermissions.length }} Permissions
        </VChip>
        <VChip
          color="success"
          variant="tonal"
        >
          <VIcon
            start
            icon="tabler-check"
          />
          {{ checkedCells }} / {{ totalCells }} Assigned
        </VChip>
      </div>

      <VDivider class="mb-4" />

      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="text-center py-10"
      >
        <VProgressCircular
          indeterminate
          color="primary"
          size="64"
        />
        <div class="mt-4 text-body-1">
          Loading permission matrix...
        </div>
      </div>

      <!-- Matrix Table -->
      <div
        v-else
        class="permission-matrix-wrapper"
      >
        <VTable
          class="permission-matrix-table"
          fixed-header
          height="600"
        >
          <thead>
            <tr>
              <th class="text-left sticky-col">
                Role
              </th>
              <th
                v-for="permission in filteredPermissions"
                :key="permission.id"
                class="text-center permission-col"
              >
                <div class="permission-header">
                  <div class="text-caption font-weight-bold">
                    {{ permission.name }}
                  </div>
                  <div
                    v-if="permission.description"
                    class="text-caption text-disabled"
                  >
                    {{ permission.description }}
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="role in sortedRoles"
              :key="role.id"
            >
              <td class="sticky-col">
                <VChip
                  :color="resolveRoleColor(role.role_name)"
                  size="small"
                  label
                >
                  {{ role.role_name }}
                </VChip>
              </td>
              <td
                v-for="permission in filteredPermissions"
                :key="permission.id"
                class="text-center permission-cell"
              >
                <VCheckbox
                  :model-value="matrix[role.id]?.[permission.id]"
                  hide-details
                  density="compact"
                  @update:model-value="togglePermission(role.id, permission.id)"
                />
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>

      <!-- Empty State -->
      <div
        v-if="!isLoading && filteredPermissions.length === 0"
        class="text-center py-10"
      >
        <VIcon
          icon="tabler-filter-x"
          size="64"
          color="disabled"
        />
        <div class="mt-4 text-h6">
          No permissions match your filters
        </div>
        <div class="text-body-2 text-disabled">
          Try adjusting your search or filter criteria
        </div>
      </div>
    </VCardText>
  </VCard>
</template>

<style lang="scss" scoped>
.permission-matrix-wrapper {
  overflow-x: auto;
  position: relative;
}

.permission-matrix-table {
  min-width: 100%;

  .sticky-col {
    position: sticky;
    left: 0;
    z-index: 2;
    background: rgb(var(--v-theme-surface));
    border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    min-width: 150px;
  }

  thead .sticky-col {
    z-index: 3;
  }

  .permission-col {
    min-width: 180px;
    padding: 0.5rem;
    vertical-align: top;
  }

  .permission-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    text-align: left;
  }

  .permission-cell {
    padding: 0.25rem;

    :deep(.v-checkbox) {
      justify-content: center;
    }
  }
}
</style>
