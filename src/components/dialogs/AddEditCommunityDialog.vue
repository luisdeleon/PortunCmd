<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'
import { supabase } from '@/lib/supabase'
import { useCountriesStates } from '@/composables/useCountriesStates'

interface CommunityData {
  id?: string
  name: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  geolocation?: string
  googlemaps?: string
}

interface Props {
  communityData?: CommunityData
  isDialogVisible: boolean
}

interface Emit {
  (e: 'update:isDialogVisible', value: boolean): void
  (e: 'community-saved'): void
}

const props = withDefaults(defineProps<Props>(), {
  communityData: () => ({
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    geolocation: '',
    googlemaps: '',
  }),
})

const emit = defineEmits<Emit>()

// Countries and States composable
const { getCountries, getStatesForCountry, countryHasStates, getCountryByName } = useCountriesStates()

const refCommunityForm = ref<VForm>()
const isSaving = ref(false)
const isEditMode = ref(false)

// Form data
const communityForm = ref<CommunityData>({
  id: '',
  name: '',
  address: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  geolocation: '',
  googlemaps: '',
})

// Countries and states
const countries = computed(() => getCountries().map(c => c.name))
const availableStates = ref<string[]>([])
const selectedCountryCode = ref<string>('')
const showStateDropdown = ref(false)

// Watch country changes to update state options
watch(() => communityForm.value.country, (newCountry) => {
  if (!newCountry) {
    availableStates.value = []
    showStateDropdown.value = false
    selectedCountryCode.value = ''
    communityForm.value.state = ''
    return
  }

  const country = getCountryByName(newCountry)
  if (country) {
    selectedCountryCode.value = country.code
    if (countryHasStates(country.code)) {
      availableStates.value = getStatesForCountry(country.code).map(s => s.name)
      showStateDropdown.value = true
    } else {
      availableStates.value = []
      showStateDropdown.value = false
    }
  }
})

// Watch for dialog visibility to populate form
watch(() => props.isDialogVisible, (newVal) => {
  if (newVal) {
    // Determine if we're in edit mode based on whether communityData has an id
    isEditMode.value = !!(props.communityData?.id)

    if (props.communityData?.id) {
      // Edit mode - populate form with existing data
      communityForm.value = { ...props.communityData }

      // Trigger country change to set up state dropdown
      if (props.communityData.country) {
        const country = getCountryByName(props.communityData.country)
        if (country) {
          selectedCountryCode.value = country.code
          if (countryHasStates(country.code)) {
            availableStates.value = getStatesForCountry(country.code).map(s => s.name)
            showStateDropdown.value = true
          }
        }
      }
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
  communityForm.value = {
    id: '',
    name: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    geolocation: '',
    googlemaps: '',
  }
  availableStates.value = []
  showStateDropdown.value = false
  selectedCountryCode.value = ''
  isEditMode.value = false
  refCommunityForm.value?.reset()
}

const onSubmit = async () => {
  const { valid } = await refCommunityForm.value!.validate()

  if (!valid) return

  try {
    isSaving.value = true

    // Check if we're editing or creating
    if (isEditMode.value) {
      // Update existing community
      const { error } = await supabase
        .from('community')
        .update({
          name: communityForm.value.name,
          address: communityForm.value.address || null,
          city: communityForm.value.city || null,
          state: communityForm.value.state || null,
          postal_code: communityForm.value.postal_code || null,
          country: communityForm.value.country || null,
          geolocation: communityForm.value.geolocation || null,
          googlemaps: communityForm.value.googlemaps || null,
        })
        .eq('id', communityForm.value.id)

      if (error) throw error
    } else {
      // Create new community - use provided ID or generate one
      const communityId = communityForm.value.id?.trim() || crypto.randomUUID()

      const { error } = await supabase
        .from('community')
        .insert({
          id: communityId,
          name: communityForm.value.name,
          address: communityForm.value.address || null,
          city: communityForm.value.city || null,
          state: communityForm.value.state || null,
          postal_code: communityForm.value.postal_code || null,
          country: communityForm.value.country || null,
          geolocation: communityForm.value.geolocation || null,
          googlemaps: communityForm.value.googlemaps || null,
        })

      if (error) throw error
    }

    // Success
    emit('community-saved')
    emit('update:isDialogVisible', false)
    resetForm()
  } catch (err: any) {
    console.error('Error saving community:', err)
    alert(`Failed to save community: ${err.message}`)
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
            {{ isEditMode ? 'Edit' : 'Add New' }} Community
          </h4>
          <p class="text-body-1 text-medium-emphasis">
            {{ isEditMode ? 'Update community information' : 'Create a new community' }}
          </p>
        </div>

        <!-- Form -->
        <VForm ref="refCommunityForm">
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

            <!-- Community ID (only for new communities) -->
            <VCol
              v-if="!isEditMode"
              cols="12"
            >
              <AppTextField
                v-model="communityForm.id"
                label="Community ID"
                placeholder="Leave empty for auto-generated ID"
                hint="Optional: Enter a custom ID or leave empty for auto-generation"
                persistent-hint
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-hash" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Community Name -->
            <VCol cols="12">
              <AppTextField
                v-model="communityForm.name"
                label="Community Name"
                placeholder="Enter community name"
                :rules="[requiredRule]"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-building-community" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Location Section -->
            <VCol cols="12">
              <VDivider class="my-2" />
              <div class="d-flex align-center gap-2 mb-3 mt-4">
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
              <AppTextField
                v-model="communityForm.address"
                label="Street Address"
                placeholder="Enter street address"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-map-2" />
                </template>
              </AppTextField>
            </VCol>

            <!-- City -->
            <VCol cols="12">
              <AppTextField
                v-model="communityForm.city"
                label="City"
                placeholder="Enter city"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-building" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Postal Code -->
            <VCol cols="12">
              <AppTextField
                v-model="communityForm.postal_code"
                label="Postal Code"
                placeholder="Enter postal code"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-mailbox" />
                </template>
              </AppTextField>
            </VCol>

            <!-- State (Dropdown or Text Field) -->
            <VCol cols="12">
              <!-- Show dropdown if country has predefined states -->
              <VAutocomplete
                v-if="showStateDropdown"
                v-model="communityForm.state"
                :items="availableStates"
                label="State/Province"
                placeholder="Select or search state"
                clearable
                clear-icon="tabler-x"
                auto-select-first
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-map-pin" />
                </template>
              </VAutocomplete>

              <!-- Show text field if country doesn't have predefined states -->
              <AppTextField
                v-else
                v-model="communityForm.state"
                label="State/Province/Region"
                placeholder="Enter state, province, or region"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-map-pin" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Country (Autocomplete) -->
            <VCol cols="12">
              <VAutocomplete
                v-model="communityForm.country"
                :items="countries"
                label="Country"
                placeholder="Select or search country"
                clearable
                clear-icon="tabler-x"
                auto-select-first
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-world" />
                </template>
              </VAutocomplete>
            </VCol>

            <!-- Maps & Coordinates Section -->
            <VCol cols="12">
              <VDivider class="my-2" />
              <div class="d-flex align-center gap-2 mb-3 mt-4">
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
            <VCol cols="12">
              <AppTextField
                v-model="communityForm.geolocation"
                label="Geolocation"
                placeholder="Enter coordinates (e.g., 40.7128, -74.0060)"
                hint="Format: latitude, longitude"
                persistent-hint
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-current-location" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Google Maps URL -->
            <VCol cols="12">
              <AppTextField
                v-model="communityForm.googlemaps"
                label="Google Maps URL"
                placeholder="https://maps.google.com/..."
                type="url"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-brand-google-maps" />
                </template>
              </AppTextField>
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
                {{ isSaving ? 'Saving...' : (isEditMode ? 'Update Community' : 'Create Community') }}
              </VBtn>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>
  </VDialog>
</template>
