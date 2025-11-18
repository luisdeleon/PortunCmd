<script setup lang="ts">
interface PropertyData {
  id: string
  name: string
  address: string
  community_id: string
  community?: {
    id: string
    name?: string
    city?: string
    country?: string
  }
  created_at?: string
  updated_at?: string
}

interface Props {
  propertyData: PropertyData | null
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

    <VCard v-if="props.propertyData">
      <VCardText class="pa-sm-10 pa-6">
        <!-- Header -->
        <div class="text-center mb-6">
          <VAvatar
            size="88"
            color="success"
            variant="tonal"
            class="mb-4"
          >
            <VIcon
              icon="tabler-home"
              size="48"
            />
          </VAvatar>
          <h4 class="text-h4 mb-2">
            {{ props.propertyData.name || 'Property Details' }}
          </h4>
          <VChip
            color="primary"
            size="small"
            label
          >
            {{ props.propertyData.id }}
          </VChip>
        </div>

        <!-- Property Information -->
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
                <span class="text-body-1 font-weight-medium font-mono">{{ props.propertyData.id?.substring(0, 8) || 'N/A' }}</span>
              </div>
            </div>
          </VCol>

          <!-- Property ID -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Property ID</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-hash"
                  size="20"
                />
                <span class="text-body-1 font-weight-medium">{{ props.propertyData.id }}</span>
              </div>
            </div>
          </VCol>

          <!-- Property Name -->
          <VCol
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Property Name</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-home"
                  size="20"
                />
                <span class="text-body-1 font-weight-medium">{{ props.propertyData.name }}</span>
              </div>
            </div>
          </VCol>

          <!-- Address -->
          <VCol cols="12">
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Address</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-map-2"
                  size="20"
                />
                <span class="text-body-1">{{ props.propertyData.address }}</span>
              </div>
            </div>
          </VCol>

          <!-- Community Section -->
          <VCol cols="12">
            <VDivider class="my-4" />
            <div class="d-flex align-center gap-2 mb-4">
              <VIcon
                icon="tabler-building-community"
                size="20"
                color="success"
              />
              <h6 class="text-h6 text-success">
                Community Information
              </h6>
            </div>
          </VCol>

          <!-- Community ID -->
          <VCol cols="12">
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Community ID</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-building-community"
                  size="20"
                />
                <span class="text-body-1 font-weight-medium">{{ props.propertyData.community_id }}</span>
              </div>
            </div>
          </VCol>

          <!-- Community Name (if available) -->
          <VCol
            v-if="props.propertyData.community?.name"
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Community Name</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-building"
                  size="20"
                />
                <span class="text-body-1">{{ props.propertyData.community.name }}</span>
              </div>
            </div>
          </VCol>

          <!-- Community Location (if available) -->
          <VCol
            v-if="props.propertyData.community?.city || props.propertyData.community?.country"
            cols="12"
            sm="6"
          >
            <div class="d-flex flex-column gap-1">
              <span class="text-sm text-disabled">Community Location</span>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-map-pin"
                  size="20"
                />
                <span class="text-body-1">
                  {{ [props.propertyData.community.city, props.propertyData.community.country].filter(Boolean).join(', ') || 'N/A' }}
                </span>
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
                <span class="text-body-1">{{ formatDate(props.propertyData.created_at) }}</span>
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
                <span class="text-body-1">{{ formatDate(props.propertyData.updated_at) }}</span>
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
