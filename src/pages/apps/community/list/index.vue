<script setup lang="ts">
import { supabase } from '@/lib/supabase'
import { useI18n } from 'vue-i18n'
import AddEditCommunityDialog from '@/components/dialogs/AddEditCommunityDialog.vue'
import ViewCommunityDialog from '@/components/dialogs/ViewCommunityDialog.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import StatusChangeDialog from '@/components/StatusChangeDialog.vue'

definePage({
  meta: {
    public: false, // Requires authentication
  },
})

// 👉 User data for permission checks
const userData = useCookie<any>('userData')

// Check if user can add/edit/delete (not Guard or Resident)
const canManage = computed(() => {
  const role = userData.value?.role
  return role && !['Guard', 'Resident'].includes(role)
})

// Check if user is Super Admin (only Super Admin can add communities)
const isSuperAdmin = computed(() => {
  return userData.value?.role === 'Super Admin'
})

// 👉 i18n
const { t } = useI18n()

// 👉 Route for URL search params
const route = useRoute()

// 👉 Store
const searchQuery = ref((route.query.search as string) || '')
const selectedId = ref()
const selectedCity = ref()
const selectedCountry = ref()
const selectedStatus = ref()

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
  { title: t('communityList.table.id'), key: 'id' },
  { title: t('communityList.table.properties'), key: 'property_count', sortable: false },
  { title: t('communityList.table.name'), key: 'name' },
  { title: t('communityList.table.city'), key: 'city' },
  { title: t('communityList.table.country'), key: 'country' },
  { title: t('communityList.table.status'), key: 'status' },
  { title: t('communityList.table.actions'), key: 'actions', sortable: false },
])

// 👉 Fetching communities from Supabase
const communities = ref([])
const totalCommunities = ref(0)
const communitiesLast30Days = ref(0)
const isLoading = ref(false)

const fetchCommunities = async () => {
  try {
    isLoading.value = true

    // Build query for Supabase with all fields and property count
    let query = supabase
      .from('community')
      .select(`
        id,
        name,
        address,
        city,
        state,
        postal_code,
        country,
        geolocation,
        googlemaps,
        created_at,
        updated_at,
        created_by,
        status,
        status_changed_at,
        status_changed_by,
        status_reason,
        seasonal_reopening_date,
        maintenance_expected_completion,
        property:property(count),
        creator:profile!created_by(id, display_name, email)
      `, { count: 'exact' })

    // Apply search filter
    if (searchQuery.value) {
      query = query.or(`id.ilike.%${searchQuery.value}%,name.ilike.%${searchQuery.value}%,city.ilike.%${searchQuery.value}%,country.ilike.%${searchQuery.value}%`)
    }

    // Apply ID filter
    if (selectedId.value) {
      query = query.eq('id', selectedId.value)
    }

    // Apply city filter
    if (selectedCity.value) {
      query = query.eq('city', selectedCity.value)
    }

    // Apply country filter
    if (selectedCountry.value) {
      query = query.eq('country', selectedCountry.value)
    }

    // Apply status filter
    if (selectedStatus.value) {
      query = query.eq('status', selectedStatus.value)
    }

    // Apply sorting
    if (sortBy.value) {
      query = query.order(sortBy.value, { ascending: orderBy.value !== 'desc' })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    const from = (page.value - 1) * itemsPerPage.value
    const to = from + itemsPerPage.value - 1

    if (itemsPerPage.value !== -1) {
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching communities from Supabase:', error)
      return
    }

    // Transform data to include property_count and creator
    communities.value = (data || []).map(community => ({
      ...community,
      property_count: community.property?.[0]?.count || 0,
      creator: community.creator || null
    }))
    totalCommunities.value = count || 0
  } catch (err) {
    console.error('Error in fetchCommunities:', err)
  } finally {
    isLoading.value = false
  }
}

// Fetch communities created in last 30 days for growth calculation
const fetchCommunityGrowth = async () => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count, error } = await supabase
      .from('community')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (error) {
      console.error('Error fetching community growth:', error)
      return
    }

    communitiesLast30Days.value = count || 0
  } catch (err) {
    console.error('Error in fetchCommunityGrowth:', err)
  }
}

// Filter options
const communityIds = ref([])
const cities = ref([])
const countries = ref([])

// Fetch unique community IDs for filter
const fetchCommunityIds = async () => {
  try {
    const { data, error } = await supabase
      .from('community')
      .select('id')
      .order('id')

    if (error) {
      console.error('Error fetching community IDs:', error)
      return
    }

    communityIds.value = data?.map(community => ({
      title: community.id,
      value: community.id,
    })) || []
  } catch (err) {
    console.error('Error in fetchCommunityIds:', err)
  }
}

// Fetch unique cities for filter
const fetchCities = async () => {
  try {
    const { data, error } = await supabase
      .from('community')
      .select('city')
      .order('city')

    if (error) {
      console.error('Error fetching cities:', error)
      return
    }

    // Get unique cities
    const uniqueCities = [...new Set(data?.map(c => c.city).filter(Boolean))]
    cities.value = uniqueCities.map(city => ({
      title: city,
      value: city,
    }))
  } catch (err) {
    console.error('Error in fetchCities:', err)
  }
}

// Fetch unique countries for filter
const fetchCountries = async () => {
  try {
    const { data, error } = await supabase
      .from('community')
      .select('country')
      .order('country')

    if (error) {
      console.error('Error fetching countries:', error)
      return
    }

    // Get unique countries
    const uniqueCountries = [...new Set(data?.map(c => c.country).filter(Boolean))]
    countries.value = uniqueCountries.map(country => ({
      title: country,
      value: country,
    }))
  } catch (err) {
    console.error('Error in fetchCountries:', err)
  }
}

// Fetch communities on mount
onMounted(() => {
  fetchCommunities()
  fetchCommunityGrowth()
  fetchCommunityIds()
  fetchCities()
  fetchCountries()
})

// Watch for filter changes
watch([searchQuery, selectedId, selectedCity, selectedCountry, selectedStatus, page, itemsPerPage, sortBy, orderBy], () => {
  fetchCommunities()
})

// Watch for URL search param changes (when navigating from global search)
watch(() => route.query.search, (newSearch) => {
  searchQuery.value = (newSearch as string) || ''
})

// 👉 Dialogs state
const isAddCommunityDialogVisible = ref(false)
const isEditCommunityDialogVisible = ref(false)
const isViewCommunityDialogVisible = ref(false)
const isDeleteDialogVisible = ref(false)
const isBulkDeleteDialogVisible = ref(false)
const isBulkStatusUpdateDialogVisible = ref(false)
const isStatusChangeDialogVisible = ref(false)
const selectedCommunity = ref<any>(null)
const communityToDelete = ref<{ id: string; name: string } | null>(null)
const snackbar = ref({ show: false, message: '', color: 'success' })

// Deletion preview state
const deletionPreview = ref<{
  visitor_records: number
  devices: number
  properties: number
  managers: number
  property_owners: number
  notification_users: number
} | null>(null)
const isLoadingPreview = ref(false)
const isDeleting = ref(false)

// Bulk status update state
const bulkStatusForm = ref({
  newStatus: '',
  reason: '',
})

// Status filter options
const statusOptions = computed(() => [
  { title: t('communityList.status.active'), value: 'active' },
  { title: t('communityList.status.underConstruction'), value: 'under-construction' },
  { title: t('communityList.status.preLaunch'), value: 'pre-launch' },
  { title: t('communityList.status.fullCapacity'), value: 'full-capacity' },
  { title: t('communityList.status.maintenance'), value: 'maintenance' },
  { title: t('communityList.status.seasonalClosure'), value: 'seasonal-closure' },
  { title: t('communityList.status.inactive'), value: 'inactive' },
  { title: t('communityList.status.archived'), value: 'archived' },
])

// Computed property for bulk delete button visibility
const hasSelectedRows = computed(() => selectedRows.value.length > 0)

// 👉 Open add community dialog
const openAddCommunityDialog = () => {
  selectedCommunity.value = null
  isAddCommunityDialogVisible.value = true
}

// 👉 Open view community dialog
const openViewCommunityDialog = (community: any) => {
  selectedCommunity.value = { ...community }
  isViewCommunityDialogVisible.value = true
}

// 👉 Open edit community dialog
const openEditCommunityDialog = (community: any) => {
  selectedCommunity.value = { ...community }
  isEditCommunityDialogVisible.value = true
}

// 👉 Open status change dialog
const openStatusChangeDialog = (community: any) => {
  selectedCommunity.value = { ...community }
  isStatusChangeDialogVisible.value = true
}

// 👉 Handle status changed
const handleStatusChanged = () => {
  fetchCommunities()
  snackbar.value = {
    show: true,
    message: 'Community status updated successfully',
    color: 'success',
  }
}

// 👉 Open delete confirmation dialog
const openDeleteDialog = async (community: any) => {
  communityToDelete.value = { id: community.id, name: community.name || community.id }
  deletionPreview.value = null
  isLoadingPreview.value = true
  isDeleteDialogVisible.value = true

  try {
    const { data, error } = await supabase.rpc('get_community_deletion_preview', {
      community_id_param: community.id,
    })

    if (error) {
      console.error('Error fetching deletion preview:', error)
    }
    else {
      deletionPreview.value = data
    }
  }
  catch (err) {
    console.error('Error in openDeleteDialog:', err)
  }
  finally {
    isLoadingPreview.value = false
  }
}

// 👉 Cancel delete
const cancelDelete = () => {
  isDeleteDialogVisible.value = false
  communityToDelete.value = null
  deletionPreview.value = null
}

// 👉 Handle community saved
const handleCommunitySaved = () => {
  fetchCommunities()
  fetchCommunityGrowth()
  fetchCommunityIds()
  fetchCities()
  fetchCountries()

  snackbar.value = {
    show: true,
    message: 'Community saved successfully',
    color: 'success',
  }
}

// 👉 Delete community (cascade delete with audit)
const deleteCommunity = async () => {
  if (!communityToDelete.value) return

  const { id, name } = communityToDelete.value
  isDeleting.value = true

  try {
    const { data, error } = await supabase.rpc('delete_community_cascade', {
      community_id_param: id,
    })

    if (error) {
      console.error('Error deleting community:', error)

      let errorMessage = t('communityList.deleteError.generic')
      if (error.message?.includes('Super Admin')) {
        errorMessage = t('communityList.deleteError.noPermission')
      }
      else if (error.message?.includes('not found')) {
        errorMessage = t('communityList.deleteError.notFound')
      }

      snackbar.value = {
        show: true,
        message: errorMessage,
        color: 'error',
      }

      isDeleteDialogVisible.value = false
      communityToDelete.value = null
      deletionPreview.value = null
      isDeleting.value = false
      return
    }

    // Success - show what was deleted
    const counts = data?.counts || {}
    const deletedItems = []
    if (counts.properties > 0) deletedItems.push(`${counts.properties} ${t('communityList.deleteDialog.propertiesLabel')}`)
    if (counts.devices > 0) deletedItems.push(`${counts.devices} ${t('communityList.deleteDialog.devicesLabel')}`)
    if (counts.visitor_records > 0) deletedItems.push(`${counts.visitor_records} ${t('communityList.deleteDialog.visitorsLabel')}`)

    const successMessage = deletedItems.length > 0
      ? t('communityList.deleteSuccess.withData', { name, items: deletedItems.join(', ') })
      : t('communityList.deleteSuccess.simple', { name })

    snackbar.value = {
      show: true,
      message: successMessage,
      color: 'success',
    }

    // Delete from selectedRows
    const index = selectedRows.value.findIndex(row => row === id)
    if (index !== -1)
      selectedRows.value.splice(index, 1)

    // Close dialog and clear selection
    isDeleteDialogVisible.value = false
    communityToDelete.value = null
    deletionPreview.value = null

    // Refetch communities
    fetchCommunities()
    fetchCommunityGrowth()
  }
  catch (err) {
    console.error('Error in deleteCommunity:', err)
    snackbar.value = {
      show: true,
      message: t('communityList.deleteError.generic'),
      color: 'error',
    }
    isDeleteDialogVisible.value = false
    communityToDelete.value = null
    deletionPreview.value = null
  }
  finally {
    isDeleting.value = false
  }
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

// 👉 Bulk delete communities
const bulkDeleteCommunities = async () => {
  if (selectedRows.value.length === 0) return

  try {
    let successCount = 0
    let errorCount = 0

    // Delete each selected community
    for (const communityId of selectedRows.value) {
      try {
        const { error } = await supabase
          .from('community')
          .delete()
          .eq('id', communityId)

        if (error) {
          errorCount++
        } else {
          successCount++
        }
      } catch (err: any) {
        errorCount++
      }
    }

    // Show result message
    if (errorCount === 0) {
      snackbar.value = {
        show: true,
        message: `Successfully deleted ${successCount} ${successCount === 1 ? 'community' : 'communities'}`,
        color: 'success',
      }
    } else if (successCount === 0) {
      snackbar.value = {
        show: true,
        message: `Failed to delete ${errorCount} ${errorCount === 1 ? 'community' : 'communities'}`,
        color: 'error',
      }
    } else {
      snackbar.value = {
        show: true,
        message: `Deleted ${successCount} ${successCount === 1 ? 'community' : 'communities'}, ${errorCount} failed`,
        color: 'warning',
      }
    }

    // Clear selection
    selectedRows.value = []

    // Refetch communities
    fetchCommunities()
    fetchCommunityGrowth()

    // Close dialog
    isBulkDeleteDialogVisible.value = false
  } catch (err) {
    console.error('Error in bulkDeleteCommunities:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to delete communities',
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

    // Update each selected community
    for (const communityId of selectedRows.value) {
      try {
        const { error } = await supabase
          .from('community')
          .update({
            status: bulkStatusForm.value.newStatus,
            status_changed_at: new Date().toISOString(),
            status_changed_by: userId,
            status_reason: bulkStatusForm.value.reason || null,
          })
          .eq('id', communityId)

        if (error) {
          errorCount++
          console.error(`Failed to update community ${communityId}:`, error)
        } else {
          successCount++
        }
      } catch (err: any) {
        errorCount++
        console.error(`Failed to update community ${communityId}:`, err)
      }
    }

    // Show result message
    if (errorCount === 0) {
      snackbar.value = {
        show: true,
        message: `Successfully updated status for ${successCount} ${successCount === 1 ? 'community' : 'communities'}`,
        color: 'success',
      }
    } else if (successCount === 0) {
      snackbar.value = {
        show: true,
        message: `Failed to update status for ${errorCount} ${errorCount === 1 ? 'community' : 'communities'}`,
        color: 'error',
      }
    } else {
      snackbar.value = {
        show: true,
        message: `Updated ${successCount} ${successCount === 1 ? 'community' : 'communities'}, ${errorCount} failed`,
        color: 'warning',
      }
    }

    // Clear selection
    selectedRows.value = []

    // Refetch communities
    fetchCommunities()

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
      message: 'Failed to update community statuses',
      color: 'error',
    }

    isBulkStatusUpdateDialogVisible.value = false
  }
}

const widgetData = computed(() => {
  // Calculate growth percentage based on communities created in last 30 days
  const growthPercentage = totalCommunities.value > 0 && communitiesLast30Days.value > 0
    ? Math.round((communitiesLast30Days.value / totalCommunities.value) * 100)
    : 0

  return [
    {
      title: t('communityList.widgets.totalCommunities'),
      value: totalCommunities.value.toLocaleString(),
      change: growthPercentage,
      desc: t('communityList.widgets.last30DaysGrowth'),
      icon: 'tabler-building-community',
      iconColor: 'primary'
    },
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
        <VCardTitle>{{ t('communityList.title') }}</VCardTitle>
      </VCardItem>

      <VCardText>
        <VRow>
          <!-- 👉 Filter by ID -->
          <VCol
            cols="12"
            sm="3"
          >
            <AppSelect
              v-model="selectedId"
              :placeholder="t('communityList.filters.filterById')"
              :items="communityIds"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
          <!-- 👉 Filter by City -->
          <VCol
            cols="12"
            sm="3"
          >
            <AppSelect
              v-model="selectedCity"
              :placeholder="t('communityList.filters.filterByCity')"
              :items="cities"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
          <!-- 👉 Filter by Country -->
          <VCol
            cols="12"
            sm="3"
          >
            <AppSelect
              v-model="selectedCountry"
              :placeholder="t('communityList.filters.filterByCountry')"
              :items="countries"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
          <!-- 👉 Filter by Status -->
          <VCol
            cols="12"
            sm="3"
          >
            <AppSelect
              v-model="selectedStatus"
              :placeholder="t('communityList.filters.filterByStatus')"
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
            v-if="hasSelectedRows && canManage"
            variant="tonal"
            color="warning"
            prepend-icon="tabler-replace"
            @click="openBulkStatusUpdateDialog"
          >
            {{ t('communityList.buttons.updateStatus') }} ({{ selectedRows.length }})
          </VBtn>

          <!-- 👉 Bulk Delete button (shown when items are selected) -->
          <VBtn
            v-if="hasSelectedRows && canManage"
            variant="tonal"
            color="error"
            prepend-icon="tabler-trash"
            @click="openBulkDeleteDialog"
          >
            {{ t('communityList.buttons.delete') }} ({{ selectedRows.length }})
          </VBtn>
        </div>
        <VSpacer />

        <div class="app-user-search-filter d-flex align-center flex-wrap gap-4">
          <!-- 👉 Search  -->
          <div style="inline-size: 15.625rem;">
            <AppTextField
              v-model="searchQuery"
              :placeholder="t('communityList.search.placeholder')"
              clearable
              clear-icon="tabler-x"
            />
          </div>

          <!-- 👉 Refresh button -->
          <VBtn
            variant="tonal"
            color="default"
            icon="tabler-refresh"
            @click="fetchCommunities"
          />

          <!-- 👉 Import button -->
          <VBtn
            v-if="canManage"
            variant="tonal"
            color="secondary"
            prepend-icon="tabler-download"
          >
            {{ t('communityList.buttons.import') }}
          </VBtn>

          <!-- 👉 Add community button (Super Admin only) -->
          <VBtn
            v-if="isSuperAdmin"
            prepend-icon="tabler-plus"
            @click="openAddCommunityDialog"
          >
            {{ t('communityList.buttons.addCommunity') }}
          </VBtn>
        </div>
      </VCardText>

      <VDivider />

      <!-- SECTION datatable -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:model-value="selectedRows"
        v-model:page="page"
        :items="communities"
        item-value="id"
        :items-length="totalCommunities"
        :headers="headers"
        :loading="isLoading"
        class="text-no-wrap"
        show-select
        @update:options="updateOptions"
      >
        <!-- ID -->
        <template #item.id="{ item }">
          <div class="text-body-1 text-high-emphasis font-weight-medium">
            {{ item.id }}
          </div>
        </template>

        <!-- Property Count -->
        <template #item.property_count="{ item }">
          <div class="text-center">
            <VChip
              color="primary"
              size="small"
              label
            >
              {{ item.property_count }}
            </VChip>
          </div>
        </template>

        <!-- Name -->
        <template #item.name="{ item }">
          <div class="text-body-1 text-high-emphasis">
            {{ item.name || 'N/A' }}
          </div>
        </template>

        <!-- City -->
        <template #item.city="{ item }">
          <div class="text-body-1">
            {{ item.city || 'N/A' }}
          </div>
        </template>

        <!-- Country -->
        <template #item.country="{ item }">
          <div class="text-body-1">
            {{ item.country || 'N/A' }}
          </div>
        </template>

        <!-- Status -->
        <template #item.status="{ item }">
          <StatusBadge
            :status="item.status"
            entity-type="community"
            :style="canManage ? 'cursor: pointer' : ''"
            @click="canManage && openStatusChangeDialog(item)"
          />
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div class="d-flex">
            <IconBtn
              size="small"
              @click="openViewCommunityDialog(item)"
            >
              <VIcon
                icon="tabler-eye"
                size="20"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('communityList.actions.view') }}
              </VTooltip>
            </IconBtn>

            <IconBtn
              v-if="canManage"
              size="small"
              @click="openEditCommunityDialog(item)"
            >
              <VIcon
                icon="tabler-pencil"
                size="20"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('communityList.actions.edit') }}
              </VTooltip>
            </IconBtn>

            <IconBtn
              v-if="canManage"
              size="small"
              @click="openStatusChangeDialog(item)"
            >
              <VIcon
                icon="tabler-replace"
                size="20"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('communityList.actions.changeStatus') }}
              </VTooltip>
            </IconBtn>

            <IconBtn
              v-if="canManage"
              size="small"
              @click="openDeleteDialog(item)"
            >
              <VIcon
                icon="tabler-trash"
                size="20"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('communityList.actions.delete') }}
              </VTooltip>
            </IconBtn>
          </div>
        </template>

        <!-- pagination -->
        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalCommunities"
          />
        </template>
      </VDataTableServer>
      <!-- SECTION -->
    </VCard>

    <!-- 👉 Add Community Dialog -->
    <AddEditCommunityDialog
      v-model:is-dialog-visible="isAddCommunityDialogVisible"
      @community-saved="handleCommunitySaved"
    />

    <!-- 👉 Edit Community Dialog -->
    <AddEditCommunityDialog
      v-model:is-dialog-visible="isEditCommunityDialogVisible"
      :community-data="selectedCommunity"
      @community-saved="handleCommunitySaved"
    />

    <!-- 👉 View Community Dialog -->
    <ViewCommunityDialog
      v-model:is-dialog-visible="isViewCommunityDialogVisible"
      :community-data="selectedCommunity"
    />

    <!-- 👉 Status Change Dialog -->
    <StatusChangeDialog
      v-model:is-open="isStatusChangeDialogVisible"
      entity-type="community"
      :entity-id="selectedCommunity?.id"
      :current-status="selectedCommunity?.status"
      :entity-name="selectedCommunity?.name"
      @status-changed="handleStatusChanged"
    />

    <!-- 👉 Delete Confirmation Dialog (Enhanced with Preview) -->
    <VDialog
      v-model="isDeleteDialogVisible"
      max-width="550"
      persistent
    >
      <VCard>
        <VCardText class="text-center px-10 py-6">
          <VIcon
            icon="tabler-alert-triangle"
            color="error"
            size="56"
            class="my-4"
          />

          <h6 class="text-h6 mb-4">
            {{ t('communityList.deleteDialog.title') }}
          </h6>

          <p class="text-body-1 mb-4">
            {{ t('communityList.deleteDialog.message', { name: communityToDelete?.name }) }}
          </p>

          <!-- Loading Preview -->
          <div
            v-if="isLoadingPreview"
            class="d-flex justify-center my-4"
          >
            <VProgressCircular
              indeterminate
              color="primary"
            />
          </div>

          <!-- Deletion Preview Warning -->
          <VAlert
            v-else-if="deletionPreview && (deletionPreview.properties > 0 || deletionPreview.devices > 0 || deletionPreview.visitor_records > 0 || deletionPreview.managers > 0)"
            color="error"
            variant="tonal"
            class="mb-4 text-start"
          >
            <div class="text-subtitle-2 font-weight-bold mb-2">
              {{ t('communityList.deleteDialog.warningTitle') }}
            </div>
            <ul class="ps-4 mb-0">
              <li v-if="deletionPreview.properties > 0">
                {{ t('communityList.deleteDialog.properties', { count: deletionPreview.properties }) }}
              </li>
              <li v-if="deletionPreview.devices > 0">
                {{ t('communityList.deleteDialog.devices', { count: deletionPreview.devices }) }}
              </li>
              <li v-if="deletionPreview.visitor_records > 0">
                {{ t('communityList.deleteDialog.visitors', { count: deletionPreview.visitor_records }) }}
              </li>
              <li v-if="deletionPreview.managers > 0">
                {{ t('communityList.deleteDialog.managers', { count: deletionPreview.managers }) }}
              </li>
              <li v-if="deletionPreview.property_owners > 0">
                {{ t('communityList.deleteDialog.propertyOwners', { count: deletionPreview.property_owners }) }}
              </li>
            </ul>
          </VAlert>

          <!-- No related data message -->
          <VAlert
            v-else-if="deletionPreview"
            color="info"
            variant="tonal"
            class="mb-4 text-start"
          >
            {{ t('communityList.deleteDialog.noRelatedData') }}
          </VAlert>

          <p class="text-body-2 text-error mb-6">
            {{ t('communityList.deleteDialog.permanentWarning') }}
          </p>

          <div class="d-flex gap-4 justify-center">
            <VBtn
              color="secondary"
              variant="tonal"
              :disabled="isDeleting"
              @click="cancelDelete"
            >
              {{ t('communityList.deleteDialog.cancel') }}
            </VBtn>

            <VBtn
              color="error"
              variant="elevated"
              :loading="isDeleting"
              :disabled="isLoadingPreview"
              @click="deleteCommunity"
            >
              {{ t('communityList.deleteDialog.confirm') }}
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
            {{ t('communityList.bulkDeleteDialog.title') }}
          </h6>

          <p class="text-body-1 mb-6">
            {{ t('communityList.bulkDeleteDialog.message', { count: selectedRows.length, entity: selectedRows.length === 1 ? t('community') : t('communities') }) }}
          </p>

          <VAlert
            color="warning"
            variant="tonal"
            class="mb-6 text-start"
          >
            <div class="text-body-2">
              {{ t('communityList.bulkDeleteDialog.warning', { count: selectedRows.length, entity: selectedRows.length === 1 ? t('community') : t('communities') }) }}
            </div>
          </VAlert>

          <div class="d-flex gap-4 justify-center">
            <VBtn
              color="secondary"
              variant="tonal"
              @click="cancelBulkDelete"
            >
              {{ t('communityList.bulkDeleteDialog.cancel') }}
            </VBtn>

            <VBtn
              color="error"
              variant="elevated"
              @click="bulkDeleteCommunities"
            >
              {{ t('communityList.bulkDeleteDialog.confirm') }}
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
            {{ t('communityList.bulkStatusDialog.title', { count: selectedRows.length, entity: selectedRows.length === 1 ? t('community') : t('communities') }) }}
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
                  {{ t('communityList.bulkStatusDialog.message', { count: selectedRows.length, entity: selectedRows.length === 1 ? t('community') : t('communities') }) }}
                </div>
              </VAlert>
            </VCol>

            <!-- New Status -->
            <VCol cols="12">
              <AppSelect
                v-model="bulkStatusForm.newStatus"
                :label="t('communityList.bulkStatusDialog.newStatus')"
                :placeholder="t('communityList.bulkStatusDialog.selectStatus')"
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
                :label="t('communityList.bulkStatusDialog.reason')"
                :placeholder="t('communityList.bulkStatusDialog.reasonPlaceholder')"
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
            {{ t('communityList.bulkStatusDialog.cancel') }}
          </VBtn>
          <VBtn
            color="warning"
            variant="elevated"
            :disabled="!bulkStatusForm.newStatus"
            @click="bulkUpdateStatus"
          >
            {{ t('communityList.bulkStatusDialog.confirm') }}
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
