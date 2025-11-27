<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'
import { supabase } from '@/lib/supabase'

interface DeviceData {
  id?: string
  device_name: string
  device_brand: string
  device_model: string
  api_url: string
  api_endpoint: string
  auth_key: string
  divice_turn: string
  direction_type: string
  community_id: string
  geolocation: string
  device_channel_in: number | null
  device_channel_out: number | null
  device_id_in: string
  device_id_out: string
  enabled: boolean
  guest_access: boolean
}

interface CommunityOption {
  title: string
  value: string
}

interface Props {
  deviceData?: DeviceData | null
  isDialogVisible: boolean
  communities: CommunityOption[]
}

interface Emit {
  (e: 'update:isDialogVisible', value: boolean): void
  (e: 'device-saved'): void
}

const props = withDefaults(defineProps<Props>(), {
  deviceData: null,
  communities: () => [],
})

const emit = defineEmits<Emit>()

const refDeviceForm = ref<VForm>()
const isSaving = ref(false)
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

// Form data with defaults
const deviceForm = ref<DeviceData>({
  device_name: '',
  device_brand: 'Shelly',
  device_model: '',
  api_url: 'https://shelly-144-eu.shelly.cloud',
  api_endpoint: 'device/relay/control',
  auth_key: '',
  divice_turn: 'on',
  direction_type: 'Both',
  community_id: '',
  geolocation: '',
  device_channel_in: 0,
  device_channel_out: 1,
  device_id_in: '',
  device_id_out: '',
  enabled: true,
  guest_access: false,
})

// Options
const brandOptions = [
  { title: 'Shelly', value: 'Shelly' },
  { title: 'Other', value: 'Other' },
]

const modelOptions = [
  { title: 'Pro 2', value: 'Pro 2' },
  { title: 'Pro 4', value: 'Pro 4' },
  { title: 'Plus 1', value: 'Plus 1' },
  { title: 'Plus 2PM', value: 'Plus 2PM' },
  { title: 'Other', value: 'Other' },
]

const directionOptions = [
  { title: 'Enter', value: 'Enter' },
  { title: 'Exit', value: 'Exit' },
  { title: 'Both', value: 'Both' },
]

const turnOptions = [
  { title: 'On', value: 'on' },
  { title: 'Off', value: 'off' },
  { title: 'Toggle', value: 'toggle' },
]

const channelOptions = [
  { title: 'Channel 0', value: 0 },
  { title: 'Channel 1', value: 1 },
  { title: 'Channel 2', value: 2 },
  { title: 'Channel 3', value: 3 },
]

// Watch for dialog visibility to populate form
watch(() => props.isDialogVisible, (newVal) => {
  if (newVal) {
    isEditMode.value = !!(props.deviceData?.id)
    // Duplicate mode: has data but no id
    isDuplicateMode.value = !!(props.deviceData && !props.deviceData.id)

    if (props.deviceData) {
      // Edit mode or Duplicate mode - populate form with existing data
      deviceForm.value = {
        id: props.deviceData.id || undefined,
        device_name: props.deviceData.device_name || '',
        device_brand: props.deviceData.device_brand || 'Shelly',
        device_model: props.deviceData.device_model || '',
        api_url: props.deviceData.api_url || 'https://shelly-144-eu.shelly.cloud',
        api_endpoint: props.deviceData.api_endpoint || 'device/relay/control',
        auth_key: props.deviceData.auth_key || '',
        divice_turn: props.deviceData.divice_turn || 'on',
        direction_type: props.deviceData.direction_type || 'Both',
        community_id: props.deviceData.community_id || '',
        geolocation: props.deviceData.geolocation || '',
        device_channel_in: props.deviceData.device_channel_in ?? 0,
        device_channel_out: props.deviceData.device_channel_out ?? 1,
        device_id_in: props.deviceData.device_id_in || '',
        device_id_out: props.deviceData.device_id_out || '',
        enabled: props.deviceData.enabled ?? true,
        guest_access: props.deviceData.guest_access ?? false,
      }
    } else {
      // Create mode - reset to defaults
      resetForm()
      isEditMode.value = false
      isDuplicateMode.value = false
    }
  } else if (!newVal) {
    resetForm()
  }
})

const resetForm = () => {
  deviceForm.value = {
    device_name: '',
    device_brand: 'Shelly',
    device_model: '',
    api_url: 'https://shelly-144-eu.shelly.cloud',
    api_endpoint: 'device/relay/control',
    auth_key: '',
    divice_turn: 'on',
    direction_type: 'Both',
    community_id: '',
    geolocation: '',
    device_channel_in: 0,
    device_channel_out: 1,
    device_id_in: '',
    device_id_out: '',
    enabled: true,
    guest_access: false,
  }
  isEditMode.value = false
  isDuplicateMode.value = false
  showAuthKey.value = false
  refDeviceForm.value?.reset()
}

const onSubmit = async () => {
  const { valid } = await refDeviceForm.value!.validate()

  if (!valid) return

  try {
    isSaving.value = true

    const devicePayload = {
      device_name: deviceForm.value.device_name || null,
      device_brand: deviceForm.value.device_brand || null,
      device_model: deviceForm.value.device_model || null,
      api_url: deviceForm.value.api_url || null,
      api_endpoint: deviceForm.value.api_endpoint || null,
      auth_key: deviceForm.value.auth_key || null,
      divice_turn: deviceForm.value.divice_turn || null,
      direction_type: deviceForm.value.direction_type || null,
      community_id: deviceForm.value.community_id || null,
      geolocation: deviceForm.value.geolocation || null,
      device_channel_in: deviceForm.value.device_channel_in,
      device_channel_out: deviceForm.value.device_channel_out,
      device_id_in: deviceForm.value.device_id_in || null,
      device_id_out: deviceForm.value.device_id_out || null,
      enabled: deviceForm.value.enabled,
      guest_access: deviceForm.value.guest_access,
    }

    if (isEditMode.value && deviceForm.value.id) {
      // Update existing device
      const { error } = await supabase
        .from('automation_devices')
        .update(devicePayload)
        .eq('id', deviceForm.value.id)

      if (error) throw error
    } else {
      // Create new device
      const { error } = await supabase
        .from('automation_devices')
        .insert(devicePayload)

      if (error) throw error
    }

    // Success
    emit('device-saved')
    emit('update:isDialogVisible', false)
    resetForm()
  } catch (err: any) {
    console.error('Error saving device:', err)
    alert(`Failed to save device: ${err.message}`)
  } finally {
    isSaving.value = false
  }
}

const onReset = () => {
  emit('update:isDialogVisible', false)
  resetForm()
}

// Validation rules
const requiredRule = (v: string) => !!v || 'This field is required'
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 800"
    :model-value="props.isDialogVisible"
    @update:model-value="onReset"
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="onReset" />

    <VCard class="pa-sm-10 pa-2">
      <VCardText>
        <!-- Title -->
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
            {{ isEditMode ? 'Edit' : 'Add New' }} Device
          </h4>
          <p class="text-body-1 text-medium-emphasis">
            {{ isEditMode ? 'Update automation device configuration' : 'Configure a new automation device' }}
          </p>
        </div>

        <!-- Form -->
        <VForm ref="refDeviceForm">
          <VRow>
            <!-- Basic Information Section -->
            <VCol cols="12">
              <div class="d-flex align-center gap-2 mb-3">
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

            <!-- Device Name -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="deviceForm.device_name"
                label="Device Name *"
                placeholder="Enter device name"
                :rules="[requiredRule]"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-device-desktop" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Community -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="deviceForm.community_id"
                label="Community *"
                placeholder="Select community"
                :items="props.communities"
                :rules="[requiredRule]"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-building-community" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Brand -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="deviceForm.device_brand"
                label="Brand"
                placeholder="Select brand"
                :items="brandOptions"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-brand-apple" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Model -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="deviceForm.device_model"
                label="Model"
                placeholder="Select model"
                :items="modelOptions"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-cpu" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Device IDs Section -->
            <VCol cols="12">
              <VDivider class="my-2" />
              <div class="d-flex align-center gap-2 mb-3 mt-4">
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
              md="6"
            >
              <AppTextField
                v-model="deviceForm.device_id_in"
                label="Device ID (In)"
                placeholder="e.g., c8f09e881dd0"
                hint="Hardware ID for entry relay"
                persistent-hint
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-login" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Device ID Out -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="deviceForm.device_id_out"
                label="Device ID (Out)"
                placeholder="e.g., c8f09e881dd0"
                hint="Hardware ID for exit relay"
                persistent-hint
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-logout" />
                </template>
              </AppTextField>
            </VCol>

            <!-- API Configuration Section -->
            <VCol cols="12">
              <VDivider class="my-2" />
              <div class="d-flex align-center gap-2 mb-3 mt-4">
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
              <AppTextField
                v-model="deviceForm.api_url"
                label="API URL"
                placeholder="https://shelly-144-eu.shelly.cloud"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-world" />
                </template>
              </AppTextField>
            </VCol>

            <!-- API Endpoint -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="deviceForm.api_endpoint"
                label="API Endpoint"
                placeholder="device/relay/control"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-route" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Auth Key -->
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
                placeholder="Enter authentication key"
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

            <!-- Relay Configuration Section -->
            <VCol cols="12">
              <VDivider class="my-2" />
              <div class="d-flex align-center gap-2 mb-3 mt-4">
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
              md="6"
            >
              <AppSelect
                v-model="deviceForm.direction_type"
                label="Direction Type"
                placeholder="Select direction"
                :items="directionOptions"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-arrows-left-right" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Device Turn -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="deviceForm.divice_turn"
                label="Turn Action"
                placeholder="Select action"
                :items="turnOptions"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-toggle-right" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Channel In -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="deviceForm.device_channel_in"
                label="Entry Channel"
                placeholder="Select channel"
                :items="channelOptions"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-number" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Channel Out -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="deviceForm.device_channel_out"
                label="Exit Channel"
                placeholder="Select channel"
                :items="channelOptions"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-number" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Location Section -->
            <VCol cols="12">
              <VDivider class="my-2" />
              <div class="d-flex align-center gap-2 mb-3 mt-4">
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
            <VCol cols="12">
              <AppTextField
                v-model="deviceForm.geolocation"
                label="Geolocation"
                placeholder="e.g., 20.09788563257816, -98.78004411194858"
                hint="Format: latitude, longitude"
                persistent-hint
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-current-location" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Status Section -->
            <VCol cols="12">
              <VDivider class="my-2" />
              <div class="d-flex align-center gap-2 mb-3 mt-4">
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

            <!-- Enabled Switch -->
            <VCol
              cols="12"
              md="6"
            >
              <VSwitch
                v-model="deviceForm.enabled"
                label="Device Enabled"
                color="success"
                hide-details
              />
            </VCol>

            <!-- Guest Access Switch -->
            <VCol
              cols="12"
              md="6"
            >
              <VSwitch
                v-model="deviceForm.guest_access"
                label="Guest Access Allowed"
                color="info"
                hide-details
              />
            </VCol>
          </VRow>

          <!-- Action buttons -->
          <VRow class="mt-8">
            <VCol
              cols="12"
              sm="6"
              order="2"
              order-sm="1"
            >
              <VBtn
                color="secondary"
                variant="outlined"
                :disabled="isSaving"
                prepend-icon="tabler-x"
                size="large"
                block
                @click="onReset"
              >
                Cancel
              </VBtn>
            </VCol>
            <VCol
              cols="12"
              sm="6"
              order="1"
              order-sm="2"
            >
              <VBtn
                color="primary"
                :loading="isSaving"
                :disabled="isSaving"
                prepend-icon="tabler-check"
                size="large"
                block
                @click="onSubmit"
              >
                {{ isSaving ? 'Saving...' : (isEditMode ? 'Update Device' : 'Create Device') }}
              </VBtn>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>
  </VDialog>
</template>
