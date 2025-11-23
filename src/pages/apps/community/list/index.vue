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

// 👉 i18n
const { t } = useI18n()

// 👉 Store
const searchQuery = ref('')
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
const headers = [
  { title: 'ID', key: 'id' },
  { title: 'Properties', key: 'property_count', sortable: false },
  { title: 'Name', key: 'name' },
  { title: 'City', key: 'city' },
  { title: 'Country', key: 'country' },
  { title: 'Status', key: 'status' },
  { title: 'Actions', key: 'actions', sortable: false },
]

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
        status,
        status_changed_at,
        status_changed_by,
        status_reason,
        seasonal_reopening_date,
        maintenance_expected_completion,
        property:property(count)
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

    // Transform data to include property_count
    communities.value = (data || []).map(community => ({
      ...community,
      property_count: community.property?.[0]?.count || 0
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

// Bulk status update state
const bulkStatusForm = ref({
  newStatus: '',
  reason: '',
})

// Status filter options
const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Under Construction', value: 'under-construction' },
  { title: 'Pre-Launch', value: 'pre-launch' },
  { title: 'Full Capacity', value: 'full-capacity' },
  { title: 'Maintenance', value: 'maintenance' },
  { title: 'Seasonal Closure', value: 'seasonal-closure' },
  { title: 'Inactive', value: 'inactive' },
  { title: 'Archived', value: 'archived' },
]

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
const openDeleteDialog = (community: any) => {
  communityToDelete.value = { id: community.id, name: community.name || community.id }
  isDeleteDialogVisible.value = true
}

// 👉 Cancel delete
const cancelDelete = () => {
  isDeleteDialogVisible.value = false
  communityToDelete.value = null
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

// 👉 Delete community
const deleteCommunity = async () => {
  if (!communityToDelete.value) return

  const { id, name } = communityToDelete.value

  try {
    const { error } = await supabase
      .from('community')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting community:', error)

      let errorMessage = 'Failed to delete community'
      if (error.code === '23503') {
        errorMessage = 'Cannot delete this community because it has related properties or records'
      } else if (error.code === 'PGRST116') {
        errorMessage = 'You don\'t have permission to delete this community'
      }

      snackbar.value = {
        show: true,
        message: errorMessage,
        color: 'error',
      }

      isDeleteDialogVisible.value = false
      communityToDelete.value = null
      return
    }

    // Success
    snackbar.value = {
      show: true,
      message: `Community "${name}" has been deleted successfully`,
      color: 'success',
    }

    // Delete from selectedRows
    const index = selectedRows.value.findIndex(row => row === id)
    if (index !== -1)
      selectedRows.value.splice(index, 1)

    // Close dialog and clear selection
    isDeleteDialogVisible.value = false
    communityToDelete.value = null

    // Refetch communities
    fetchCommunities()
    fetchCommunityGrowth()
  } catch (err) {
    console.error('Error in deleteCommunity:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to delete community',
      color: 'error',
    }
    isDeleteDialogVisible.value = false
    communityToDelete.value = null
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
      title: 'Total Communities',
      value: totalCommunities.value.toLocaleString(),
      change: growthPercentage,
      desc: 'Last 30 days growth',
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
        <VCardTitle>Communities</VCardTitle>
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
              placeholder="Filter by ID"
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
              placeholder="Filter by City"
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
              placeholder="Filter by Country"
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
              placeholder="Search communities..."
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
            variant="tonal"
            color="secondary"
            prepend-icon="tabler-download"
          >
            Import
          </VBtn>

          <!-- 👉 Add community button -->
          <VBtn
            prepend-icon="tabler-plus"
            @click="openAddCommunityDialog"
          >
            Add Community
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
            @click="openStatusChangeDialog(item)"
          />
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn @click="openViewCommunityDialog(item)">
            <VIcon icon="tabler-eye" />
            <VTooltip
              activator="parent"
              location="top"
            >
              View Community
            </VTooltip>
          </IconBtn>

          <IconBtn @click="openEditCommunityDialog(item)">
            <VIcon icon="tabler-pencil" />
            <VTooltip
              activator="parent"
              location="top"
            >
              Edit Community
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
              Delete Community
            </VTooltip>
          </IconBtn>
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
            Delete Community
          </h6>

          <p class="text-body-1 mb-6">
            Are you sure you want to delete <strong>{{ communityToDelete?.name }}</strong>? This action cannot be undone.
          </p>

          <div class="d-flex gap-4 justify-center">
            <VBtn
              color="secondary"
              variant="tonal"
              @click="cancelDelete"
            >
              Cancel
            </VBtn>

            <VBtn
              color="error"
              variant="elevated"
              @click="deleteCommunity"
            >
              Delete
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
            Delete Multiple Communities
          </h6>

          <p class="text-body-1 mb-6">
            Are you sure you want to delete <strong>{{ selectedRows.length }}</strong>
            {{ selectedRows.length === 1 ? 'community' : 'communities' }}?
            This action cannot be undone.
          </p>

          <VAlert
            color="warning"
            variant="tonal"
            class="mb-6 text-start"
          >
            <div class="text-body-2">
              You are about to permanently delete <strong>{{ selectedRows.length }}</strong>
              {{ selectedRows.length === 1 ? 'community' : 'communities' }}.
              This will remove all associated data.
            </div>
          </VAlert>

          <div class="d-flex gap-4 justify-center">
            <VBtn
              color="error"
              variant="elevated"
              @click="bulkDeleteCommunities"
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
            Update Status for {{ selectedRows.length }} {{ selectedRows.length === 1 ? 'Community' : 'Communities' }}
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
                  {{ selectedRows.length === 1 ? 'community' : 'communities' }}.
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
