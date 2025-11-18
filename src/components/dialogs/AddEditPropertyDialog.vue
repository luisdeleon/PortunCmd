<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'
import { supabase } from '@/lib/supabase'

interface PropertyData {
  id?: string
  name: string
  address: string
  community_id: string
}

interface Props {
  propertyData?: PropertyData
  isDialogVisible: boolean
}

interface Emit {
  (e: 'update:isDialogVisible', value: boolean): void
  (e: 'property-saved'): void
}

const props = withDefaults(defineProps<Props>(), {
  propertyData: () => ({
    name: '',
    address: '',
    community_id: '',
  }),
})

const emit = defineEmits<Emit>()

const refPropertyForm = ref<VForm>()
const isSaving = ref(false)
const isEditMode = ref(false)

// Form data
const propertyForm = ref<PropertyData>({
  id: '',
  name: '',
  address: '',
  community_id: '',
})

// Communities list
const communities = ref<Array<{ title: string; value: string }>>([])
const isLoadingCommunities = ref(false)

// Fetch communities
const fetchCommunities = async () => {
  try {
    isLoadingCommunities.value = true

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
  } finally {
    isLoadingCommunities.value = false
  }
}

// Watch for dialog visibility to populate form
watch(() => props.isDialogVisible, (newVal) => {
  if (newVal) {
    // Fetch communities when dialog opens
    fetchCommunities()

    // Determine if we're in edit mode based on whether propertyData has an id
    isEditMode.value = !!(props.propertyData?.id)

    if (props.propertyData?.id) {
      // Edit mode - populate form with existing data
      propertyForm.value = { ...props.propertyData }
    } else {
      // Create mode - reset to empty form
      resetForm()
      isEditMode.value = false
    }
  } else if (!newVal) {
    // Reset form when dialog closes
    resetForm()
  }
})

const resetForm = () => {
  propertyForm.value = {
    id: '',
    name: '',
    address: '',
    community_id: '',
  }
  isEditMode.value = false
  refPropertyForm.value?.reset()
}

const onSubmit = async () => {
  const { valid } = await refPropertyForm.value!.validate()

  if (!valid) return

  try {
    isSaving.value = true

    // Check if we're editing or creating
    if (isEditMode.value) {
      // Update existing property
      const { error } = await supabase
        .from('property')
        .update({
          name: propertyForm.value.name,
          address: propertyForm.value.address,
          community_id: propertyForm.value.community_id,
        })
        .eq('id', propertyForm.value.id)

      if (error) throw error
    } else {
      // Create new property - use provided ID or generate one
      const propertyId = propertyForm.value.id?.trim() || crypto.randomUUID()

      const { error } = await supabase
        .from('property')
        .insert({
          id: propertyId,
          name: propertyForm.value.name,
          address: propertyForm.value.address,
          community_id: propertyForm.value.community_id,
        })

      if (error) throw error
    }

    // Success
    emit('property-saved')
    emit('update:isDialogVisible', false)
    resetForm()
  } catch (err: any) {
    console.error('Error saving property:', err)
    alert(`Failed to save property: ${err.message}`)
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
    :width="$vuetify.display.smAndDown ? 'auto' : 700"
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
            {{ isEditMode ? 'Edit' : 'Add New' }} Property
          </h4>
          <p class="text-body-1 text-medium-emphasis">
            {{ isEditMode ? 'Update property information' : 'Create a new property' }}
          </p>
        </div>

        <!-- Form -->
        <VForm ref="refPropertyForm">
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

            <!-- Property ID (only for new properties) -->
            <VCol
              v-if="!isEditMode"
              cols="12"
            >
              <AppTextField
                v-model="propertyForm.id"
                label="Property ID"
                placeholder="Leave empty for auto-generated ID"
                hint="Optional: Enter a custom ID or leave empty for auto-generation"
                persistent-hint
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-hash" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Property Name -->
            <VCol cols="12">
              <AppTextField
                v-model="propertyForm.name"
                label="Property Name"
                placeholder="Enter property name (e.g., Apt 101, House 5)"
                :rules="[requiredRule]"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-home" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Address -->
            <VCol cols="12">
              <AppTextField
                v-model="propertyForm.address"
                label="Address"
                placeholder="Enter property address"
                :rules="[requiredRule]"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-map-2" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Community Section -->
            <VCol cols="12">
              <VDivider class="my-2" />
              <div class="d-flex align-center gap-2 mb-3 mt-4">
                <VIcon
                  icon="tabler-building-community"
                  size="20"
                  color="success"
                />
                <h6 class="text-h6 text-success">
                  Community Assignment
                </h6>
              </div>
            </VCol>

            <!-- Community Selection (Required) -->
            <VCol cols="12">
              <VAutocomplete
                v-model="propertyForm.community_id"
                :items="communities"
                :loading="isLoadingCommunities"
                label="Community *"
                placeholder="Select a community"
                :rules="[requiredRule]"
                clearable
                clear-icon="tabler-x"
                auto-select-first
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-building-community" />
                </template>
              </VAutocomplete>
              <div class="text-caption text-medium-emphasis mt-1">
                <VIcon
                  icon="tabler-info-circle"
                  size="16"
                  class="me-1"
                />
                Every property must belong to a community
              </div>
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
                color="success"
                :loading="isSaving"
                :disabled="isSaving"
                prepend-icon="tabler-check"
                size="large"
                block
                @click="onSubmit"
              >
                {{ isSaving ? 'Saving...' : (isEditMode ? 'Update Property' : 'Create Property') }}
              </VBtn>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>
  </VDialog>
</template>
