<script setup lang="ts">
import girlUsingMobile from '@images/pages/girl-using-mobile.png'
import { supabase } from '@/lib/supabase'

interface Permission {
  id: string
  name: string
  resource: string
  action: string
  description?: string
}

interface RoleDetails {
  id: string
  name: string
  permissions: Permission[]
}

interface RoleData {
  id: string
  role: string
  userCount: number
  permissionCount: number
  enabled: boolean
  scopeType?: string
  details: RoleDetails
}

// 👉 Filters
const selectedScopeType = ref<string | null>(null)
const selectedStatus = ref<string | null>(null)

const scopeTypes = [
  { title: 'All Scopes', value: null },
  { title: 'Global', value: 'global' },
  { title: 'Dealer', value: 'dealer' },
  { title: 'Community', value: 'community' },
  { title: 'Property', value: 'property' },
]

const statusOptions = [
  { title: 'All Status', value: null },
  { title: 'Enabled', value: true },
  { title: 'Disabled', value: false },
]

// 👉 Roles List
const roles = ref<RoleData[]>([])
const isLoading = ref(true)

// Fetch roles from Supabase
const fetchRoles = async () => {
  try {
    isLoading.value = true

    // Fetch roles with user counts and permission counts
    const { data: rolesData, error } = await supabase
      .from('role')
      .select(`
        id,
        role_name,
        enabled
      `)
      .order('role_name')

    if (error) {
      console.error('Error fetching roles:', error)
      return
    }

    // For each role, get user count and permission count
    const rolesWithCounts = await Promise.all(
      (rolesData || []).map(async (role) => {
        // Get user count
        const { count: userCount } = await supabase
          .from('profile_role')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', role.id)

        // Get permission count
        const { count: permissionCount } = await supabase
          .from('role_permissions')
          .select('*', { count: 'exact', head: true })
          .eq('role_id', role.id)

        // Get permissions for this role
        const { data: permissionsData } = await supabase
          .from('role_permissions')
          .select(`
            permission:permission_id (
              id,
              name,
              resource,
              action,
              description
            )
          `)
          .eq('role_id', role.id)

        const permissions = permissionsData?.map(p => p.permission).filter(Boolean) || []

        return {
          id: role.id,
          role: role.role_name,
          userCount: userCount || 0,
          permissionCount: permissionCount || 0,
          enabled: role.enabled,
          details: {
            id: role.id,
            name: role.role_name,
            permissions: permissions as Permission[],
          },
        }
      })
    )

    roles.value = rolesWithCounts
  } catch (err) {
    console.error('Error in fetchRoles:', err)
  } finally {
    isLoading.value = false
  }
}

// Define role order
const roleOrder = ['Super Admin', 'Mega Dealer', 'Dealer', 'Administrator', 'Guard', 'Client', 'Resident']

// Computed filtered roles
const filteredRoles = computed(() => {
  let filtered = roles.value

  // Filter by status
  if (selectedStatus.value !== null) {
    filtered = filtered.filter(role => role.enabled === selectedStatus.value)
  }

  // Sort by custom order
  filtered.sort((a, b) => {
    const indexA = roleOrder.indexOf(a.role)
    const indexB = roleOrder.indexOf(b.role)

    // If role not in order list, put it at the end
    if (indexA === -1 && indexB === -1) return 0
    if (indexA === -1) return 1
    if (indexB === -1) return -1

    return indexA - indexB
  })

  return filtered
})

// Fetch roles on mount
onMounted(() => {
  fetchRoles()
})

// Watch filters
watch([selectedScopeType, selectedStatus], () => {
  // Filtering is handled by computed property
})

const isRoleDialogVisible = ref(false)

const roleDetail = ref<RoleDetails>()

const isAddRoleDialogVisible = ref(false)

const editPermission = (value: RoleDetails) => {
  isRoleDialogVisible.value = true
  roleDetail.value = value
}

// Resolve role icon and color based on role name
const resolveRoleVariant = (roleName: string) => {
  const lowerRole = roleName.toLowerCase()

  if (lowerRole.includes('super admin'))
    return { icon: 'tabler-crown', color: 'error' }
  if (lowerRole.includes('mega dealer'))
    return { icon: 'tabler-building-store', color: 'purple' }
  if (lowerRole.includes('dealer'))
    return { icon: 'tabler-briefcase', color: 'warning' }
  if (lowerRole.includes('administrator') || lowerRole.includes('admin'))
    return { icon: 'tabler-shield-check', color: 'primary' }
  if (lowerRole.includes('guard'))
    return { icon: 'tabler-shield-lock', color: 'info' }
  if (lowerRole.includes('client'))
    return { icon: 'tabler-user-circle', color: 'secondary' }
  if (lowerRole.includes('resident'))
    return { icon: 'tabler-home', color: 'success' }

  return { icon: 'tabler-user', color: 'secondary' }
}
</script>

<template>
  <!-- 👉 Filters -->
  <VRow class="mb-6">
    <VCol
      cols="12"
      md="6"
    >
      <AppSelect
        v-model="selectedStatus"
        :items="statusOptions"
        placeholder="Filter by Status"
        clearable
        clear-icon="tabler-x"
      />
    </VCol>
    <VCol
      cols="12"
      md="6"
    >
      <AppSelect
        v-model="selectedScopeType"
        :items="scopeTypes"
        placeholder="Filter by Scope"
        clearable
        clear-icon="tabler-x"
        disabled
      >
        <template #prepend-inner>
          <VTooltip location="top">
            <template #activator="{ props }">
              <VIcon
                v-bind="props"
                icon="tabler-info-circle"
                size="20"
              />
            </template>
            <span>Scope filtering coming in Phase 2</span>
          </VTooltip>
        </template>
      </AppSelect>
    </VCol>
  </VRow>

  <!-- 👉 Loading State -->
  <VRow v-if="isLoading">
    <VCol cols="12">
      <VCard>
        <VCardText class="text-center py-10">
          <VProgressCircular
            indeterminate
            color="primary"
            size="64"
          />
          <div class="mt-4 text-body-1">
            Loading roles...
          </div>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>

  <VRow v-else>
    <!-- 👉 Roles -->
    <VCol
      v-for="item in filteredRoles"
      :key="item.id"
      cols="12"
      sm="6"
      lg="4"
    >
      <VCard>
        <VCardText class="d-flex align-center pb-4">
          <div class="d-flex align-center gap-2">
            <VAvatar
              size="40"
              :color="resolveRoleVariant(item.role).color"
              variant="tonal"
            >
              <VIcon
                :icon="resolveRoleVariant(item.role).icon"
                size="24"
              />
            </VAvatar>
            <div>
              <div class="text-body-2 text-disabled">
                Total {{ item.userCount }} user{{ item.userCount !== 1 ? 's' : '' }}
              </div>
              <div class="text-caption text-disabled">
                {{ item.permissionCount }} permission{{ item.permissionCount !== 1 ? 's' : '' }}
              </div>
            </div>
          </div>

          <VSpacer />

          <VChip
            :color="item.enabled ? 'success' : 'error'"
            size="small"
            label
          >
            {{ item.enabled ? 'Enabled' : 'Disabled' }}
          </VChip>
        </VCardText>

        <VCardText>
          <div class="d-flex justify-space-between align-center">
            <div>
              <h5 class="text-h5 mb-1">
                {{ item.role }}
              </h5>
              <div class="d-flex align-center gap-3">
                <a
                  href="javascript:void(0)"
                  class="text-sm"
                  @click="editPermission(item.details)"
                >
                  Edit Role
                </a>
                <VDivider
                  vertical
                  length="15"
                />
                <span class="text-sm text-disabled">
                  ID: {{ item.id.substring(0, 8) }}...
                </span>
              </div>
            </div>
            <IconBtn>
              <VIcon
                icon="tabler-copy"
                class="text-high-emphasis"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                Duplicate Role
              </VTooltip>
            </IconBtn>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- 👉 Add New Role -->
    <VCol
      cols="12"
      sm="6"
      lg="4"
    >
      <VCard
        class="h-100"
        :ripple="false"
      >
        <VRow
          no-gutters
          class="h-100"
        >
          <VCol
            cols="5"
            class="d-flex flex-column justify-end align-center mt-5"
          >
            <img
              width="85"
              :src="girlUsingMobile"
            >
          </VCol>

          <VCol cols="7">
            <VCardText class="d-flex flex-column align-end justify-end gap-4">
              <VBtn
                size="small"
                @click="isAddRoleDialogVisible = true"
              >
                Add New Role
              </VBtn>
              <div class="text-end">
                Add new role,<br> if it doesn't exist.
              </div>
            </VCardText>
          </VCol>
        </VRow>
      </VCard>
      <AddEditRoleDialog v-model:is-dialog-visible="isAddRoleDialogVisible" />
    </VCol>
  </VRow>

  <AddEditRoleDialog
    v-model:is-dialog-visible="isRoleDialogVisible"
    v-model:role-permissions="roleDetail"
  />
</template>
