<script lang="ts" setup>
import { supabase } from '@/lib/supabase'

const route = useRoute()

// 👉 User data for permission checks
const currentUserData = useCookie<any>('userData')

// Check if user can manage devices (Super Admin, Mega Dealer, Dealer, Administrator only)
const canManageDevices = computed(() => {
  const role = currentUserData.value?.role
  return role && ['Super Admin', 'Mega Dealer', 'Dealer', 'Administrator'].includes(role)
})

// Device Table Headers
const deviceTableHeaders = [
  { title: 'Device Name', key: 'device_name' },
  { title: 'Community', key: 'community_name' },
  { title: 'Status', key: 'enabled' },
  { title: 'Actions', key: 'actions', sortable: false },
]

const search = ref('')
const options = ref({ itemsPerPage: 5, page: 1 })
const devices = ref<any[]>([])
const isLoading = ref(false)
const snackbar = ref({ show: false, message: '', color: 'success' })

// View device dialog
const isViewDeviceDialogVisible = ref(false)
const deviceToView = ref<any>(null)

// Add/Edit device dialog
const isAddEditDeviceDialogVisible = ref(false)
const isEditMode = ref(false)
const isDuplicateMode = ref(false)
const showAuthKey = ref(false)

// Masked auth key display (first 4 and last 4 characters)
const maskedAuthKey = computed(() => {
  const key = deviceForm.value.auth_key
  if (!key || key.length <= 8) return key
  return `${key.substring(0, 4)}${'•'.repeat(Math.min(key.length - 8, 20))}${key.substring(key.length - 4)}`
})

// Check if auth key should be protected (edit or duplicate with existing key)
const isAuthKeyProtected = computed(() => {
  return isEditMode.value || (isDuplicateMode.value && !!deviceForm.value.auth_key)
})

const deviceForm = ref({
  id: '',
  device_name: '',
  device_brand: '',
  device_model: '',
  api_url: '',
  api_endpoint: '',
  auth_key: '',
  divice_turn: '',
  direction_type: '',
  community_id: '',
  geolocation: '',
  device_channel_in: null as number | null,
  device_channel_out: null as number | null,
  device_id_in: '',
  device_id_out: '',
  enabled: true,
  guest_access: false,
})
const isSaving = ref(false)

// Delete device confirmation dialog
const isDeleteDeviceDialogVisible = ref(false)
const deviceToDelete = ref<{ id: string; name: string } | null>(null)

// Available communities for dropdown
const availableCommunities = ref<any[]>([])

// Direction type options
const directionTypes = [
  { title: 'Entry', value: 'entry' },
  { title: 'Exit', value: 'exit' },
  { title: 'Both', value: 'both' },
]

// Fetch user's communities for the dropdown
const fetchUserCommunities = async () => {
  try {
    const userId = route.params.id

    const { data: profileRole, error: roleError } = await supabase
      .from('profile_role')
      .select('scope_community_ids, scope_type, role:role_id(role_name)')
      .eq('profile_id', userId)
      .single()

    if (roleError) {
      console.error('Error fetching profile role:', roleError)
      return
    }

    const roleName = (profileRole?.role as any)?.role_name

    // Super Admin or global scope can see all communities
    if (roleName === 'Super Admin' || profileRole?.scope_type === 'global') {
      const { data, error } = await supabase
        .from('community')
        .select('id, name')
        .order('name')

      if (!error && data) {
        availableCommunities.value = data.map(c => ({
          title: `${c.id} - ${c.name || 'No Name'}`,
          value: c.id,
        }))
      }
      return
    }

    // For other roles, only show assigned communities
    const communityIds = profileRole?.scope_community_ids || []
    if (communityIds.length === 0) {
      availableCommunities.value = []
      return
    }

    const { data, error } = await supabase
      .from('community')
      .select('id, name')
      .in('id', communityIds)
      .order('name')

    if (!error && data) {
      availableCommunities.value = data.map(c => ({
        title: `${c.id} - ${c.name || 'No Name'}`,
        value: c.id,
      }))
    }
  } catch (err) {
    console.error('Error in fetchUserCommunities:', err)
  }
}

// Fetch devices for user's communities
const fetchUserDevices = async () => {
  try {
    isLoading.value = true
    const userId = route.params.id

    // Get user's role and scope
    const { data: profileRole, error: roleError } = await supabase
      .from('profile_role')
      .select('scope_community_ids, scope_type, role:role_id(role_name)')
      .eq('profile_id', userId)
      .single()

    if (roleError) {
      console.error('Error fetching profile role:', roleError)
      return
    }

    const roleName = (profileRole?.role as any)?.role_name

    // Super Admin or global scope can see all devices
    if (roleName === 'Super Admin' || profileRole?.scope_type === 'global') {
      const { data, error } = await supabase
        .from('automation_devices')
        .select(`
          *,
          community:community_id(name)
        `)
        .order('device_name')

      if (error) {
        console.error('Error fetching all devices:', error)
        return
      }

      devices.value = (data || []).map(device => ({
        ...device,
        community_name: (device.community as any)?.name || device.community_id,
      }))
      return
    }

    // For other roles, only show devices from assigned communities
    const communityIds = profileRole?.scope_community_ids || []
    if (communityIds.length === 0) {
      devices.value = []
      return
    }

    const { data, error } = await supabase
      .from('automation_devices')
      .select(`
        *,
        community:community_id(name)
      `)
      .in('community_id', communityIds)
      .order('device_name')

    if (error) {
      console.error('Error fetching scoped devices:', error)
      return
    }

    devices.value = (data || []).map(device => ({
      ...device,
      community_name: (device.community as any)?.name || device.community_id,
    }))
  } catch (err) {
    console.error('Error in fetchUserDevices:', err)
  } finally {
    isLoading.value = false
  }
}

// Open view device dialog
const openViewDeviceDialog = (device: any) => {
  deviceToView.value = device
  isViewDeviceDialogVisible.value = true
}

// Open add device dialog
const openAddDeviceDialog = async () => {
  isEditMode.value = false
  isDuplicateMode.value = false
  showAuthKey.value = false
  deviceForm.value = {
    id: '',
    device_name: '',
    device_brand: '',
    device_model: '',
    api_url: '',
    api_endpoint: '',
    auth_key: '',
    divice_turn: '',
    direction_type: '',
    community_id: '',
    geolocation: '',
    device_channel_in: null,
    device_channel_out: null,
    device_id_in: '',
    device_id_out: '',
    enabled: true,
    guest_access: false,
  }
  await fetchUserCommunities()
  isAddEditDeviceDialogVisible.value = true
}

// Open edit device dialog
const openEditDeviceDialog = async (device: any) => {
  isEditMode.value = true
  isDuplicateMode.value = false
  showAuthKey.value = false
  deviceForm.value = {
    id: device.id,
    device_name: device.device_name || '',
    device_brand: device.device_brand || '',
    device_model: device.device_model || '',
    api_url: device.api_url || '',
    api_endpoint: device.api_endpoint || '',
    auth_key: device.auth_key || '',
    divice_turn: device.divice_turn || '',
    direction_type: device.direction_type || '',
    community_id: device.community_id || '',
    geolocation: device.geolocation || '',
    device_channel_in: device.device_channel_in,
    device_channel_out: device.device_channel_out,
    device_id_in: device.device_id_in || '',
    device_id_out: device.device_id_out || '',
    enabled: device.enabled ?? true,
    guest_access: device.guest_access ?? false,
  }
  await fetchUserCommunities()
  isAddEditDeviceDialogVisible.value = true
}

// Open duplicate device dialog (pre-populate with existing device data but as new)
const openDuplicateDeviceDialog = async (device: any) => {
  isEditMode.value = false
  isDuplicateMode.value = true
  showAuthKey.value = false
  deviceForm.value = {
    id: '', // Empty ID for new device
    device_name: `${device.device_name || ''} (Copy)`,
    device_brand: device.device_brand || '',
    device_model: device.device_model || '',
    api_url: device.api_url || '',
    api_endpoint: device.api_endpoint || '',
    auth_key: device.auth_key || '',
    divice_turn: device.divice_turn || '',
    direction_type: device.direction_type || '',
    community_id: device.community_id || '',
    geolocation: device.geolocation || '',
    device_channel_in: device.device_channel_in,
    device_channel_out: device.device_channel_out,
    device_id_in: device.device_id_in || '',
    device_id_out: device.device_id_out || '',
    enabled: device.enabled ?? true,
    guest_access: device.guest_access ?? false,
  }
  await fetchUserCommunities()
  isAddEditDeviceDialogVisible.value = true
}

// Save device (add or edit)
const saveDevice = async () => {
  if (!deviceForm.value.device_name || !deviceForm.value.community_id) {
    snackbar.value = {
      show: true,
      message: 'Device name and community are required',
      color: 'error',
    }
    return
  }

  try {
    isSaving.value = true

    const deviceData = {
      device_name: deviceForm.value.device_name,
      device_brand: deviceForm.value.device_brand || null,
      device_model: deviceForm.value.device_model || null,
      api_url: deviceForm.value.api_url || null,
      api_endpoint: deviceForm.value.api_endpoint || null,
      auth_key: deviceForm.value.auth_key || null,
      divice_turn: deviceForm.value.divice_turn || null,
      direction_type: deviceForm.value.direction_type || null,
      community_id: deviceForm.value.community_id,
      geolocation: deviceForm.value.geolocation || null,
      device_channel_in: deviceForm.value.device_channel_in,
      device_channel_out: deviceForm.value.device_channel_out,
      device_id_in: deviceForm.value.device_id_in || null,
      device_id_out: deviceForm.value.device_id_out || null,
      enabled: deviceForm.value.enabled,
      guest_access: deviceForm.value.guest_access,
      updated_at: new Date().toISOString(),
    }

    if (isEditMode.value) {
      const { error } = await supabase
        .from('automation_devices')
        .update(deviceData)
        .eq('id', deviceForm.value.id)

      if (error) {
        console.error('Error updating device:', error)
        snackbar.value = {
          show: true,
          message: 'Failed to update device',
          color: 'error',
        }
        return
      }

      snackbar.value = {
        show: true,
        message: 'Device updated successfully',
        color: 'success',
      }
    } else {
      const { error } = await supabase
        .from('automation_devices')
        .insert({
          ...deviceData,
          created_at: new Date().toISOString(),
        })

      if (error) {
        console.error('Error creating device:', error)
        snackbar.value = {
          show: true,
          message: 'Failed to create device',
          color: 'error',
        }
        return
      }

      snackbar.value = {
        show: true,
        message: 'Device created successfully',
        color: 'success',
      }
    }

    isAddEditDeviceDialogVisible.value = false
    await fetchUserDevices()
  } catch (err) {
    console.error('Error in saveDevice:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to save device',
      color: 'error',
    }
  } finally {
    isSaving.value = false
  }
}

// Open delete device confirmation dialog
const openDeleteDeviceDialog = (device: any) => {
  deviceToDelete.value = { id: device.id, name: device.device_name || device.id }
  isDeleteDeviceDialogVisible.value = true
}

// Cancel delete
const cancelDelete = () => {
  isDeleteDeviceDialogVisible.value = false
  deviceToDelete.value = null
}

// Confirm delete device
const isDeleting = ref(false)
const confirmDeleteDevice = async () => {
  if (!deviceToDelete.value) return

  try {
    isDeleting.value = true
    const { error } = await supabase
      .from('automation_devices')
      .delete()
      .eq('id', deviceToDelete.value.id)

    if (error) {
      console.error('Error deleting device:', error)
      snackbar.value = {
        show: true,
        message: 'Failed to delete device',
        color: 'error',
      }
      return
    }

    snackbar.value = {
      show: true,
      message: 'Device deleted successfully',
      color: 'success',
    }

    await fetchUserDevices()
  } catch (err) {
    console.error('Error in confirmDeleteDevice:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to delete device',
      color: 'error',
    }
  } finally {
    isDeleting.value = false
    isDeleteDeviceDialogVisible.value = false
    deviceToDelete.value = null
  }
}

onMounted(() => {
  if (canManageDevices.value) {
    fetchUserDevices()
  }
})
</script>

<template>
  <VRow v-if="canManageDevices">
    <VCol cols="12">
      <VCard>
        <VCardText class="d-flex justify-space-between align-center flex-wrap gap-4">
          <h5 class="text-h5">
            Automation Devices
          </h5>

          <div class="d-flex align-center gap-4">
            <div style="inline-size: 250px;">
              <AppTextField
                v-model="search"
                placeholder="Search Device"
              />
            </div>

            <!-- 👉 Refresh Button -->
            <IconBtn @click="fetchUserDevices">
              <VIcon icon="tabler-refresh" />
              <VTooltip
                activator="parent"
                location="top"
              >
                Refresh
              </VTooltip>
            </IconBtn>

            <!-- 👉 Add Device Button -->
            <VBtn
              prepend-icon="tabler-plus"
              @click="openAddDeviceDialog"
            >
              Add Device
            </VBtn>
          </div>
        </VCardText>
        <VDivider />

        <!-- 👉 Devices Table -->
        <VDataTable
          v-model:page="options.page"
          :headers="deviceTableHeaders"
          :items-per-page="options.itemsPerPage"
          :items="devices"
          item-value="id"
          hide-default-footer
          :search="search"
          :loading="isLoading"
          class="text-no-wrap"
        >
          <!-- Device Name -->
          <template #item.device_name="{ item }">
            <div class="text-body-1 text-high-emphasis font-weight-medium">
              {{ item.device_name || 'N/A' }}
            </div>
          </template>

          <!-- Brand -->
          <template #item.device_brand="{ item }">
            <div class="text-body-1">
              {{ item.device_brand || 'N/A' }}
            </div>
          </template>

          <!-- Model -->
          <template #item.device_model="{ item }">
            <div class="text-body-1">
              {{ item.device_model || 'N/A' }}
            </div>
          </template>

          <!-- Community -->
          <template #item.community_name="{ item }">
            <div class="text-body-1">
              {{ item.community_name || 'N/A' }}
            </div>
          </template>

          <!-- Direction -->
          <template #item.direction_type="{ item }">
            <VChip
              v-if="item.direction_type"
              :color="item.direction_type === 'entry' ? 'success' : item.direction_type === 'exit' ? 'warning' : 'info'"
              size="small"
              label
              class="text-capitalize"
            >
              {{ item.direction_type }}
            </VChip>
            <span v-else>N/A</span>
          </template>

          <!-- Status -->
          <template #item.enabled="{ item }">
            <VChip
              :color="item.enabled ? 'success' : 'error'"
              size="small"
              label
            >
              {{ item.enabled ? 'Enabled' : 'Disabled' }}
            </VChip>
          </template>

          <!-- Actions -->
          <template #item.actions="{ item }">
            <div class="d-flex gap-1">
              <!-- View -->
              <IconBtn
                color="info"
                @click="openViewDeviceDialog(item)"
              >
                <VIcon icon="tabler-eye" />
                <VTooltip
                  activator="parent"
                  location="top"
                >
                  View
                </VTooltip>
              </IconBtn>

              <!-- Edit -->
              <IconBtn
                color="primary"
                @click="openEditDeviceDialog(item)"
              >
                <VIcon icon="tabler-pencil" />
                <VTooltip
                  activator="parent"
                  location="top"
                >
                  Edit
                </VTooltip>
              </IconBtn>

              <!-- Duplicate -->
              <IconBtn
                color="secondary"
                @click="openDuplicateDeviceDialog(item)"
              >
                <VIcon icon="tabler-copy" />
                <VTooltip
                  activator="parent"
                  location="top"
                >
                  Duplicate
                </VTooltip>
              </IconBtn>

              <!-- Delete -->
              <IconBtn
                color="error"
                @click="openDeleteDeviceDialog(item)"
              >
                <VIcon icon="tabler-trash" />
                <VTooltip
                  activator="parent"
                  location="top"
                >
                  Delete
                </VTooltip>
              </IconBtn>
            </div>
          </template>

          <!-- Pagination -->
          <template #bottom>
            <TablePagination
              v-model:page="options.page"
              :items-per-page="options.itemsPerPage"
              :total-items="devices.length"
            />
          </template>
        </VDataTable>
      </VCard>
    </VCol>
  </VRow>

  <!-- 👉 View Device Dialog -->
  <VDialog
    v-model="isViewDeviceDialogVisible"
    max-width="600"
  >
    <VCard>
      <VCardText class="text-center px-10 py-6">
        <VIcon
          icon="tabler-device-analytics"
          color="primary"
          size="56"
          class="my-4"
        />

        <h6 class="text-h6 mb-4">
          Device Details
        </h6>

        <VList
          v-if="deviceToView"
          class="text-start"
        >
          <VListItem>
            <strong>Name:</strong> {{ deviceToView.device_name || 'N/A' }}
          </VListItem>
          <VListItem>
            <strong>Brand:</strong> {{ deviceToView.device_brand || 'N/A' }}
          </VListItem>
          <VListItem>
            <strong>Model:</strong> {{ deviceToView.device_model || 'N/A' }}
          </VListItem>
          <VListItem>
            <strong>Community:</strong> {{ deviceToView.community_name || 'N/A' }}
          </VListItem>
          <VListItem>
            <strong>Direction:</strong> {{ deviceToView.direction_type || 'N/A' }}
          </VListItem>
          <VListItem>
            <strong>API URL:</strong> {{ deviceToView.api_url || 'N/A' }}
          </VListItem>
          <VListItem>
            <strong>API Endpoint:</strong> {{ deviceToView.api_endpoint || 'N/A' }}
          </VListItem>
          <VListItem>
            <strong>Channel In:</strong> {{ deviceToView.device_channel_in ?? 'N/A' }}
          </VListItem>
          <VListItem>
            <strong>Channel Out:</strong> {{ deviceToView.device_channel_out ?? 'N/A' }}
          </VListItem>
          <VListItem>
            <strong>Status:</strong>
            <VChip
              :color="deviceToView.enabled ? 'success' : 'error'"
              size="small"
              label
              class="ms-2"
            >
              {{ deviceToView.enabled ? 'Enabled' : 'Disabled' }}
            </VChip>
          </VListItem>
          <VListItem>
            <strong>Guest Access:</strong>
            <VChip
              :color="deviceToView.guest_access ? 'success' : 'secondary'"
              size="small"
              label
              class="ms-2"
            >
              {{ deviceToView.guest_access ? 'Yes' : 'No' }}
            </VChip>
          </VListItem>
        </VList>

        <div class="d-flex gap-4 justify-center mt-6">
          <VBtn
            color="secondary"
            variant="tonal"
            @click="isViewDeviceDialogVisible = false"
          >
            Close
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>

  <!-- 👉 Add/Edit Device Dialog -->
  <VDialog
    v-model="isAddEditDeviceDialogVisible"
    max-width="700"
  >
    <VCard>
      <VCardText class="text-center px-10 py-6">
        <VIcon
          :icon="isEditMode ? 'tabler-pencil' : 'tabler-plus'"
          color="primary"
          size="56"
          class="my-4"
        />

        <h6 class="text-h6 mb-4">
          {{ isEditMode ? 'Edit Device' : 'Add New Device' }}
        </h6>

        <VForm @submit.prevent="saveDevice">
          <VRow>
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="deviceForm.device_name"
                label="Device Name *"
                placeholder="Enter device name"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="deviceForm.community_id"
                label="Community *"
                placeholder="Select community"
                :items="availableCommunities"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="deviceForm.device_brand"
                label="Brand"
                placeholder="e.g., Shelly"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="deviceForm.device_model"
                label="Model"
                placeholder="e.g., Shelly Pro 4PM"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="deviceForm.direction_type"
                label="Direction Type"
                placeholder="Select direction"
                :items="directionTypes"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="deviceForm.api_url"
                label="API URL"
                placeholder="https://..."
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="deviceForm.api_endpoint"
                label="API Endpoint"
                placeholder="/relay/0"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <!-- Edit/Duplicate mode with existing key: show masked display with reveal option -->
              <AppTextField
                v-if="isAuthKeyProtected"
                :model-value="showAuthKey ? maskedAuthKey : '••••••••••••••••'"
                label="Auth Key"
                readonly
                hint="Auth key is protected. Click eye to reveal partial key."
                persistent-hint
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-key" />
                </template>
                <template #append-inner>
                  <VIcon
                    :icon="showAuthKey ? 'tabler-eye-off' : 'tabler-eye'"
                    style="cursor: pointer"
                    @click="showAuthKey = !showAuthKey"
                  />
                </template>
              </AppTextField>
              <!-- Create mode: allow full editing -->
              <AppTextField
                v-else
                v-model="deviceForm.auth_key"
                label="Auth Key"
                placeholder="Enter auth key"
                :type="showAuthKey ? 'text' : 'password'"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-key" />
                </template>
                <template #append-inner>
                  <VIcon
                    :icon="showAuthKey ? 'tabler-eye-off' : 'tabler-eye'"
                    style="cursor: pointer"
                    @click="showAuthKey = !showAuthKey"
                  />
                </template>
              </AppTextField>
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model.number="deviceForm.device_channel_in"
                label="Channel In"
                placeholder="0"
                type="number"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model.number="deviceForm.device_channel_out"
                label="Channel Out"
                placeholder="1"
                type="number"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="deviceForm.device_id_in"
                label="Device ID In"
                placeholder="Enter device ID in"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="deviceForm.device_id_out"
                label="Device ID Out"
                placeholder="Enter device ID out"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <VSwitch
                v-model="deviceForm.enabled"
                label="Enabled"
                color="success"
              />
            </VCol>

            <VCol
              cols="12"
              md="6"
            >
              <VSwitch
                v-model="deviceForm.guest_access"
                label="Guest Access"
                color="primary"
              />
            </VCol>
          </VRow>

          <div class="d-flex gap-4 justify-center mt-6">
            <VBtn
              color="secondary"
              variant="tonal"
              @click="isAddEditDeviceDialogVisible = false"
            >
              Cancel
            </VBtn>

            <VBtn
              color="primary"
              variant="elevated"
              type="submit"
              :loading="isSaving"
            >
              {{ isEditMode ? 'Update' : 'Create' }}
            </VBtn>
          </div>
        </VForm>
      </VCardText>
    </VCard>
  </VDialog>

  <!-- 👉 Delete Device Confirmation Dialog -->
  <VDialog
    v-model="isDeleteDeviceDialogVisible"
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
          Delete Device
        </h6>

        <p class="text-body-1 mb-6">
          Are you sure you want to delete <strong>{{ deviceToDelete?.name }}</strong>?
        </p>

        <VAlert
          color="error"
          variant="tonal"
          class="mb-6 text-start"
        >
          <div class="text-body-2">
            This action cannot be undone. The device will be permanently removed.
          </div>
        </VAlert>

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
            :loading="isDeleting"
            @click="confirmDeleteDevice"
          >
            Delete
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>

  <!-- 👉 Snackbar -->
  <VSnackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    location="top end"
    :timeout="4000"
  >
    {{ snackbar.message }}
  </VSnackbar>
</template>
