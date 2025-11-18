<script setup lang="ts">
interface CommunityData {
  id: string
  name?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  geolocation?: string
  googlemaps?: string
  property_count?: number
  created_at?: string
  updated_at?: string
}

interface Props {
  communityData: CommunityData | null
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
</script>

<template>
  <VDialog
    :width="$vuetify.display.smAndDown ? 'auto' : 700"
    :model-value="props.isDialogVisible"
    @update:model-value="onClose"
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="onClose" />

    <VCard v-if="props.communityData">
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
              icon="tabler-building-community"
              size="48"
            />
          </VAvatar>
          <h4 class="text-h4 mb-2">
            {{ props.communityData.name || 'Community Details' }}
          </h4>
          <VChip
            color="primary"
            size="small"
            label
          >
            {{ props.communityData.property_count || 0 }} Properties
          </VChip>
        </div>

        <!-- Community Information -->
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

          <!-- UUID -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">UUID</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-key"
                  size="20"
                />
                <span class="text-body-1 font-weight-medium font-mono">{{ props.communityData.id?.substring(0, 8) || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- Community ID -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Community ID</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-hash"
                  size="20"
                />
                <span class="text-body-1 font-weight-medium">{{ props.communityData.id }}</span>
              </div>
            </div>
          </VCol>

          <!-- Community Name -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Community Name</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-building-community"
                  size="20"
                />
                <span class="text-body-1 font-weight-medium">{{ props.communityData.name || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- Location Section -->
          <VCol cols="12">
            <VDivider class="my-4" />
            <div class="d-flex align-center gap-2 mb-4">
              <VIcon
                icon="tabler-map-pin"
                size="20"
                color="success"
              />
              <h6 class="text-h6 text-success">
                Location Details
              </h6>
            </div>
          </VCol>

          <!-- Address -->
          <VCol cols="12">
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Street Address</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-map-2"
                  size="20"
                />
                <span class="text-body-1">{{ props.communityData.address || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- City -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">City</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-building"
                  size="20"
                />
                <span class="text-body-1">{{ props.communityData.city || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- Postal Code -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Postal Code</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-mailbox"
                  size="20"
                />
                <span class="text-body-1">{{ props.communityData.postal_code || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- State -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">State/Province</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-map-pin"
                  size="20"
                />
                <span class="text-body-1">{{ props.communityData.state || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- Country -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Country</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-world"
                  size="20"
                />
                <span class="text-body-1">{{ props.communityData.country || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- Maps & Coordinates Section -->
          <VCol
            v-if="props.communityData.geolocation || props.communityData.googlemaps"
            cols="12"
          >
            <VDivider class="my-4" />
            <div class="d-flex align-center gap-2 mb-4">
              <VIcon
                icon="tabler-current-location"
                size="20"
                color="warning"
              />
              <h6 class="text-h6 text-warning">
                Maps & Coordinates
              </h6>
            </div>
          </VCol>

          <!-- Geolocation -->
          <VCol
            v-if="props.communityData.geolocation"
            cols="12"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Geolocation</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-current-location"
                  size="20"
                />
                <span class="text-body-1 font-mono">{{ props.communityData.geolocation }}</span>
              </div>
            </div>
          </VCol>

          <!-- Google Maps URL -->
          <VCol
            v-if="props.communityData.googlemaps"
            cols="12"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Google Maps</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-brand-google-maps"
                  size="20"
                />
                <a
                  :href="props.communityData.googlemaps"
                  target="_blank"
                  class="text-primary text-decoration-none"
                >
                  Open in Google Maps
                  <VIcon
                    icon="tabler-external-link"
                    size="16"
                    class="ml-1"
                  />
                </a>
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
                <span class="text-body-1">{{ formatDate(props.communityData.created_at) }}</span>
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
                <span class="text-body-1">{{ formatDate(props.communityData.updated_at) }}</span>
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
