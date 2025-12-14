<script setup lang="ts">
import { supabase } from '@/lib/supabase'
import { useI18n } from 'vue-i18n'
import AddEditPropertyDialog from '@/components/dialogs/AddEditPropertyDialog.vue'
import ViewPropertyDialog from '@/components/dialogs/ViewPropertyDialog.vue'
import ImportPropertyDialog from '@/components/dialogs/ImportPropertyDialog.vue'
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

// 👉 i18n
const { t } = useI18n()

// 👉 Route for URL search params
const route = useRoute()

// 👉 Store
const searchQuery = ref((route.query.search as string) || '')
const selectedCommunity = ref()
const selectedStatus = ref()

// Data table options
const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()
const selectedRows = ref([])

// Dialog state
const isAddPropertyDialogVisible = ref(false)
const isEditPropertyDialogVisible = ref(false)
const isViewPropertyDialogVisible = ref(false)
const isDeleteDialogVisible = ref(false)
const isBulkDeleteDialogVisible = ref(false)
const isBulkStatusUpdateDialogVisible = ref(false)
const isImportDialogVisible = ref(false)
const isStatusChangeDialogVisible = ref(false)
const selectedProperty = ref<any>(null)
const propertyToDelete = ref<{ id: string; name: string } | null>(null)
const snackbar = ref({ show: false, message: '', color: 'success' })

// Bulk status update state
const bulkStatusForm = ref({
  newStatus: '',
  reason: '',
})

// Status filter options
const statusOptions = computed(() => [
  { title: t('propertyList.status.active'), value: 'active' },
  { title: t('propertyList.status.vacant'), value: 'vacant' },
  { title: t('propertyList.status.accessRestricted'), value: 'access-restricted' },
  { title: t('propertyList.status.maintenance'), value: 'maintenance' },
  { title: t('propertyList.status.emergencyLockdown'), value: 'emergency-lockdown' },
  { title: t('propertyList.status.guestMode'), value: 'guest-mode' },
  { title: t('propertyList.status.outOfService'), value: 'out-of-service' },
  { title: t('propertyList.status.deactivated'), value: 'deactivated' },
  { title: t('propertyList.status.archived'), value: 'archived' },
])

// Computed property for bulk delete button visibility
const hasSelectedRows = computed(() => selectedRows.value.length > 0)

// Update data table options
const updateOptions = (options: any) => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

// Headers
const headers = computed(() => [
  { title: t('propertyList.table.community'), key: 'community_id' },
  { title: t('propertyList.table.propertyId'), key: 'id' },
  { title: t('propertyList.table.name'), key: 'name' },
  { title: t('propertyList.table.address'), key: 'address' },
  { title: t('propertyList.table.status'), key: 'status' },
  { title: t('propertyList.table.actions'), key: 'actions', sortable: false },
])

// 👉 Fetching properties from Supabase
const properties = ref([])
const totalProperties = ref(0)
const propertiesLast30Days = ref(0)
const isLoading = ref(false)

const fetchProperties = async () => {
  try {
    isLoading.value = true

    // Build query for Supabase with community join for view dialog
    let query = supabase
      .from('property')
      .select(`
        id,
        name,
        address,
        community_id,
        created_at,
        updated_at,
        status,
        status_changed_at,
        status_changed_by,
        status_reason,
        community:community_id (
          id,
          name,
          city,
          country
        )
      `, { count: 'exact' })

    // Apply search filter
    if (searchQuery.value) {
      query = query.or(`id.ilike.%${searchQuery.value}%,name.ilike.%${searchQuery.value}%,address.ilike.%${searchQuery.value}%,community_id.ilike.%${searchQuery.value}%`)
    }

    // Apply community filter
    if (selectedCommunity.value) {
      query = query.eq('community_id', selectedCommunity.value)
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
      console.error('Error fetching properties from Supabase:', error)
      return
    }

    properties.value = data || []
    totalProperties.value = count || 0
  } catch (err) {
    console.error('Error in fetchProperties:', err)
  } finally {
    isLoading.value = false
  }
}

// Fetch properties created in last 30 days for growth calculation
const fetchPropertyGrowth = async () => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count, error } = await supabase
      .from('property')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (error) {
      console.error('Error fetching property growth:', error)
      return
    }

    propertiesLast30Days.value = count || 0
  } catch (err) {
    console.error('Error in fetchPropertyGrowth:', err)
  }
}

// Fetch communities for filter
const communities = ref([])
const fetchCommunities = async () => {
  try {
    const { data, error } = await supabase
      .from('community')
      .select('id, name')
      .order('name')

    if (error) {
      console.error('Error fetching communities:', error)
      return
    }

    communities.value = data?.map(community => ({
      title: `${community.id}${community.name ? ' - ' + community.name : ''}`,
      value: community.id,
    })) || []
  } catch (err) {
    console.error('Error in fetchCommunities:', err)
  }
}

// Fetch properties on mount
onMounted(() => {
  fetchProperties()
  fetchPropertyGrowth()
  fetchCommunities()
})

// Watch for filter changes
watch([searchQuery, selectedCommunity, selectedStatus, page, itemsPerPage, sortBy, orderBy], () => {
  fetchProperties()
})

// Watch for URL search param changes (when navigating from global search)
watch(() => route.query.search, (newSearch) => {
  searchQuery.value = (newSearch as string) || ''
})

// 👉 Dialog handlers
const openAddPropertyDialog = () => {
  selectedProperty.value = null
  isAddPropertyDialogVisible.value = true
}

const openViewPropertyDialog = (property: any) => {
  selectedProperty.value = { ...property }
  isViewPropertyDialogVisible.value = true
}

const openEditPropertyDialog = (property: any) => {
  selectedProperty.value = { ...property }
  isEditPropertyDialogVisible.value = true
}

const openStatusChangeDialog = (property: any) => {
  selectedProperty.value = { ...property }
  isStatusChangeDialogVisible.value = true
}

const handleStatusChanged = () => {
  fetchProperties()
  snackbar.value = {
    show: true,
    message: 'Property status updated successfully',
    color: 'success',
  }
}

const openDeleteDialog = (property: any) => {
  propertyToDelete.value = { id: property.id, name: property.name || property.id }
  isDeleteDialogVisible.value = true
}

const openImportDialog = () => {
  isImportDialogVisible.value = true
}

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

const cancelDelete = () => {
  propertyToDelete.value = null
  isDeleteDialogVisible.value = false
}

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

const handlePropertySaved = () => {
  fetchProperties()
  fetchPropertyGrowth()
  snackbar.value = {
    show: true,
    message: 'Property saved successfully',
    color: 'success',
  }
}

const handleImportCompleted = () => {
  fetchProperties()
  fetchPropertyGrowth()
  snackbar.value = {
    show: true,
    message: 'Properties imported successfully',
    color: 'success',
  }
}

// 👉 Delete property
const deleteProperty = async () => {
  if (!propertyToDelete.value) return

  const { id, name } = propertyToDelete.value

  try {
    const { error } = await supabase
      .from('property')
      .delete()
      .eq('id', id)

    if (error) {
      let errorMessage = 'Failed to delete property'
      if (error.code === '23503') {
        errorMessage = 'Cannot delete this property because it has related records'
      } else if (error.code === 'PGRST116') {
        errorMessage = 'You don\'t have permission to delete this property'
      }

      snackbar.value = {
        show: true,
        message: errorMessage,
        color: 'error',
      }

      isDeleteDialogVisible.value = false
      propertyToDelete.value = null
      return
    }

    // Success
    snackbar.value = {
      show: true,
      message: `Property "${name}" has been deleted successfully`,
      color: 'success',
    }

    // Delete from selectedRows
    const index = selectedRows.value.findIndex(row => row === id)
    if (index !== -1)
      selectedRows.value.splice(index, 1)

    // Refetch properties
    fetchProperties()
    fetchPropertyGrowth()

    // Close dialog
    isDeleteDialogVisible.value = false
    propertyToDelete.value = null
  } catch (err) {
    console.error('Error in deleteProperty:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to delete property',
      color: 'error',
    }

    isDeleteDialogVisible.value = false
    propertyToDelete.value = null
  }
}

// 👉 Bulk delete properties
const bulkDeleteProperties = async () => {
  if (selectedRows.value.length === 0) return

  const totalToDelete = selectedRows.value.length

  try {
    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Delete each selected property
    for (const propertyId of selectedRows.value) {
      try {
        const { error } = await supabase
          .from('property')
          .delete()
          .eq('id', propertyId)

        if (error) {
          errorCount++
          errors.push(`Failed to delete property ${propertyId}: ${error.message}`)
        } else {
          successCount++
        }
      } catch (err: any) {
        errorCount++
        errors.push(`Failed to delete property ${propertyId}: ${err.message}`)
      }
    }

    // Show result message
    if (errorCount === 0) {
      snackbar.value = {
        show: true,
        message: `Successfully deleted ${successCount} ${successCount === 1 ? 'property' : 'properties'}`,
        color: 'success',
      }
    } else if (successCount === 0) {
      snackbar.value = {
        show: true,
        message: `Failed to delete ${errorCount} ${errorCount === 1 ? 'property' : 'properties'}`,
        color: 'error',
      }
    } else {
      snackbar.value = {
        show: true,
        message: `Deleted ${successCount} ${successCount === 1 ? 'property' : 'properties'}, ${errorCount} failed`,
        color: 'warning',
      }
    }

    // Clear selection
    selectedRows.value = []

    // Refetch properties
    fetchProperties()
    fetchPropertyGrowth()

    // Close dialog
    isBulkDeleteDialogVisible.value = false
  } catch (err) {
    console.error('Error in bulkDeleteProperties:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to delete properties',
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

    // Update each selected property
    for (const propertyId of selectedRows.value) {
      try {
        const { error } = await supabase
          .from('property')
          .update({
            status: bulkStatusForm.value.newStatus,
            status_changed_at: new Date().toISOString(),
            status_changed_by: userId,
            status_reason: bulkStatusForm.value.reason || null,
          })
          .eq('id', propertyId)

        if (error) {
          errorCount++
          console.error(`Failed to update property ${propertyId}:`, error)
        } else {
          successCount++
        }
      } catch (err: any) {
        errorCount++
        console.error(`Failed to update property ${propertyId}:`, err)
      }
    }

    // Show result message
    if (errorCount === 0) {
      snackbar.value = {
        show: true,
        message: `Successfully updated status for ${successCount} ${successCount === 1 ? 'property' : 'properties'}`,
        color: 'success',
      }
    } else if (successCount === 0) {
      snackbar.value = {
        show: true,
        message: `Failed to update status for ${errorCount} ${errorCount === 1 ? 'property' : 'properties'}`,
        color: 'error',
      }
    } else {
      snackbar.value = {
        show: true,
        message: `Updated ${successCount} ${successCount === 1 ? 'property' : 'properties'}, ${errorCount} failed`,
        color: 'warning',
      }
    }

    // Clear selection
    selectedRows.value = []

    // Refetch properties
    fetchProperties()

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
      message: 'Failed to update property statuses',
      color: 'error',
    }

    isBulkStatusUpdateDialogVisible.value = false
  }
}

const widgetData = computed(() => {
  // Calculate growth percentage based on properties created in last 30 days
  const growthPercentage = totalProperties.value > 0 && propertiesLast30Days.value > 0
    ? Math.round((propertiesLast30Days.value / totalProperties.value) * 100)
    : 0

  return [
    {
      title: t('propertyList.widgets.totalProperties'),
      value: totalProperties.value.toLocaleString(),
      change: growthPercentage,
      desc: t('propertyList.widgets.last30DaysGrowth'),
      icon: 'tabler-home',
      iconColor: 'success'
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
        <VCardTitle>{{ t('propertyList.title') }}</VCardTitle>
      </VCardItem>

      <VCardText>
        <VRow>
          <!-- 👉 Filter by Community -->
          <VCol
            cols="12"
            sm="6"
          >
            <AppSelect
              v-model="selectedCommunity"
              :placeholder="t('propertyList.filters.filterByCommunity')"
              :items="communities"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
          <!-- 👉 Filter by Status -->
          <VCol
            cols="12"
            sm="6"
          >
            <AppSelect
              v-model="selectedStatus"
              :placeholder="t('propertyList.filters.filterByStatus')"
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
            {{ t('propertyList.buttons.updateStatus') }} ({{ selectedRows.length }})
          </VBtn>

          <!-- 👉 Bulk Delete button (shown when items are selected) -->
          <VBtn
            v-if="hasSelectedRows && canManage"
            variant="tonal"
            color="error"
            prepend-icon="tabler-trash"
            @click="openBulkDeleteDialog"
          >
            {{ t('propertyList.buttons.delete') }} ({{ selectedRows.length }})
          </VBtn>
        </div>
        <VSpacer />

        <div class="app-user-search-filter d-flex align-center flex-wrap gap-4">
          <!-- 👉 Search  -->
          <div style="inline-size: 15.625rem;">
            <AppTextField
              v-model="searchQuery"
              :placeholder="t('propertyList.search.placeholder')"
              clearable
              clear-icon="tabler-x"
            />
          </div>

          <!-- 👉 Refresh button -->
          <VBtn
            variant="tonal"
            color="default"
            icon="tabler-refresh"
            @click="fetchProperties"
          />

          <!-- 👉 Import button -->
          <VBtn
            v-if="canManage"
            variant="tonal"
            color="secondary"
            prepend-icon="tabler-download"
            @click="openImportDialog"
          >
            {{ t('propertyList.buttons.import') }}
          </VBtn>

          <!-- 👉 Add property button -->
          <VBtn
            v-if="canManage"
            prepend-icon="tabler-plus"
            @click="openAddPropertyDialog"
          >
            {{ t('propertyList.buttons.addProperty') }}
          </VBtn>
        </div>
      </VCardText>

      <VDivider />

      <!-- SECTION datatable -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:model-value="selectedRows"
        v-model:page="page"
        :items="properties"
        item-value="id"
        :items-length="totalProperties"
        :headers="headers"
        :loading="isLoading"
        class="text-no-wrap"
        show-select
        @update:options="updateOptions"
      >
        <!-- Community -->
        <template #item.community_id="{ item }">
          <div class="text-body-1 text-high-emphasis font-weight-medium">
            {{ item.community_id || 'N/A' }}
          </div>
        </template>

        <!-- Property ID -->
        <template #item.id="{ item }">
          <div class="text-body-1 text-high-emphasis">
            {{ item.id }}
          </div>
        </template>

        <!-- Name -->
        <template #item.name="{ item }">
          <div class="text-body-1 text-high-emphasis">
            {{ item.name || 'N/A' }}
          </div>
        </template>

        <!-- Address -->
        <template #item.address="{ item }">
          <div
            v-if="item.address && item.address.length > 40"
            class="text-body-1 d-flex align-center gap-2"
          >
            <span>{{ item.address.substring(0, 40) }}...</span>
            <VTooltip
              activator="parent"
              location="top"
            >
              {{ item.address }}
            </VTooltip>
            <VIcon
              icon="tabler-info-circle"
              size="16"
              color="info"
            />
          </div>
          <div
            v-else
            class="text-body-1"
          >
            {{ item.address || 'N/A' }}
          </div>
        </template>

        <!-- Status -->
        <template #item.status="{ item }">
          <StatusBadge
            :status="item.status"
            entity-type="property"
            :style="canManage ? 'cursor: pointer' : ''"
            @click="canManage && openStatusChangeDialog(item)"
          />
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div class="d-flex">
            <IconBtn
              size="small"
              @click="openViewPropertyDialog(item)"
            >
              <VIcon
                icon="tabler-eye"
                size="20"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('propertyList.actions.view') }}
              </VTooltip>
            </IconBtn>

            <IconBtn
              v-if="canManage"
              size="small"
              @click="openEditPropertyDialog(item)"
            >
              <VIcon
                icon="tabler-pencil"
                size="20"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('propertyList.actions.edit') }}
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
                {{ t('propertyList.actions.changeStatus') }}
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
                {{ t('propertyList.actions.delete') }}
              </VTooltip>
            </IconBtn>
          </div>
        </template>

        <!-- pagination -->
        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalProperties"
          />
        </template>
      </VDataTableServer>
      <!-- SECTION -->
    </VCard>

    <!-- 👉 Add Property Dialog -->
    <AddEditPropertyDialog
      v-model:is-dialog-visible="isAddPropertyDialogVisible"
      @property-saved="handlePropertySaved"
    />

    <!-- 👉 Edit Property Dialog -->
    <AddEditPropertyDialog
      v-model:is-dialog-visible="isEditPropertyDialogVisible"
      :property-data="selectedProperty"
      @property-saved="handlePropertySaved"
    />

    <!-- 👉 View Property Dialog -->
    <ViewPropertyDialog
      v-model:is-dialog-visible="isViewPropertyDialogVisible"
      :property-data="selectedProperty"
    />

    <!-- 👉 Import Property Dialog -->
    <ImportPropertyDialog
      v-model:is-dialog-visible="isImportDialogVisible"
      @import-completed="handleImportCompleted"
    />

    <!-- 👉 Status Change Dialog -->
    <StatusChangeDialog
      v-model:is-open="isStatusChangeDialogVisible"
      entity-type="property"
      :entity-id="selectedProperty?.id"
      :current-status="selectedProperty?.status"
      :entity-name="selectedProperty?.name"
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
            {{ t('propertyList.deleteDialog.title') }}
          </h6>

          <p class="text-body-1 mb-6">
            {{ t('propertyList.deleteDialog.message', { name: propertyToDelete?.name }) }}
          </p>

          <div class="d-flex gap-4 justify-center">
            <VBtn
              color="secondary"
              variant="tonal"
              @click="cancelDelete"
            >
              {{ t('propertyList.deleteDialog.cancel') }}
            </VBtn>

            <VBtn
              color="error"
              variant="elevated"
              @click="deleteProperty"
            >
              {{ t('propertyList.deleteDialog.confirm') }}
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
            {{ t('propertyList.bulkDeleteDialog.title') }}
          </h6>

          <p class="text-body-1 mb-6">
            {{ t('propertyList.bulkDeleteDialog.message', { count: selectedRows.length, entity: selectedRows.length === 1 ? t('common.property') : t('common.properties') }) }}
          </p>

          <VAlert
            color="warning"
            variant="tonal"
            class="mb-6 text-start"
          >
            <div class="text-body-2">
              {{ t('propertyList.bulkDeleteDialog.warning', { count: selectedRows.length, entity: selectedRows.length === 1 ? t('common.property') : t('common.properties') }) }}
            </div>
          </VAlert>

          <div class="d-flex gap-4 justify-center">
            <VBtn
              color="secondary"
              variant="tonal"
              @click="cancelBulkDelete"
            >
              {{ t('propertyList.bulkDeleteDialog.cancel') }}
            </VBtn>

            <VBtn
              color="error"
              variant="elevated"
              @click="bulkDeleteProperties"
            >
              {{ t('propertyList.bulkDeleteDialog.confirm') }}
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
            {{ t('propertyList.bulkStatusDialog.title', { count: selectedRows.length, entity: selectedRows.length === 1 ? t('common.property') : t('common.properties') }) }}
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
                  {{ t('propertyList.bulkStatusDialog.message', { count: selectedRows.length, entity: selectedRows.length === 1 ? t('common.property') : t('common.properties') }) }}
                </div>
              </VAlert>
            </VCol>

            <!-- New Status -->
            <VCol cols="12">
              <AppSelect
                v-model="bulkStatusForm.newStatus"
                :label="t('propertyList.bulkStatusDialog.newStatus')"
                :placeholder="t('propertyList.bulkStatusDialog.selectStatus')"
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
                :label="t('propertyList.bulkStatusDialog.reason')"
                :placeholder="t('propertyList.bulkStatusDialog.reasonPlaceholder')"
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
            {{ t('propertyList.bulkStatusDialog.cancel') }}
          </VBtn>
          <VBtn
            color="warning"
            variant="elevated"
            :disabled="!bulkStatusForm.newStatus"
            @click="bulkUpdateStatus"
          >
            {{ t('propertyList.bulkStatusDialog.confirm') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- 👉 Snackbar -->
    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="top end"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </section>
</template>
