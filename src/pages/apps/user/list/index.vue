<script setup lang="ts">
import AddNewUserDrawer from '@/views/apps/user/list/AddNewUserDrawer.vue'
import type { UserProperties } from '@db/apps/users/types'
import { supabase } from '@/lib/supabase'
import { useI18n } from 'vue-i18n'

// 👉 i18n
const { t } = useI18n()

// 👉 Store
const searchQuery = ref('')
const selectedRole = ref()
const selectedCommunity = ref()
const selectedEnabled = ref()

// Data table options
const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()
const selectedRows = ref([])

// Update data table options
const updateOptions = (options: any) => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

// Headers
const headers = computed(() => [
  { title: t('userList.table.user'), key: 'user' },
  { title: t('userList.table.role'), key: 'plan' },
  { title: t('userList.table.community'), key: 'community' },
  { title: t('userList.table.property'), key: 'property' },
  { title: t('userList.table.enabled'), key: 'enabled' },
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

    // Build query for Supabase with role join
    let query = supabase
      .from('profile')
      .select(`
        id,
        display_name,
        email,
        enabled,
        def_community_id,
        def_property_id,
        profile_role(
          role:role_id(role_name)
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

    // Apply enabled filter
    if (selectedEnabled.value !== undefined && selectedEnabled.value !== null) {
      query = query.eq('enabled', selectedEnabled.value)
    }

    // Apply pagination
    const from = (page.value - 1) * itemsPerPage.value
    const to = from + itemsPerPage.value - 1

    if (itemsPerPage.value !== -1) {
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching users from Supabase:', error)
      return
    }

    // Transform and filter Supabase data
    let filteredData = data || []

    // Client-side role filter
    if (selectedRole.value) {
      filteredData = filteredData.filter(profile =>
        profile.profile_role?.[0]?.role?.role_name === selectedRole.value
      )
    }

    // Transform Supabase data to match UserProperties format
    users.value = filteredData.map((profile, index) => ({
      id: profile.id,
      fullName: profile.display_name || 'No Name',
      email: profile.email || 'No Email',
      currentPlan: profile.profile_role?.[0]?.role?.role_name || 'No Role',
      community: profile.def_community_id || 'N/A',
      property: profile.def_property_id || 'N/A',
      enabled: profile.enabled ? 'Active' : 'Inactive',
      avatar: null,
      role: profile.profile_role?.[0]?.role?.role_name || 'No Role',
      status: profile.enabled ? 'active' : 'inactive',
      billing: 'Auto Debit',
    }))

    totalUsers.value = count || 0
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
        profile_role(
          role:role_id(role_name)
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
watch([searchQuery, selectedRole, selectedCommunity, selectedEnabled, page, itemsPerPage], () => {
  fetchUsers()
})

// 👉 search filters
const roles = computed(() => [
  { title: t('userList.roles.superAdmin'), value: 'Super Admin' },
  { title: t('userList.roles.administrator'), value: 'Administrator' },
  { title: t('userList.roles.dealer'), value: 'Dealer' },
  { title: t('userList.roles.guard'), value: 'Guard' },
  { title: t('userList.roles.resident'), value: 'Resident' },
])

const communities = ref([])

const enabledOptions = computed(() => [
  { title: t('userList.filters.active'), value: true },
  { title: t('userList.filters.inactive'), value: false },
])

const resolveUserRoleVariant = (role: string) => {
  const roleLowerCase = role.toLowerCase()

  if (roleLowerCase === 'super admin' || roleLowerCase === 'superadmin')
    return { color: 'error', icon: 'tabler-crown' }
  if (roleLowerCase === 'administrator' || roleLowerCase === 'admin')
    return { color: 'primary', icon: 'tabler-shield-check' }
  if (roleLowerCase === 'dealer')
    return { color: 'warning', icon: 'tabler-briefcase' }
  if (roleLowerCase === 'guard')
    return { color: 'info', icon: 'tabler-shield-lock' }
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

// 👉 Add new user
const addNewUser = async (userData: UserProperties) => {
  await $api('/apps/users', {
    method: 'POST',
    body: userData,
  })

  // Refetch User
  fetchUsers()
}

// 👉 Delete user
const deleteUser = async (id: number) => {
  await $api(`/apps/users/${id}`, {
    method: 'DELETE',
  })

  // Delete from selectedRows
  const index = selectedRows.value.findIndex(row => row === id)
  if (index !== -1)
    selectedRows.value.splice(index, 1)

  // refetch User
  // TODO: Make this async
  fetchUsers()
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
          <!-- 👉 Filter by Enabled -->
          <VCol
            cols="12"
            sm="4"
          >
            <AppSelect
              v-model="selectedEnabled"
              :placeholder="$t('userList.filters.filterByEnabled')"
              :items="enabledOptions"
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

          <!-- 👉 Export button -->
          <VBtn
            variant="tonal"
            color="secondary"
            prepend-icon="tabler-upload"
          >
            {{ $t('userList.buttons.export') }}
          </VBtn>

          <!-- 👉 Add user button -->
          <VBtn
            prepend-icon="tabler-plus"
            @click="isAddNewUserDrawerVisible = true"
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

        <!-- 👉 Enabled -->
        <template #item.enabled="{ item }">
          <VChip
            :color="item.enabled === 'Active' ? 'success' : 'error'"
            size="small"
            label
            class="text-capitalize"
          >
            {{ item.enabled }}
          </VChip>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn :to="{ name: 'apps-user-view-id', params: { id: item.id } }">
            <VIcon icon="tabler-eye" />
          </IconBtn>

          <IconBtn>
            <VIcon icon="tabler-pencil" />
          </IconBtn>

          <IconBtn @click="deleteUser(item.id)">
            <VIcon icon="tabler-trash" />
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
  </section>
</template>
