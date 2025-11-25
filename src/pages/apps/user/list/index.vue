<script setup lang="ts">
import AddNewUserDrawer from '@/views/apps/user/list/AddNewUserDrawer.vue'
import AssignRoleDialog from '@/components/dialogs/AssignRoleDialog.vue'
import type { UserProperties } from '@/plugins/fake-api/handlers/apps/users/types'
import { supabase } from '@/lib/supabase'
import { useI18n } from 'vue-i18n'
import StatusBadge from '@/components/StatusBadge.vue'
import StatusChangeDialog from '@/components/StatusChangeDialog.vue'

definePage({
  meta: {
    public: false, // Requires authentication
  },
})

// 👉 i18n
const { t } = useI18n()

// 👉 Store
const searchQuery = ref('')
const selectedRole = ref()
const selectedCommunity = ref()
const selectedStatus = ref()

// Data table options
const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()
const selectedRows = ref([])

// Update data table options
const updateOptions = (options: any) => {
  console.log('updateOptions called with:', options)
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
  console.log('sortBy:', sortBy.value, 'orderBy:', orderBy.value)
}

// Headers
const headers = computed(() => [
  { title: t('userList.table.user'), key: 'user' },
  { title: t('userList.table.role'), key: 'plan' },
  { title: t('userList.table.community'), key: 'community' },
  { title: t('userList.table.property'), key: 'property' },
  { title: 'Status', key: 'status' },
  { title: t('userList.table.actions'), key: 'actions', sortable: false },
])

// 👉 Fetching users from Supabase
const users = ref<UserProperties[]>([])
const totalUsers = ref(0)
const usersLast30Days = ref(0)
const totalResidents = ref(0)
const residentsLast30Days = ref(0)
const totalActiveUsers = ref(0)
const activeUsersLast30Days = ref(0)
const totalInactiveUsers = ref(0)
const inactiveUsersLast30Days = ref(0)
const isLoading = ref(false)

// Mock data for role, plan, billing, and status
const mockRoles = ['Admin', 'Author', 'Editor', 'Maintainer', 'Subscriber']
const mockPlans = ['Basic', 'Company', 'Enterprise', 'Team']
const mockStatuses = ['Active', 'Inactive', 'Pending']

const fetchUsers = async () => {
  try {
    isLoading.value = true

    // Build query for Supabase with role join and scope info
    let query = supabase
      .from('profile')
      .select(`
        id,
        display_name,
        email,
        def_community_id,
        def_property_id,
        status,
        status_changed_at,
        status_changed_by,
        status_reason,
        profile_role!profile_role_profile_id_fkey(
          role_id,
          scope_type,
          scope_dealer_id,
          scope_community_ids,
          scope_property_ids,
          role!profile_role_role_id_fkey(role_name)
        )
      `, { count: 'exact' })

    // Apply search filter - search by Name and Email only
    if (searchQuery.value) {
      query = query.or(`display_name.ilike.%${searchQuery.value}%,email.ilike.%${searchQuery.value}%`)
    }

    // Apply role filter
    if (selectedRole.value) {
      // We'll need to filter client-side since role is in a nested join
    }

    // Apply community filter
    if (selectedCommunity.value) {
      query = query.eq('def_community_id', selectedCommunity.value)
    }

    // Apply status filter
    if (selectedStatus.value) {
      query = query.eq('status', selectedStatus.value)
    }

    // Apply sorting
    if (sortBy.value) {
      // Map table column keys to actual database columns
      const columnMap: Record<string, string> = {
        'user': 'display_name',
        'plan': 'display_name', // Will sort client-side for role
        'community': 'def_community_id',
        'property': 'def_property_id',
        'enabled': 'enabled',
      }

      const dbColumn = columnMap[sortBy.value] || sortBy.value
      const ascending = orderBy.value !== 'desc'
      console.log(`Sorting by: ${dbColumn}, ascending: ${ascending}`)
      query = query.order(dbColumn, { ascending })
    } else {
      // Default sorting by display_name
      console.log('Using default sort: display_name ascending')
      query = query.order('display_name', { ascending: true })
    }

    // Apply pagination (skip if role filter is active since we need to filter client-side)
    const from = (page.value - 1) * itemsPerPage.value
    const to = from + itemsPerPage.value - 1

    if (itemsPerPage.value !== -1 && !selectedRole.value) {
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching users from Supabase:', error)
      return
    }

    // Transform Supabase data first
    let allData = (data || []).map(profile => ({
      id: profile.id,
      fullName: profile.display_name || 'No Name',
      email: profile.email || 'No Email',
      currentPlan: profile.profile_role?.[0]?.role?.role_name || 'No Role',
      community: profile.def_community_id || 'N/A',
      property: profile.def_property_id || 'N/A',
      avatar: null,
      role: profile.profile_role?.[0]?.role?.role_name || 'No Role',
      scopeType: profile.profile_role?.[0]?.scope_type || 'global',
      status: profile.status || 'active',
      billing: 'Auto Debit',
    }))

    // Client-side role filter
    if (selectedRole.value) {
      allData = allData.filter(user => user.role === selectedRole.value)
    }

    // Role hierarchy order for sorting
    const roleOrder: Record<string, number> = {
      'Super Admin': 1,
      'Mega Dealer': 2,
      'Dealer': 3,
      'Administrator': 4,
      'Guard': 5,
      'Client': 6,
      'Resident': 7,
    }

    // Sort by role hierarchy
    const sortedData = allData.sort((a, b) => {
      const orderA = roleOrder[a.role] || 999
      const orderB = roleOrder[b.role] || 999
      return orderA - orderB
    })

    // Apply client-side pagination if role filter is active
    if (selectedRole.value && itemsPerPage.value !== -1) {
      const start = (page.value - 1) * itemsPerPage.value
      const end = start + itemsPerPage.value
      users.value = sortedData.slice(start, end)
    } else {
      users.value = sortedData
    }

    // Update total count based on filtered results
    totalUsers.value = selectedRole.value ? allData.length : (count || 0)
  } catch (err) {
    console.error('Error in fetchUsers:', err)
  } finally {
    isLoading.value = false
  }
}

// Fetch communities for filter
const fetchCommunities = async () => {
  try {
    const { data, error } = await supabase
      .from('community')
      .select('id')
      .order('id')

    if (error) {
      console.error('Error fetching communities:', error)
      return
    }

    communities.value = data?.map(community => ({
      title: community.id.toString(),
      value: community.id,
    })) || []
  } catch (err) {
    console.error('Error in fetchCommunities:', err)
  }
}

// Fetch users created in last 30 days for growth calculation
const fetchUserGrowth = async () => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count, error } = await supabase
      .from('profile')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (error) {
      console.error('Error fetching user growth:', error)
      return
    }

    usersLast30Days.value = count || 0
  } catch (err) {
    console.error('Error in fetchUserGrowth:', err)
  }
}

// Fetch resident count and growth
const fetchResidentStats = async () => {
  try {
    // Fetch all residents
    const { data: allResidents, error: allError } = await supabase
      .from('profile')
      .select(`
        id,
        created_at,
        profile_role!profile_role_profile_id_fkey(
          role_id,
          role!profile_role_role_id_fkey(role_name)
        )
      `)

    if (allError) {
      console.error('Error fetching residents:', allError)
      return
    }

    // Filter for residents
    const residents = allResidents?.filter(profile =>
      profile.profile_role?.[0]?.role?.role_name === 'Resident'
    ) || []

    totalResidents.value = residents.length

    // Calculate residents created in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    residentsLast30Days.value = residents.filter(resident =>
      resident.created_at && new Date(resident.created_at) >= thirtyDaysAgo
    ).length
  } catch (err) {
    console.error('Error in fetchResidentStats:', err)
  }
}

// Fetch active and inactive users stats
const fetchActiveInactiveStats = async () => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Fetch active users (enabled = true)
    const { count: activeCount, error: activeError } = await supabase
      .from('profile')
      .select('*', { count: 'exact', head: true })
      .eq('enabled', true)

    if (activeError) {
      console.error('Error fetching active users:', activeError)
    } else {
      totalActiveUsers.value = activeCount || 0
    }

    // Fetch active users created in last 30 days
    const { count: activeRecent, error: activeRecentError } = await supabase
      .from('profile')
      .select('*', { count: 'exact', head: true })
      .eq('enabled', true)
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (activeRecentError) {
      console.error('Error fetching recent active users:', activeRecentError)
    } else {
      activeUsersLast30Days.value = activeRecent || 0
    }

    // Fetch inactive users (enabled = false)
    const { count: inactiveCount, error: inactiveError } = await supabase
      .from('profile')
      .select('*', { count: 'exact', head: true })
      .eq('enabled', false)

    if (inactiveError) {
      console.error('Error fetching inactive users:', inactiveError)
    } else {
      totalInactiveUsers.value = inactiveCount || 0
    }

    // Fetch inactive users created in last 30 days
    const { count: inactiveRecent, error: inactiveRecentError } = await supabase
      .from('profile')
      .select('*', { count: 'exact', head: true })
      .eq('enabled', false)
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (inactiveRecentError) {
      console.error('Error fetching recent inactive users:', inactiveRecentError)
    } else {
      inactiveUsersLast30Days.value = inactiveRecent || 0
    }
  } catch (err) {
    console.error('Error in fetchActiveInactiveStats:', err)
  }
}

// Fetch users and communities on mount
onMounted(() => {
  fetchUsers()
  fetchCommunities()
  fetchUserGrowth()
  fetchResidentStats()
  fetchActiveInactiveStats()
})

// Watch for filter changes
watch([searchQuery, selectedRole, selectedCommunity, selectedStatus, page, itemsPerPage, sortBy, orderBy], () => {
  fetchUsers()
})

// 👉 search filters
const roles = computed(() => [
  { title: t('userList.roles.superAdmin'), value: 'Super Admin' },
  { title: t('userList.roles.megaDealer'), value: 'Mega Dealer' },
  { title: t('userList.roles.dealer'), value: 'Dealer' },
  { title: t('userList.roles.administrator'), value: 'Administrator' },
  { title: t('userList.roles.guard'), value: 'Guard' },
  { title: t('userList.roles.resident'), value: 'Resident' },
  { title: t('userList.roles.client'), value: 'Client' },
])

const communities = ref([])

const resolveUserRoleVariant = (role: string) => {
  const roleLowerCase = role.toLowerCase()

  if (roleLowerCase === 'super admin' || roleLowerCase === 'superadmin')
    return { color: 'error', icon: 'tabler-crown' }
  if (roleLowerCase === 'mega dealer')
    return { color: 'purple', icon: 'tabler-building-store' }
  if (roleLowerCase === 'dealer')
    return { color: 'warning', icon: 'tabler-briefcase' }
  if (roleLowerCase === 'administrator' || roleLowerCase === 'admin')
    return { color: 'primary', icon: 'tabler-shield-check' }
  if (roleLowerCase === 'guard')
    return { color: 'info', icon: 'tabler-shield-lock' }
  if (roleLowerCase === 'client')
    return { color: 'secondary', icon: 'tabler-user-circle' }
  if (roleLowerCase === 'resident')
    return { color: 'success', icon: 'tabler-home' }

  return { color: 'secondary', icon: 'tabler-user' }
}

const resolveUserStatusVariant = (stat: string) => {
  const statLowerCase = stat.toLowerCase()
  if (statLowerCase === 'pending')
    return 'warning'
  if (statLowerCase === 'active')
    return 'success'
  if (statLowerCase === 'inactive')
    return 'secondary'

  return 'primary'
}

const isAddNewUserDrawerVisible = ref(false)
const isAssignRoleDialogVisible = ref(false)
const selectedUserForRole = ref<string | null>(null)
const isDeleteDialogVisible = ref(false)
const isBulkDeleteDialogVisible = ref(false)
const isBulkStatusUpdateDialogVisible = ref(false)
const isStatusChangeDialogVisible = ref(false)
const selectedUser = ref<any>(null)
const userToDelete = ref<{ id: string; name: string } | null>(null)
const snackbar = ref({ show: false, message: '', color: 'success' })

// Bulk status update state
const bulkStatusForm = ref({
  newStatus: '',
  reason: '',
})

// Status filter options
const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Pending', value: 'pending' },
  { title: 'Suspended', value: 'suspended' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Archived', value: 'archived' },
]

// Computed property for bulk delete button visibility
const hasSelectedRows = computed(() => selectedRows.value.length > 0)

// Open assign role dialog
const openAssignRoleDialog = (userId: string) => {
  selectedUserForRole.value = userId
  isAssignRoleDialogVisible.value = true
}

// Handle role assigned
const handleRoleAssigned = () => {
  isAssignRoleDialogVisible.value = false
  selectedUserForRole.value = null
  fetchUsers() // Refresh user list
}

// Open status change dialog
const openStatusChangeDialog = (user: any) => {
  selectedUser.value = user
  isStatusChangeDialogVisible.value = true
}

// Handle status changed
const handleStatusChanged = () => {
  fetchUsers()
  fetchActiveInactiveStats()
  snackbar.value = {
    show: true,
    message: 'User status updated successfully',
    color: 'success',
  }
}

// 👉 Add new user
const addNewUser = async (userData: UserProperties) => {
  await $api('/apps/users', {
    method: 'POST',
    body: userData,
  })

  // Refetch User
  fetchUsers()
}

// 👉 Open delete confirmation dialog
const openDeleteDialog = (user: UserProperties) => {
  userToDelete.value = { id: user.id, name: user.fullName }
  isDeleteDialogVisible.value = true
}

// 👉 Delete user
const deleteUser = async () => {
  if (!userToDelete.value) return

  const { id, name } = userToDelete.value

  try {
    // First check if user has related records that might block deletion
    const { data: communityManagers, error: cmError } = await supabase
      .from('community_manager')
      .select('id')
      .eq('profile_id', id)
      .limit(1)

    if (cmError) {
      console.error('Error checking community managers:', cmError)
    }

    if (communityManagers && communityManagers.length > 0) {
      snackbar.value = {
        show: true,
        message: t('userList.messages.cannotDeleteManager'),
        color: 'error',
      }
      isDeleteDialogVisible.value = false
      userToDelete.value = null
      return
    }

    // Attempt to delete the user from both auth.users and profile
    const { data, error } = await supabase
      .rpc('delete_user_completely', { user_id: id })

    if (error) {
      console.error('Error deleting user:', error)

      // Check for specific error codes
      let errorMessage = t('userList.messages.deleteFailed')
      if (error.code === '23503') {
        errorMessage = t('userList.messages.cannotDeleteRelated')
      } else if (error.code === 'PGRST116') {
        errorMessage = t('userList.messages.deletePermissionDenied')
      }

      snackbar.value = {
        show: true,
        message: errorMessage,
        color: 'error',
      }
      isDeleteDialogVisible.value = false
      userToDelete.value = null
      return
    }

    // Check if the function returned an error
    if (data && !data.success) {
      console.error('Error deleting user:', data.message)
      snackbar.value = {
        show: true,
        message: data.message || t('userList.messages.deleteFailed'),
        color: 'error',
      }
      isDeleteDialogVisible.value = false
      userToDelete.value = null
      return
    }

    // Success
    snackbar.value = {
      show: true,
      message: t('userList.messages.deleteSuccess', { name }),
      color: 'success',
    }

    // Delete from selectedRows
    const index = selectedRows.value.findIndex(row => row === id)
    if (index !== -1)
      selectedRows.value.splice(index, 1)

    // Close dialog and clear selection
    isDeleteDialogVisible.value = false
    userToDelete.value = null

    // Refetch users
    fetchUsers()
    fetchUserGrowth()
    fetchResidentStats()
    fetchActiveInactiveStats()
  } catch (err) {
    console.error('Error in deleteUser:', err)
    snackbar.value = {
      show: true,
      message: t('userList.messages.deleteFailed'),
      color: 'error',
    }
    isDeleteDialogVisible.value = false
    userToDelete.value = null
  }
}

// 👉 Cancel delete
const cancelDelete = () => {
  isDeleteDialogVisible.value = false
  userToDelete.value = null
}

// 👉 Open bulk delete dialog
const openBulkDeleteDialog = () => {
  isBulkDeleteDialogVisible.value = true
}

const openBulkStatusUpdateDialog = () => {
  bulkStatusForm.value = {
    newStatus: '',
    reason: '',
  }
  isBulkStatusUpdateDialogVisible.value = true
}

// 👉 Cancel bulk delete
const cancelBulkDelete = () => {
  isBulkDeleteDialogVisible.value = false
}

const cancelBulkStatusUpdate = () => {
  bulkStatusForm.value = {
    newStatus: '',
    reason: '',
  }
  isBulkStatusUpdateDialogVisible.value = false
}

// 👉 Bulk delete users
const bulkDeleteUsers = async () => {
  if (selectedRows.value.length === 0) return

  const totalToDelete = selectedRows.value.length

  try {
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Delete each selected user
    for (const userId of selectedRows.value) {
      try {
        // Check for community manager relationships
        const { data: communityManagers, error: cmError } = await supabase
          .from('community_manager')
          .select('id')
          .eq('profile_id', userId)
          .limit(1)

        if (cmError) {
          console.error('Error checking community managers:', cmError)
        }

        if (communityManagers && communityManagers.length > 0) {
          errorCount++
          errors.push(`User ${userId} is a community manager and cannot be deleted`)
          continue
        }

        // Call the database function to delete user from both auth.users and profile
        const { data, error } = await supabase
          .rpc('delete_user_completely', { user_id: userId })

        if (error) {
          errorCount++
          errors.push(`Failed to delete user ${userId}: ${error.message}`)
        } else if (data && !data.success) {
          errorCount++
          errors.push(`Failed to delete user ${userId}: ${data.message}`)
        } else {
          successCount++
        }
      } catch (err: any) {
        errorCount++
        errors.push(`Failed to delete user ${userId}: ${err.message}`)
      }
    }

    // Show result message
    if (errorCount === 0) {
      snackbar.value = {
        show: true,
        message: `Successfully deleted ${successCount} ${successCount === 1 ? 'user' : 'users'}`,
        color: 'success',
      }
    } else if (successCount === 0) {
      snackbar.value = {
        show: true,
        message: `Failed to delete ${errorCount} ${errorCount === 1 ? 'user' : 'users'}`,
        color: 'error',
      }
    } else {
      snackbar.value = {
        show: true,
        message: `Deleted ${successCount} ${successCount === 1 ? 'user' : 'users'}, ${errorCount} failed`,
        color: 'warning',
      }
    }

    // Clear selection
    selectedRows.value = []

    // Refetch users
    fetchUsers()
    fetchUserGrowth()
    fetchResidentStats()
    fetchActiveInactiveStats()

    // Close dialog
    isBulkDeleteDialogVisible.value = false
  } catch (err) {
    console.error('Error in bulkDeleteUsers:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to delete users',
      color: 'error',
    }

    isBulkDeleteDialogVisible.value = false
  }
}

// 👉 Bulk status update
const bulkUpdateStatus = async () => {
  if (selectedRows.value.length === 0 || !bulkStatusForm.value.newStatus) return

  try {
    let successCount = 0
    let errorCount = 0

    // Get current user id for status_changed_by
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    // Update each selected user
    for (const profileId of selectedRows.value) {
      try {
        const { error } = await supabase
          .from('profile')
          .update({
            status: bulkStatusForm.value.newStatus,
            status_changed_at: new Date().toISOString(),
            status_changed_by: userId,
            status_reason: bulkStatusForm.value.reason || null,
          })
          .eq('id', profileId)

        if (error) {
          errorCount++
          console.error(`Failed to update user ${profileId}:`, error)
        } else {
          successCount++
        }
      } catch (err: any) {
        errorCount++
        console.error(`Failed to update user ${profileId}:`, err)
      }
    }

    // Show result message
    if (errorCount === 0) {
      snackbar.value = {
        show: true,
        message: `Successfully updated status for ${successCount} ${successCount === 1 ? 'user' : 'users'}`,
        color: 'success',
      }
    } else if (successCount === 0) {
      snackbar.value = {
        show: true,
        message: `Failed to update status for ${errorCount} ${errorCount === 1 ? 'user' : 'users'}`,
        color: 'error',
      }
    } else {
      snackbar.value = {
        show: true,
        message: `Updated ${successCount} ${successCount === 1 ? 'user' : 'users'}, ${errorCount} failed`,
        color: 'warning',
      }
    }

    // Clear selection
    selectedRows.value = []

    // Refetch users
    fetchUsers()
    fetchActiveInactiveStats()

    // Close dialog
    isBulkStatusUpdateDialogVisible.value = false
    bulkStatusForm.value = {
      newStatus: '',
      reason: '',
    }
  } catch (err) {
    console.error('Error in bulkUpdateStatus:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to update user statuses',
      color: 'error',
    }

    isBulkStatusUpdateDialogVisible.value = false
  }
}

const widgetData = computed(() => {
  // Calculate growth percentage based on users created in last 30 days
  const growthPercentage = totalUsers.value > 0 && usersLast30Days.value > 0
    ? Math.round((usersLast30Days.value / totalUsers.value) * 100)
    : 0

  // Calculate resident growth percentage
  const residentGrowthPercentage = totalResidents.value > 0 && residentsLast30Days.value > 0
    ? Math.round((residentsLast30Days.value / totalResidents.value) * 100)
    : 0

  // Calculate active users growth percentage
  const activeGrowthPercentage = totalActiveUsers.value > 0 && activeUsersLast30Days.value > 0
    ? Math.round((activeUsersLast30Days.value / totalActiveUsers.value) * 100)
    : 0

  // Calculate inactive users growth percentage
  const inactiveGrowthPercentage = totalInactiveUsers.value > 0 && inactiveUsersLast30Days.value > 0
    ? Math.round((inactiveUsersLast30Days.value / totalInactiveUsers.value) * 100)
    : 0

  return [
    { title: t('userList.widgets.totalUsers'), value: totalUsers.value.toLocaleString(), change: growthPercentage, desc: t('userList.widgets.last30DaysGrowth'), icon: 'tabler-users', iconColor: 'primary' },
    { title: t('userList.widgets.residentCount'), value: totalResidents.value.toLocaleString(), change: residentGrowthPercentage, desc: t('userList.widgets.last30DaysGrowth'), icon: 'tabler-home', iconColor: 'error' },
    { title: t('userList.widgets.activeUsers'), value: totalActiveUsers.value.toLocaleString(), change: activeGrowthPercentage, desc: t('userList.widgets.last30DaysAnalytics'), icon: 'tabler-user-check', iconColor: 'success' },
    { title: t('userList.widgets.inactiveUsers'), value: totalInactiveUsers.value.toLocaleString(), change: inactiveGrowthPercentage, desc: t('userList.widgets.last30DaysAnalytics'), icon: 'tabler-user-x', iconColor: 'warning' },
  ]
})
</script>

<template>
  <section>
    <!-- 👉 Widgets -->
    <div class="d-flex mb-6">
      <VRow>
        <template
          v-for="(data, id) in widgetData"
          :key="id"
        >
          <VCol
            cols="12"
            md="3"
            sm="6"
          >
            <VCard>
              <VCardText>
                <div class="d-flex justify-space-between">
                  <div class="d-flex flex-column gap-y-1">
                    <div class="text-body-1 text-high-emphasis">
                      {{ data.title }}
                    </div>
                    <div class="d-flex gap-x-2 align-center">
                      <h4 class="text-h4">
                        {{ data.value }}
                      </h4>
                      <div
                        class="text-base"
                        :class="data.change > 0 ? 'text-success' : 'text-error'"
                      >
                        ({{ prefixWithPlus(data.change) }}%)
                      </div>
                    </div>
                    <div class="text-sm">
                      {{ data.desc }}
                    </div>
                  </div>
                  <VAvatar
                    :color="data.iconColor"
                    variant="tonal"
                    rounded
                    size="42"
                  >
                    <VIcon
                      :icon="data.icon"
                      size="26"
                    />
                  </VAvatar>
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </template>
      </VRow>
    </div>

    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>{{ $t('userList.filters.title') }}</VCardTitle>
      </VCardItem>

      <VCardText>
        <VRow>
          <!-- 👉 Filter by Role -->
          <VCol
            cols="12"
            sm="4"
          >
            <AppSelect
              v-model="selectedRole"
              :placeholder="$t('userList.filters.filterByRole')"
              :items="roles"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
          <!-- 👉 Filter by Community -->
          <VCol
            cols="12"
            sm="4"
          >
            <AppSelect
              v-model="selectedCommunity"
              :placeholder="$t('userList.filters.filterByCommunity')"
              :items="communities"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
          <!-- 👉 Filter by Status -->
          <VCol
            cols="12"
            sm="4"
          >
            <AppSelect
              v-model="selectedStatus"
              placeholder="Filter by Status"
              :items="statusOptions"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
        </VRow>
      </VCardText>

      <VDivider />

      <VCardText class="d-flex flex-wrap gap-4">
        <div class="me-3 d-flex gap-3">
          <AppSelect
            :model-value="itemsPerPage"
            :items="[
              { value: 10, title: '10' },
              { value: 25, title: '25' },
              { value: 50, title: '50' },
              { value: 100, title: '100' },
              { value: -1, title: 'All' },
            ]"
            style="inline-size: 6.25rem;"
            @update:model-value="itemsPerPage = parseInt($event, 10)"
          />

          <!-- 👉 Bulk Status Update button (shown when items are selected) -->
          <VBtn
            v-if="hasSelectedRows"
            variant="tonal"
            color="warning"
            prepend-icon="tabler-replace"
            @click="openBulkStatusUpdateDialog"
          >
            Update Status ({{ selectedRows.length }})
          </VBtn>

          <!-- 👉 Bulk Delete button (shown when items are selected) -->
          <VBtn
            v-if="hasSelectedRows"
            variant="tonal"
            color="error"
            prepend-icon="tabler-trash"
            @click="openBulkDeleteDialog"
          >
            Delete ({{ selectedRows.length }})
          </VBtn>
        </div>
        <VSpacer />

        <div class="app-user-search-filter d-flex align-center flex-wrap gap-4">
          <!-- 👉 Search  -->
          <div style="inline-size: 15.625rem;">
            <AppTextField
              v-model="searchQuery"
              :placeholder="$t('userList.search.placeholder')"
              clearable
              clear-icon="tabler-x"
            />
          </div>

          <!-- 👉 Refresh button -->
          <VBtn
            variant="tonal"
            color="default"
            icon="tabler-refresh"
            @click="fetchUsers"
          />

          <!-- 👉 Import button -->
          <VBtn
            variant="tonal"
            color="secondary"
            prepend-icon="tabler-download"
          >
            Import
          </VBtn>

          <!-- 👉 Add user button -->
          <VBtn
            prepend-icon="tabler-plus"
            :to="{ name: 'apps-user-add' }"
          >
            {{ $t('userList.buttons.addNewUser') }}
          </VBtn>
        </div>
      </VCardText>

      <VDivider />

      <!-- SECTION datatable -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:model-value="selectedRows"
        v-model:page="page"
        :items="users"
        item-value="id"
        :items-length="totalUsers"
        :headers="headers"
        :loading="isLoading"
        class="text-no-wrap"
        show-select
        @update:options="updateOptions"
      >
        <!-- User -->
        <template #item.user="{ item }">
          <div class="d-flex align-center gap-x-4">
            <VAvatar
              size="34"
              :variant="!item.avatar ? 'tonal' : undefined"
              :color="!item.avatar ? resolveUserRoleVariant(item.role).color : undefined"
            >
              <VImg
                v-if="item.avatar"
                :src="item.avatar"
              />
              <span v-else>{{ avatarText(item.fullName) }}</span>
            </VAvatar>
            <div class="d-flex flex-column">
              <h6 class="text-base">
                <RouterLink
                  :to="{ name: 'apps-user-view-id', params: { id: item.id } }"
                  class="font-weight-medium text-link"
                >
                  {{ item.fullName }}
                </RouterLink>
              </h6>
              <div class="text-sm">
                {{ item.email }}
              </div>
            </div>
          </div>
        </template>

        <!-- 👉 Community -->
        <template #item.community="{ item }">
          <div class="text-body-1 text-high-emphasis">
            {{ item.community }}
          </div>
        </template>

        <!-- 👉 Role (Plan) -->
        <template #item.plan="{ item }">
          <div class="d-flex align-center gap-x-2">
            <VIcon
              :size="22"
              :icon="resolveUserRoleVariant(item.currentPlan).icon"
              :color="resolveUserRoleVariant(item.currentPlan).color"
            />
            <div class="text-capitalize text-high-emphasis text-body-1">
              {{ item.currentPlan }}
            </div>
          </div>
        </template>

        <!-- 👉 Property -->
        <template #item.property="{ item }">
          <div class="text-body-1 text-high-emphasis">
            {{ item.property }}
          </div>
        </template>

        <!-- 👉 Status -->
        <template #item.status="{ item }">
          <StatusBadge
            :status="item.status"
            entity-type="user"
            @click="openStatusChangeDialog(item)"
          />
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn :to="{ name: 'apps-user-view-id', params: { id: item.id } }">
            <VIcon icon="tabler-eye" />
            <VTooltip
              activator="parent"
              location="top"
            >
              View User
            </VTooltip>
          </IconBtn>

          <IconBtn @click="openAssignRoleDialog(item.id)">
            <VIcon icon="tabler-shield-plus" />
            <VTooltip
              activator="parent"
              location="top"
            >
              Assign Role
            </VTooltip>
          </IconBtn>

          <IconBtn :to="{ name: 'apps-user-view-id', params: { id: item.id } }">
            <VIcon icon="tabler-pencil" />
            <VTooltip
              activator="parent"
              location="top"
            >
              Edit User
            </VTooltip>
          </IconBtn>

          <IconBtn @click="openStatusChangeDialog(item)">
            <VIcon icon="tabler-replace" />
            <VTooltip
              activator="parent"
              location="top"
            >
              Change Status
            </VTooltip>
          </IconBtn>

          <IconBtn @click="openDeleteDialog(item)">
            <VIcon icon="tabler-trash" />
            <VTooltip
              activator="parent"
              location="top"
            >
              Delete User
            </VTooltip>
          </IconBtn>
        </template>

        <!-- pagination -->
        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalUsers"
          />
        </template>
      </VDataTableServer>
      <!-- SECTION -->
    </VCard>
    <!-- 👉 Add New User -->
    <AddNewUserDrawer
      v-model:is-drawer-open="isAddNewUserDrawerVisible"
      @user-data="addNewUser"
    />

    <!-- 👉 Assign Role Dialog -->
    <AssignRoleDialog
      v-model:is-dialog-visible="isAssignRoleDialogVisible"
      :user-id="selectedUserForRole"
      @role-assigned="handleRoleAssigned"
    />

    <!-- 👉 Status Change Dialog -->
    <StatusChangeDialog
      v-model:is-open="isStatusChangeDialogVisible"
      entity-type="user"
      :entity-id="selectedUser?.id"
      :current-status="selectedUser?.status"
      :entity-name="selectedUser?.fullName"
      @status-changed="handleStatusChanged"
    />

    <!-- 👉 Delete Confirmation Dialog -->
    <VDialog
      v-model="isDeleteDialogVisible"
      max-width="500"
    >
      <VCard>
        <VCardText class="text-center px-10 py-6">
          <VBtn
            icon
            variant="outlined"
            color="warning"
            class="my-4"
            style="block-size: 88px; inline-size: 88px; pointer-events: none;"
          >
            <VIcon
              icon="tabler-exclamation-circle"
              size="56"
            />
          </VBtn>

          <h6 class="text-h6 mb-4">
            {{ $t('userList.deleteDialog.title') }}
          </h6>

          <p class="text-body-1 mb-6">
            {{ $t('userList.deleteDialog.message', { name: userToDelete?.name || '' }) }}
          </p>

          <div class="d-flex gap-4 justify-center">
            <VBtn
              color="secondary"
              variant="tonal"
              @click="cancelDelete"
            >
              {{ $t('userList.deleteDialog.cancel') }}
            </VBtn>

            <VBtn
              color="error"
              variant="elevated"
              @click="deleteUser"
            >
              {{ $t('userList.deleteDialog.confirm') }}
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- 👉 Bulk Delete Confirmation Dialog -->
    <VDialog
      v-model="isBulkDeleteDialogVisible"
      max-width="500"
    >
      <VCard>
        <VCardText class="text-center px-10 py-6">
          <VIcon
            icon="tabler-trash"
            color="error"
            size="56"
            class="my-4"
          />

          <h6 class="text-h6 mb-4">
            Delete Multiple Users
          </h6>

          <p class="text-body-1 mb-6">
            Are you sure you want to delete <strong>{{ selectedRows.length }}</strong>
            {{ selectedRows.length === 1 ? 'user' : 'users' }}?
            This action cannot be undone.
          </p>

          <VAlert
            color="warning"
            variant="tonal"
            class="mb-6 text-start"
          >
            <div class="text-body-2">
              You are about to permanently delete <strong>{{ selectedRows.length }}</strong>
              {{ selectedRows.length === 1 ? 'user' : 'users' }}.
              This will remove all associated data.
            </div>
          </VAlert>

          <div class="d-flex gap-4 justify-center">
            <VBtn
              color="error"
              variant="elevated"
              @click="bulkDeleteUsers"
            >
              Delete All
            </VBtn>

            <VBtn
              color="secondary"
              variant="tonal"
              @click="cancelBulkDelete"
            >
              Cancel
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- 👉 Bulk Status Update Dialog -->
    <VDialog
      v-model="isBulkStatusUpdateDialogVisible"
      max-width="600"
    >
      <VCard>
        <VCardTitle class="text-h5 pa-6">
          <div class="d-flex align-center gap-2">
            <VIcon
              icon="tabler-replace"
              size="24"
              color="warning"
            />
            Update Status for {{ selectedRows.length }} {{ selectedRows.length === 1 ? 'User' : 'Users' }}
          </div>
        </VCardTitle>

        <VDivider />

        <VCardText class="pa-6">
          <VRow>
            <VCol cols="12">
              <VAlert
                color="info"
                variant="tonal"
                class="mb-4"
              >
                <div class="text-body-2">
                  You are about to update the status for <strong>{{ selectedRows.length }}</strong>
                  {{ selectedRows.length === 1 ? 'user' : 'users' }}.
                </div>
              </VAlert>
            </VCol>

            <!-- New Status -->
            <VCol cols="12">
              <AppSelect
                v-model="bulkStatusForm.newStatus"
                label="New Status *"
                placeholder="Select new status"
                :items="statusOptions"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-flag" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Reason -->
            <VCol cols="12">
              <AppTextarea
                v-model="bulkStatusForm.reason"
                label="Reason (Optional)"
                placeholder="Enter reason for status change"
                rows="3"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-message-circle" />
                </template>
              </AppTextarea>
            </VCol>
          </VRow>
        </VCardText>

        <VDivider />

        <VCardActions class="pa-6">
          <VSpacer />
          <VBtn
            color="secondary"
            variant="tonal"
            @click="cancelBulkStatusUpdate"
          >
            Cancel
          </VBtn>
          <VBtn
            color="warning"
            variant="elevated"
            :disabled="!bulkStatusForm.newStatus"
            @click="bulkUpdateStatus"
          >
            Update All
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 👉 Snackbar for notifications -->
    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="top end"
      :timeout="4000"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </section>
</template>
