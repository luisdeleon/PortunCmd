<script setup lang="ts">
import { supabase } from '@/lib/supabase'
import AddEditDeviceDialog from '@/components/dialogs/AddEditDeviceDialog.vue'
import ViewDeviceDialog from '@/components/dialogs/ViewDeviceDialog.vue'

const { t } = useI18n({ useScope: 'global' })

definePage({
  meta: {
    public: false,
    navActiveLink: 'apps-devices-list',
    action: 'read',
    subject: 'automation',
  },
})

// 👉 User data for permission checks
const userData = useCookie<any>('userData')

// Check if user can add/edit/delete (not Guard or Resident)
const canManage = computed(() => {
  const role = userData.value?.role
  return role && !['Guard', 'Resident'].includes(role)
})

// Get user scope for filtering
const userScope = computed(() => userData.value?.scope || {})
const isSuperAdmin = computed(() => userData.value?.role === 'Super Admin' || userScope.value.scopeType === 'global')

// 👉 Store
const searchQuery = ref('')
const selectedCommunity = ref()
const selectedBrand = ref()
const selectedDirection = ref()
const selectedStatus = ref()

// Data table options
const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()
const selectedRows = ref<string[]>([])

// Update data table options
const updateOptions = (options: any) => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

// Headers
const headers = computed(() => [
  { title: t('deviceList.table.deviceName'), key: 'device_name' },
  { title: t('deviceList.table.community'), key: 'community_id' },
  { title: t('deviceList.table.brandModel'), key: 'device_brand', sortable: false },
  { title: t('deviceList.table.direction'), key: 'direction_type' },
  { title: t('deviceList.table.status'), key: 'enabled' },
  { title: t('deviceList.table.guestAccess'), key: 'guest_access' },
  { title: t('deviceList.table.actions'), key: 'actions', sortable: false },
])

// 👉 Fetching devices from Supabase
const devices = ref<any[]>([])
const totalDevices = ref(0)
const devicesLast30Days = ref(0)
const isLoading = ref(false)

const fetchDevices = async () => {
  try {
    isLoading.value = true

    let query = supabase
      .from('automation_devices')
      .select(`
        id,
        device_name,
        device_brand,
        device_model,
        api_url,
        api_endpoint,
        auth_key,
        divice_turn,
        direction_type,
        community_id,
        geolocation,
        device_channel_in,
        device_channel_out,
        device_id_in,
        device_id_out,
        enabled,
        guest_access,
        created_at,
        updated_at,
        community:community_id(id, name)
      `, { count: 'exact' })

    // Apply role-based scoping
    if (!isSuperAdmin.value) {
      const scope = userScope.value

      if (scope.scopeType === 'community' && scope.scopeCommunityIds?.length > 0) {
        // Community-scoped users (Admin, Guard) - see only their communities' devices
        query = query.in('community_id', scope.scopeCommunityIds)
      }
      else if (scope.scopeType === 'dealer' && scope.scopeCommunityIds?.length > 0) {
        // Dealer-scoped users (Mega Dealer, Dealer) - see only their communities' devices
        query = query.in('community_id', scope.scopeCommunityIds)
      }
      else if (scope.scopeType === 'property' && scope.scopeCommunityIds?.length > 0) {
        // Property-scoped users (Residents) - see devices from their communities
        query = query.in('community_id', scope.scopeCommunityIds)
      }
    }

    // Apply search filter
    if (searchQuery.value) {
      query = query.or(`device_name.ilike.%${searchQuery.value}%,device_brand.ilike.%${searchQuery.value}%,device_model.ilike.%${searchQuery.value}%,community_id.ilike.%${searchQuery.value}%`)
    }

    // Apply community filter
    if (selectedCommunity.value) {
      query = query.eq('community_id', selectedCommunity.value)
    }

    // Apply brand filter
    if (selectedBrand.value) {
      query = query.eq('device_brand', selectedBrand.value)
    }

    // Apply direction filter
    if (selectedDirection.value) {
      query = query.eq('direction_type', selectedDirection.value)
    }

    // Apply status filter
    if (selectedStatus.value !== undefined && selectedStatus.value !== null && selectedStatus.value !== '') {
      query = query.eq('enabled', selectedStatus.value === 'enabled')
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
      console.error('Error fetching devices from Supabase:', error)
      return
    }

    devices.value = data || []
    totalDevices.value = count || 0
  } catch (err) {
    console.error('Error in fetchDevices:', err)
  } finally {
    isLoading.value = false
  }
}

// Fetch devices created in last 30 days for growth calculation
const fetchDeviceGrowth = async () => {
  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count, error } = await supabase
      .from('automation_devices')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (error) {
      console.error('Error fetching device growth:', error)
      return
    }

    devicesLast30Days.value = count || 0
  } catch (err) {
    console.error('Error in fetchDeviceGrowth:', err)
  }
}

// Filter options
const communities = ref<{ title: string; value: string }[]>([])
const brands = ref<{ title: string; value: string }[]>([])

// Direction options
const directionOptions = computed(() => [
  { title: t('deviceList.direction.enter'), value: 'Enter' },
  { title: t('deviceList.direction.exit'), value: 'Exit' },
  { title: t('deviceList.direction.both'), value: 'Both' },
])

// Status filter options
const statusOptions = computed(() => [
  { title: t('deviceList.status.enabled'), value: 'enabled' },
  { title: t('deviceList.status.disabled'), value: 'disabled' },
])

// Fetch unique communities for filter (scoped by user role)
const fetchCommunities = async () => {
  try {
    let query = supabase
      .from('community')
      .select('id, name')

    // Apply role-based scoping
    if (!isSuperAdmin.value) {
      const scope = userScope.value

      if (scope.scopeCommunityIds?.length > 0) {
        // Scoped users - only their communities
        query = query.in('id', scope.scopeCommunityIds)
      }
    }

    query = query.order('name')

    const { data, error } = await query

    if (error) {
      console.error('Error fetching communities:', error)
      return
    }

    communities.value = (data || []).map(c => ({
      title: c.name || c.id,
      value: c.id,
    }))
  } catch (err) {
    console.error('Error in fetchCommunities:', err)
  }
}

// Fetch unique brands for filter
const fetchBrands = async () => {
  try {
    const { data, error } = await supabase
      .from('automation_devices')
      .select('device_brand')

    if (error) {
      console.error('Error fetching brands:', error)
      return
    }

    const uniqueBrands = [...new Set(data?.map(d => d.device_brand).filter(Boolean))]
    brands.value = uniqueBrands.map(brand => ({
      title: brand as string,
      value: brand as string,
    }))
  } catch (err) {
    console.error('Error in fetchBrands:', err)
  }
}

// Fetch data on mount
onMounted(() => {
  fetchDevices()
  fetchDeviceGrowth()
  fetchCommunities()
  fetchBrands()
})

// Watch for filter changes
watch([searchQuery, selectedCommunity, selectedBrand, selectedDirection, selectedStatus, page, itemsPerPage, sortBy, orderBy], () => {
  fetchDevices()
})

// 👉 Dialogs state
const isAddDeviceDialogVisible = ref(false)
const isEditDeviceDialogVisible = ref(false)
const isViewDeviceDialogVisible = ref(false)
const isDeleteDialogVisible = ref(false)
const isBulkDeleteDialogVisible = ref(false)
const selectedDevice = ref<any>(null)
const deviceToDelete = ref<{ id: string; name: string } | null>(null)
const snackbar = ref({ show: false, message: '', color: 'success' })

// Computed property for bulk delete button visibility
const hasSelectedRows = computed(() => selectedRows.value.length > 0)

// 👉 Open add device dialog
const openAddDeviceDialog = () => {
  selectedDevice.value = null
  isAddDeviceDialogVisible.value = true
}

// 👉 Open view device dialog
const openViewDeviceDialog = (device: any) => {
  selectedDevice.value = { ...device }
  isViewDeviceDialogVisible.value = true
}

// 👉 Open edit device dialog
const openEditDeviceDialog = (device: any) => {
  selectedDevice.value = { ...device }
  isEditDeviceDialogVisible.value = true
}

// 👉 Open duplicate device dialog (copy device without id)
const openDuplicateDeviceDialog = (device: any) => {
  const { id, created_at, updated_at, ...deviceWithoutId } = device
  selectedDevice.value = {
    ...deviceWithoutId,
    device_name: `${device.device_name || 'Device'} (Copy)`,
  }
  isAddDeviceDialogVisible.value = true
}

// 👉 Open delete confirmation dialog
const openDeleteDialog = (device: any) => {
  deviceToDelete.value = { id: device.id, name: device.device_name || device.id }
  isDeleteDialogVisible.value = true
}

// 👉 Cancel delete
const cancelDelete = () => {
  isDeleteDialogVisible.value = false
  deviceToDelete.value = null
}

// 👉 Handle device saved
const handleDeviceSaved = () => {
  fetchDevices()
  fetchDeviceGrowth()
  fetchBrands()

  snackbar.value = {
    show: true,
    message: 'Device saved successfully',
    color: 'success',
  }
}

// 👉 Delete device
const deleteDevice = async () => {
  if (!deviceToDelete.value) return

  const { id, name } = deviceToDelete.value

  try {
    const { error } = await supabase
      .from('automation_devices')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting device:', error)

      snackbar.value = {
        show: true,
        message: 'Failed to delete device',
        color: 'error',
      }

      isDeleteDialogVisible.value = false
      deviceToDelete.value = null
      return
    }

    // Success
    snackbar.value = {
      show: true,
      message: `Device "${name}" has been deleted successfully`,
      color: 'success',
    }

    // Remove from selectedRows
    const index = selectedRows.value.findIndex(row => row === id)
    if (index !== -1)
      selectedRows.value.splice(index, 1)

    // Close dialog and clear selection
    isDeleteDialogVisible.value = false
    deviceToDelete.value = null

    // Refetch devices
    fetchDevices()
    fetchDeviceGrowth()
  } catch (err) {
    console.error('Error in deleteDevice:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to delete device',
      color: 'error',
    }
    isDeleteDialogVisible.value = false
    deviceToDelete.value = null
  }
}

// 👉 Open bulk delete dialog
const openBulkDeleteDialog = () => {
  isBulkDeleteDialogVisible.value = true
}

// 👉 Cancel bulk delete
const cancelBulkDelete = () => {
  isBulkDeleteDialogVisible.value = false
}

// 👉 Bulk delete devices
const bulkDeleteDevices = async () => {
  if (selectedRows.value.length === 0) return

  try {
    let successCount = 0
    let errorCount = 0

    for (const deviceId of selectedRows.value) {
      try {
        const { error } = await supabase
          .from('automation_devices')
          .delete()
          .eq('id', deviceId)

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
        message: `Successfully deleted ${successCount} ${successCount === 1 ? 'device' : 'devices'}`,
        color: 'success',
      }
    } else if (successCount === 0) {
      snackbar.value = {
        show: true,
        message: `Failed to delete ${errorCount} ${errorCount === 1 ? 'device' : 'devices'}`,
        color: 'error',
      }
    } else {
      snackbar.value = {
        show: true,
        message: `Deleted ${successCount} ${successCount === 1 ? 'device' : 'devices'}, ${errorCount} failed`,
        color: 'warning',
      }
    }

    // Clear selection
    selectedRows.value = []

    // Refetch devices
    fetchDevices()
    fetchDeviceGrowth()

    // Close dialog
    isBulkDeleteDialogVisible.value = false
  } catch (err) {
    console.error('Error in bulkDeleteDevices:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to delete devices',
      color: 'error',
    }

    isBulkDeleteDialogVisible.value = false
  }
}

// 👉 Toggle device status
const toggleDeviceStatus = async (device: any) => {
  try {
    const { error } = await supabase
      .from('automation_devices')
      .update({ enabled: !device.enabled })
      .eq('id', device.id)

    if (error) {
      console.error('Error updating device status:', error)
      snackbar.value = {
        show: true,
        message: 'Failed to update device status',
        color: 'error',
      }
      return
    }

    snackbar.value = {
      show: true,
      message: `Device ${device.enabled ? 'disabled' : 'enabled'} successfully`,
      color: 'success',
    }

    fetchDevices()
  } catch (err) {
    console.error('Error in toggleDeviceStatus:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to update device status',
      color: 'error',
    }
  }
}

// 👉 Toggle guest access
const toggleGuestAccess = async (device: any) => {
  try {
    const { error } = await supabase
      .from('automation_devices')
      .update({ guest_access: !device.guest_access })
      .eq('id', device.id)

    if (error) {
      console.error('Error updating guest access:', error)
      snackbar.value = {
        show: true,
        message: 'Failed to update guest access',
        color: 'error',
      }
      return
    }

    snackbar.value = {
      show: true,
      message: `Guest access ${device.guest_access ? 'denied' : 'allowed'} successfully`,
      color: 'success',
    }

    fetchDevices()
  } catch (err) {
    console.error('Error in toggleGuestAccess:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to update guest access',
      color: 'error',
    }
  }
}

const widgetData = computed(() => {
  // Calculate growth percentage based on devices created in last 30 days
  const growthPercentage = totalDevices.value > 0 && devicesLast30Days.value > 0
    ? Math.round((devicesLast30Days.value / totalDevices.value) * 100)
    : 0

  // Count enabled devices
  const enabledCount = devices.value.filter(d => d.enabled).length

  return [
    {
      title: t('deviceList.widgets.totalDevices'),
      value: totalDevices.value.toLocaleString(),
      change: growthPercentage,
      desc: t('deviceList.widgets.last30DaysGrowth'),
      icon: 'tabler-device-desktop',
      iconColor: 'primary',
    },
    {
      title: t('deviceList.widgets.activeDevices'),
      value: enabledCount.toLocaleString(),
      change: totalDevices.value > 0 ? Math.round((enabledCount / totalDevices.value) * 100) : 0,
      desc: t('deviceList.widgets.ofTotalDevices'),
      icon: 'tabler-toggle-right',
      iconColor: 'success',
    },
  ]
})

// Get direction chip color
const getDirectionColor = (direction: string) => {
  switch (direction) {
    case 'Enter':
      return 'success'
    case 'Exit':
      return 'warning'
    case 'Both':
      return 'info'
    default:
      return 'secondary'
  }
}
</script>

<template>
  <section>
    <!-- 👉 Widgets -->
    <div class="d-flex mb-6">
      <VRow>
        <template
          v-for="data in widgetData"
          :key="data.title"
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
        <VCardTitle>{{ t('deviceList.title') }}</VCardTitle>
      </VCardItem>

      <VCardText>
        <VRow>
          <!-- 👉 Filter by Community -->
          <VCol
            cols="12"
            sm="3"
          >
            <VAutocomplete
              v-model="selectedCommunity"
              :placeholder="t('deviceList.filters.filterByCommunity')"
              :items="communities"
              clearable
              clear-icon="tabler-x"
              auto-select-first
            />
          </VCol>
          <!-- 👉 Filter by Brand -->
          <VCol
            cols="12"
            sm="3"
          >
            <AppSelect
              v-model="selectedBrand"
              :placeholder="t('deviceList.filters.filterByBrand')"
              :items="brands"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
          <!-- 👉 Filter by Direction -->
          <VCol
            cols="12"
            sm="3"
          >
            <AppSelect
              v-model="selectedDirection"
              :placeholder="t('deviceList.filters.filterByDirection')"
              :items="directionOptions"
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
              :placeholder="t('deviceList.filters.filterByStatus')"
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

          <!-- 👉 Bulk Delete button (shown when items are selected) -->
          <VBtn
            v-if="hasSelectedRows && canManage"
            variant="tonal"
            color="error"
            prepend-icon="tabler-trash"
            @click="openBulkDeleteDialog"
          >
            {{ t('Delete') }} ({{ selectedRows.length }})
          </VBtn>
        </div>
        <VSpacer />

        <div class="app-user-search-filter d-flex align-center flex-wrap gap-4">
          <!-- 👉 Search  -->
          <div style="inline-size: 15.625rem;">
            <AppTextField
              v-model="searchQuery"
              :placeholder="t('deviceList.search.placeholder')"
              clearable
              clear-icon="tabler-x"
            />
          </div>

          <!-- 👉 Refresh button -->
          <VBtn
            variant="tonal"
            color="default"
            icon="tabler-refresh"
            @click="fetchDevices"
          />

          <!-- 👉 Add device button -->
          <VBtn
            v-if="canManage"
            prepend-icon="tabler-plus"
            @click="openAddDeviceDialog"
          >
            {{ t('deviceList.buttons.addDevice') }}
          </VBtn>
        </div>
      </VCardText>

      <VDivider />

      <!-- SECTION datatable -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:model-value="selectedRows"
        v-model:page="page"
        :items="devices"
        item-value="id"
        :items-length="totalDevices"
        :headers="headers"
        :loading="isLoading"
        class="text-no-wrap"
        show-select
        @update:options="updateOptions"
      >
        <!-- Device Name -->
        <template #item.device_name="{ item }">
          <div class="d-flex align-center gap-3">
            <VAvatar
              size="34"
              color="primary"
              variant="tonal"
            >
              <VIcon
                icon="tabler-device-desktop"
                size="22"
              />
            </VAvatar>
            <div class="d-flex flex-column">
              <span class="text-body-1 text-high-emphasis font-weight-medium">
                {{ item.device_name || 'Unnamed Device' }}
              </span>
              <span class="text-sm text-disabled">
                {{ item.device_id_in || 'No Device ID' }}
              </span>
            </div>
          </div>
        </template>

        <!-- Community -->
        <template #item.community_id="{ item }">
          <div class="text-body-1">
            {{ item.community?.name || item.community_id || 'N/A' }}
          </div>
        </template>

        <!-- Brand / Model -->
        <template #item.device_brand="{ item }">
          <div class="d-flex flex-column">
            <span class="text-body-1 font-weight-medium">
              {{ item.device_brand || 'N/A' }}
            </span>
            <span class="text-sm text-disabled">
              {{ item.device_model || 'Unknown Model' }}
            </span>
          </div>
        </template>

        <!-- Direction -->
        <template #item.direction_type="{ item }">
          <VChip
            :color="getDirectionColor(item.direction_type)"
            size="small"
            label
          >
            {{ item.direction_type || 'N/A' }}
          </VChip>
        </template>

        <!-- Status -->
        <template #item.enabled="{ item }">
          <VChip
            :color="item.enabled ? 'success' : 'error'"
            size="small"
            label
            :style="canManage ? 'cursor: pointer' : ''"
            @click="canManage && toggleDeviceStatus(item)"
          >
            {{ item.enabled ? t('deviceList.status.enabled') : t('deviceList.status.disabled') }}
          </VChip>
        </template>

        <!-- Guest Access -->
        <template #item.guest_access="{ item }">
          <VChip
            :color="item.guest_access ? 'info' : 'warning'"
            size="small"
            label
            :style="canManage ? 'cursor: pointer' : ''"
            @click="canManage && toggleGuestAccess(item)"
          >
            {{ item.guest_access ? t('deviceList.guestAccess.allowed') : t('deviceList.guestAccess.denied') }}
          </VChip>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div class="d-flex">
            <IconBtn
              size="small"
              @click="openViewDeviceDialog(item)"
            >
              <VIcon
                icon="tabler-eye"
                size="20"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('deviceList.actions.view') }}
              </VTooltip>
            </IconBtn>

            <IconBtn
              v-if="canManage"
              size="small"
              @click="openEditDeviceDialog(item)"
            >
              <VIcon
                icon="tabler-pencil"
                size="20"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('deviceList.actions.edit') }}
              </VTooltip>
            </IconBtn>

            <IconBtn
              v-if="canManage"
              size="small"
              @click="openDuplicateDeviceDialog(item)"
            >
              <VIcon
                icon="tabler-copy"
                size="20"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('deviceList.actions.duplicate') }}
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
                {{ t('deviceList.actions.delete') }}
              </VTooltip>
            </IconBtn>
          </div>
        </template>

        <!-- pagination -->
        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalDevices"
          />
        </template>
      </VDataTableServer>
      <!-- SECTION -->
    </VCard>

    <!-- 👉 Add Device Dialog -->
    <AddEditDeviceDialog
      v-model:is-dialog-visible="isAddDeviceDialogVisible"
      :device-data="selectedDevice"
      :communities="communities"
      @device-saved="handleDeviceSaved"
    />

    <!-- 👉 Edit Device Dialog -->
    <AddEditDeviceDialog
      v-model:is-dialog-visible="isEditDeviceDialogVisible"
      :device-data="selectedDevice"
      :communities="communities"
      @device-saved="handleDeviceSaved"
    />

    <!-- 👉 View Device Dialog -->
    <ViewDeviceDialog
      v-model:is-dialog-visible="isViewDeviceDialogVisible"
      :device-data="selectedDevice"
    />

    <!-- 👉 Delete Confirmation Dialog -->
    <VDialog
      v-model="isDeleteDialogVisible"
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
            {{ t('deviceList.deleteDialog.title') }}
          </h6>

          <p class="text-body-1 mb-6">
            {{ t('deviceList.deleteDialog.message', { name: deviceToDelete?.name }) }}
          </p>

          <div class="d-flex gap-4 justify-center">
            <VBtn
              color="secondary"
              variant="tonal"
              @click="cancelDelete"
            >
              {{ t('deviceList.deleteDialog.cancel') }}
            </VBtn>

            <VBtn
              color="error"
              variant="elevated"
              @click="deleteDevice"
            >
              {{ t('deviceList.deleteDialog.confirm') }}
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
            {{ t('deviceList.bulkDeleteDialog.title') }}
          </h6>

          <p class="text-body-1 mb-6">
            {{ t('deviceList.bulkDeleteDialog.message', { count: selectedRows.length, entity: selectedRows.length === 1 ? 'device' : 'devices' }) }}
          </p>

          <VAlert
            color="warning"
            variant="tonal"
            class="mb-6 text-start"
          >
            <div class="text-body-2">
              {{ t('deviceList.bulkDeleteDialog.warning', { count: selectedRows.length, entity: selectedRows.length === 1 ? 'device' : 'devices' }) }}
            </div>
          </VAlert>

          <div class="d-flex gap-4 justify-center">
            <VBtn
              color="secondary"
              variant="tonal"
              @click="cancelBulkDelete"
            >
              {{ t('deviceList.bulkDeleteDialog.cancel') }}
            </VBtn>

            <VBtn
              color="error"
              variant="elevated"
              @click="bulkDeleteDevices"
            >
              {{ t('deviceList.bulkDeleteDialog.confirm') }}
            </VBtn>
          </div>
        </VCardText>
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
