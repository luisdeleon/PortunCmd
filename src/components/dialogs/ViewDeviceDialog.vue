<script setup lang="ts">
interface DeviceData {
  id: string
  device_name?: string
  device_brand?: string
  device_model?: string
  api_url?: string
  api_endpoint?: string
  auth_key?: string
  divice_turn?: string
  direction_type?: string
  community_id?: string
  community?: { id: string; name: string } | null
  geolocation?: string
  device_channel_in?: number | null
  device_channel_out?: number | null
  device_id_in?: string
  device_id_out?: string
  enabled?: boolean
  guest_access?: boolean
  created_at?: string
  updated_at?: string
}

interface Props {
  deviceData: DeviceData | null
  isDialogVisible: boolean
}

interface Emit {
  (e: 'update:isDialogVisible', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const onClose = () => {
  emit('update:isDialogVisible', false)
}

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  const dateStr = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${dateStr}, ${timeStr}`
}

// Get direction chip color
const getDirectionColor = (direction?: string) => {
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

// Mask auth key for display
const maskedAuthKey = computed(() => {
  if (!props.deviceData?.auth_key) return 'N/A'
  const key = props.deviceData.auth_key
  if (key.length <= 8) return '••••••••'
  return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4)
})
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 800"
    :model-value="props.isDialogVisible"
    @update:model-value="onClose"
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="onClose" />

    <VCard v-if="props.deviceData">
      <VCardText class="pa-sm-10 pa-6">
        <!-- Header -->
        <div class="text-center mb-6">
          <VAvatar
            size="88"
            color="primary"
            variant="tonal"
            class="mb-4"
          >
            <VIcon
              icon="tabler-device-desktop"
              size="48"
            />
          </VAvatar>
          <h4 class="text-h4 mb-2">
            {{ props.deviceData.device_name || 'Device Details' }}
          </h4>
          <div class="d-flex justify-center gap-2">
            <VChip
              :color="props.deviceData.enabled ? 'success' : 'error'"
              size="small"
              label
            >
              {{ props.deviceData.enabled ? 'Enabled' : 'Disabled' }}
            </VChip>
            <VChip
              :color="getDirectionColor(props.deviceData.direction_type)"
              size="small"
              label
            >
              {{ props.deviceData.direction_type || 'N/A' }}
            </VChip>
          </div>
        </div>

        <!-- Device Information -->
        <VRow>
          <!-- Basic Information Section -->
          <VCol cols="12">
            <div class="d-flex align-center gap-2 mb-4">
              <VIcon
                icon="tabler-info-circle"
                size="20"
                color="primary"
              />
              <h6 class="text-h6 text-primary">
                Basic Information
              </h6>
            </div>
          </VCol>

          <!-- Device ID -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Device UUID</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-key"
                  size="20"
                />
                <span class="text-body-1 font-weight-medium font-mono">{{ props.deviceData.id?.substring(0, 8) || 'N/A' }}...</span>
              </div>
            </div>
          </VCol>

          <!-- Device Name -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Device Name</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-device-desktop"
                  size="20"
                />
                <span class="text-body-1 font-weight-medium">{{ props.deviceData.device_name || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- Community -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Community</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-building-community"
                  size="20"
                />
                <span class="text-body-1">{{ props.deviceData.community?.name || props.deviceData.community_id || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- Brand / Model -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Brand / Model</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-brand-apple"
                  size="20"
                />
                <span class="text-body-1">{{ props.deviceData.device_brand || 'N/A' }} / {{ props.deviceData.device_model || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- Device Identifiers Section -->
          <VCol cols="12">
            <VDivider class="my-4" />
            <div class="d-flex align-center gap-2 mb-4">
              <VIcon
                icon="tabler-id"
                size="20"
                color="info"
              />
              <h6 class="text-h6 text-info">
                Device Identifiers
              </h6>
            </div>
          </VCol>

          <!-- Device ID In -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Device ID (In)</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-login"
                  size="20"
                />
                <span class="text-body-1 font-mono">{{ props.deviceData.device_id_in || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- Device ID Out -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Device ID (Out)</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-logout"
                  size="20"
                />
                <span class="text-body-1 font-mono">{{ props.deviceData.device_id_out || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- API Configuration Section -->
          <VCol cols="12">
            <VDivider class="my-4" />
            <div class="d-flex align-center gap-2 mb-4">
              <VIcon
                icon="tabler-api"
                size="20"
                color="warning"
              />
              <h6 class="text-h6 text-warning">
                API Configuration
              </h6>
            </div>
          </VCol>

          <!-- API URL -->
          <VCol cols="12">
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">API URL</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-world"
                  size="20"
                />
                <span class="text-body-1 font-mono">{{ props.deviceData.api_url || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- API Endpoint -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">API Endpoint</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-route"
                  size="20"
                />
                <span class="text-body-1">{{ props.deviceData.api_endpoint || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- Auth Key -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Auth Key</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-key"
                  size="20"
                />
                <span class="text-body-1 font-mono">{{ maskedAuthKey }}</span>
              </div>
            </div>
          </VCol>

          <!-- Relay Configuration Section -->
          <VCol cols="12">
            <VDivider class="my-4" />
            <div class="d-flex align-center gap-2 mb-4">
              <VIcon
                icon="tabler-switch"
                size="20"
                color="success"
              />
              <h6 class="text-h6 text-success">
                Relay Configuration
              </h6>
            </div>
          </VCol>

          <!-- Direction Type -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Direction Type</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-arrows-left-right"
                  size="20"
                />
                <VChip
                  :color="getDirectionColor(props.deviceData.direction_type)"
                  size="small"
                  label
                >
                  {{ props.deviceData.direction_type || 'N/A' }}
                </VChip>
              </div>
            </div>
          </VCol>

          <!-- Turn Action -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Turn Action</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-toggle-right"
                  size="20"
                />
                <span class="text-body-1 text-capitalize">{{ props.deviceData.divice_turn || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- Entry Channel -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Entry Channel</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-number"
                  size="20"
                />
                <VChip
                  color="primary"
                  size="small"
                  label
                >
                  Channel {{ props.deviceData.device_channel_in ?? 'N/A' }}
                </VChip>
              </div>
            </div>
          </VCol>

          <!-- Exit Channel -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Exit Channel</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-number"
                  size="20"
                />
                <VChip
                  color="warning"
                  size="small"
                  label
                >
                  Channel {{ props.deviceData.device_channel_out ?? 'N/A' }}
                </VChip>
              </div>
            </div>
          </VCol>

          <!-- Location Section -->
          <VCol
            v-if="props.deviceData.geolocation"
            cols="12"
          >
            <VDivider class="my-4" />
            <div class="d-flex align-center gap-2 mb-4">
              <VIcon
                icon="tabler-map-pin"
                size="20"
                color="error"
              />
              <h6 class="text-h6 text-error">
                Location
              </h6>
            </div>
          </VCol>

          <!-- Geolocation -->
          <VCol
            v-if="props.deviceData.geolocation"
            cols="12"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Geolocation</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-current-location"
                  size="20"
                />
                <span class="text-body-1 font-mono">{{ props.deviceData.geolocation }}</span>
              </div>
            </div>
          </VCol>

          <!-- Status & Access Section -->
          <VCol cols="12">
            <VDivider class="my-4" />
            <div class="d-flex align-center gap-2 mb-4">
              <VIcon
                icon="tabler-settings"
                size="20"
                color="secondary"
              />
              <h6 class="text-h6 text-secondary">
                Status & Access
              </h6>
            </div>
          </VCol>

          <!-- Enabled Status -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Device Status</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-toggle-right"
                  size="20"
                />
                <VChip
                  :color="props.deviceData.enabled ? 'success' : 'error'"
                  size="small"
                  label
                >
                  {{ props.deviceData.enabled ? 'Enabled' : 'Disabled' }}
                </VChip>
              </div>
            </div>
          </VCol>

          <!-- Guest Access -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Guest Access</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-users"
                  size="20"
                />
                <VChip
                  :color="props.deviceData.guest_access ? 'info' : 'secondary'"
                  size="small"
                  label
                >
                  {{ props.deviceData.guest_access ? 'Allowed' : 'Denied' }}
                </VChip>
              </div>
            </div>
          </VCol>

          <!-- System Information -->
          <VCol cols="12">
            <VDivider class="my-4" />
            <div class="d-flex align-center gap-2 mb-4">
              <VIcon
                icon="tabler-clock"
                size="20"
                color="secondary"
              />
              <h6 class="text-h6 text-secondary">
                System Information
              </h6>
            </div>
          </VCol>

          <!-- Created At -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Created At</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-calendar-plus"
                  size="20"
                />
                <span class="text-body-1">{{ formatDate(props.deviceData.created_at) }}</span>
              </div>
            </div>
          </VCol>

          <!-- Updated At -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Last Updated</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-calendar-event"
                  size="20"
                />
                <span class="text-body-1">{{ formatDate(props.deviceData.updated_at) }}</span>
              </div>
            </div>
          </VCol>
        </VRow>

        <!-- Close Button -->
        <div class="d-flex justify-center mt-8">
          <VBtn
            color="secondary"
            variant="tonal"
            prepend-icon="tabler-x"
            size="large"
            @click="onClose"
          >
            Close
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>
