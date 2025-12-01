<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'
import { supabase } from '@/lib/supabase'
import { useCountriesStates } from '@/composables/useCountriesStates'

const { t } = useI18n({ useScope: 'global' })

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

// Community ID validation state
const isCheckingId = ref(false)
const idAlreadyExists = ref(false)
const idCheckDebounceTimer = ref<ReturnType<typeof setTimeout> | null>(null)

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
  // Clear debounce timer if active
  if (idCheckDebounceTimer.value) {
    clearTimeout(idCheckDebounceTimer.value)
    idCheckDebounceTimer.value = null
  }

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
  isCheckingId.value = false
  idAlreadyExists.value = false
  refCommunityForm.value?.reset()
}

const onSubmit = async () => {
  const { valid } = await refCommunityForm.value!.validate()

  if (!valid) return

  // Prevent submission if ID already exists or is still being checked
  if (idAlreadyExists.value || isCheckingId.value) return

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

// Check if community ID already exists in database
const checkCommunityIdExists = async (id: string): Promise<boolean> => {
  if (!id.trim()) return false

  const { data, error } = await supabase
    .from('community')
    .select('id')
    .eq('id', id.trim())
    .maybeSingle()

  if (error) {
    console.error('Error checking community ID:', error)
    return false
  }

  return !!data
}

// Watch community ID changes to check for duplicates (debounced)
watch(() => communityForm.value.id, (newId) => {
  // Clear previous timer
  if (idCheckDebounceTimer.value) {
    clearTimeout(idCheckDebounceTimer.value)
  }

  // Reset state if empty or in edit mode
  if (!newId?.trim() || isEditMode.value) {
    idAlreadyExists.value = false
    isCheckingId.value = false
    return
  }

  // Start checking indicator
  isCheckingId.value = true
  idAlreadyExists.value = false

  // Debounce the check (500ms)
  idCheckDebounceTimer.value = setTimeout(async () => {
    const exists = await checkCommunityIdExists(newId)
    idAlreadyExists.value = exists
    isCheckingId.value = false
  }, 500)
})

// Validation rules
const requiredRule = (v: string) => !!v || t('communityDialog.validation.required')

// Community ID validation rule
const communityIdRule = () => {
  if (idAlreadyExists.value) {
    return t('communityDialog.validation.idAlreadyExists')
  }
  return true
}
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
            {{ isEditMode ? t('communityDialog.editTitle') : t('communityDialog.addTitle') }}
          </h4>
          <p class="text-body-1 text-medium-emphasis">
            {{ isEditMode ? t('communityDialog.editSubtitle') : t('communityDialog.addSubtitle') }}
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
                  {{ t('communityDialog.sections.basicInfo') }}
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
                :label="t('communityDialog.fields.communityId')"
                :placeholder="t('communityDialog.fields.communityIdPlaceholder')"
                :hint="isCheckingId ? t('communityDialog.validation.checkingId') : t('communityDialog.fields.communityIdHint')"
                :error="idAlreadyExists"
                :error-messages="idAlreadyExists ? t('communityDialog.validation.idAlreadyExists') : undefined"
                :loading="isCheckingId"
                :rules="[communityIdRule]"
                persistent-hint
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-hash" />
                </template>
                <template
                  v-if="isCheckingId"
                  #append-inner
                >
                  <VProgressCircular
                    size="20"
                    width="2"
                    indeterminate
                    color="primary"
                  />
                </template>
                <template
                  v-else-if="communityForm.id && !idAlreadyExists"
                  #append-inner
                >
                  <VIcon
                    icon="tabler-check"
                    color="success"
                  />
                </template>
              </AppTextField>
            </VCol>

            <!-- Community Name -->
            <VCol cols="12">
              <AppTextField
                v-model="communityForm.name"
                :label="t('communityDialog.fields.communityName')"
                :placeholder="t('communityDialog.fields.communityNamePlaceholder')"
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
                  {{ t('communityDialog.sections.location') }}
                </h6>
              </div>
            </VCol>

            <!-- Address -->
            <VCol cols="12">
              <AppTextField
                v-model="communityForm.address"
                :label="t('communityDialog.fields.streetAddress')"
                :placeholder="t('communityDialog.fields.streetAddressPlaceholder')"
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
                :label="t('communityDialog.fields.city')"
                :placeholder="t('communityDialog.fields.cityPlaceholder')"
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
                :label="t('communityDialog.fields.postalCode')"
                :placeholder="t('communityDialog.fields.postalCodePlaceholder')"
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
                :label="t('communityDialog.fields.stateProvince')"
                :placeholder="t('communityDialog.fields.stateProvincePlaceholder')"
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
                :label="t('communityDialog.fields.stateProvinceRegion')"
                :placeholder="t('communityDialog.fields.stateProvinceRegionPlaceholder')"
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
                :label="t('communityDialog.fields.country')"
                :placeholder="t('communityDialog.fields.countryPlaceholder')"
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
                  {{ t('communityDialog.sections.mapsCoordinates') }}
                </h6>
              </div>
            </VCol>

            <!-- Geolocation -->
            <VCol cols="12">
              <AppTextField
                v-model="communityForm.geolocation"
                :label="t('communityDialog.fields.geolocation')"
                :placeholder="t('communityDialog.fields.geolocationPlaceholder')"
                :hint="t('communityDialog.fields.geolocationHint')"
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
                :label="t('communityDialog.fields.googleMapsUrl')"
                :placeholder="t('communityDialog.fields.googleMapsUrlPlaceholder')"
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
                {{ t('communityDialog.buttons.cancel') }}
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
                :disabled="isSaving || isCheckingId || idAlreadyExists"
                prepend-icon="tabler-check"
                size="large"
                block
                @click="onSubmit"
              >
                {{ isSaving ? t('communityDialog.buttons.saving') : (isEditMode ? t('communityDialog.buttons.update') : t('communityDialog.buttons.create')) }}
              </VBtn>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>
  </VDialog>
</template>
