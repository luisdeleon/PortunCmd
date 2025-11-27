<script setup lang="ts">
import { supabase } from '@/lib/supabase'
import QRCodeDisplay from '@/components/QRCodeDisplay.vue'

definePage({
  meta: {
    public: false,
    navActiveLink: 'apps-visitor-add',
    action: 'create',
    subject: 'visitor_pass',
  },
})

const router = useRouter()

// User data
const userData = useCookie<any>('userData')

// Form state
const isLoading = ref(false)
const isSubmitting = ref(false)
const snackbar = ref({ show: false, message: '', color: 'success' })

// Success state
const isSuccess = ref(false)
const createdVisitor = ref<any>(null)

// Form data
const form = ref({
  visitor_name: '',
  visitor_type: 'Guest',
  community_id: '',
  property_id: '',
  validity_type: 'single', // single, day, week, unlimited
  validity_end: null as Date | null,
  entries_allowed: 1,
  notes: '',
  document_num: '',
})

// Options
const communities = ref<{ title: string; value: string }[]>([])
const properties = ref<{ title: string; value: string }[]>([])

const visitorTypes = [
  { title: 'Guest', value: 'Guest', icon: 'tabler-user-check', color: 'primary' },
  { title: 'Family', value: 'Family', icon: 'tabler-users-group', color: 'success' },
  { title: 'Party', value: 'Party', icon: 'tabler-confetti', color: 'warning' },
  { title: 'Delivery', value: 'Delivery', icon: 'tabler-truck-delivery', color: 'info' },
  { title: 'Service', value: 'Service', icon: 'tabler-tools', color: 'secondary' },
  { title: 'Contractor', value: 'Contractor', icon: 'tabler-helmet', color: 'error' },
]

// Resolve visitor type icon and color
const resolveTypeVariant = (type: string) => {
  const typeLower = type?.toLowerCase() || ''
  if (typeLower.includes('family') || typeLower.includes('familia'))
    return { color: 'success', icon: 'tabler-users-group' }
  if (typeLower.includes('guest') || typeLower.includes('invitado'))
    return { color: 'primary', icon: 'tabler-user-check' }
  if (typeLower.includes('party') || typeLower.includes('fiesta'))
    return { color: 'warning', icon: 'tabler-confetti' }
  if (typeLower.includes('delivery') || typeLower.includes('entrega'))
    return { color: 'info', icon: 'tabler-truck-delivery' }
  if (typeLower.includes('service') || typeLower.includes('servicio'))
    return { color: 'secondary', icon: 'tabler-tools' }
  if (typeLower.includes('contractor') || typeLower.includes('contratista'))
    return { color: 'error', icon: 'tabler-helmet' }
  return { color: 'primary', icon: 'tabler-user-check' }
}

const validityOptions = [
  { title: 'Single Entry', value: 'single', description: 'Valid for one entry only' },
  { title: 'Today Only', value: 'day', description: 'Valid until end of today' },
  { title: 'One Week', value: 'week', description: 'Valid for 7 days' },
  { title: 'Custom Date', value: 'custom', description: 'Choose a specific end date' },
  { title: 'Unlimited', value: 'unlimited', description: 'No expiration (unlimited entries)' },
]

// Fetch communities for user scope
const fetchCommunities = async () => {
  try {
    isLoading.value = true

    // Get user's property owner records to find their communities
    const { data: propertyOwners, error: poError } = await supabase
      .from('property_owner')
      .select('community_id, community:community_id(id, name)')
      .eq('profile_id', userData.value?.id)

    if (poError) {
      console.error('Error fetching property owners:', poError)
    }

    // Get unique communities
    const communityMap = new Map<string, string>()

    propertyOwners?.forEach(po => {
      if (po.community_id && po.community) {
        communityMap.set(po.community_id, (po.community as any).name || po.community_id)
      }
    })

    // If admin or higher, fetch all communities
    const role = userData.value?.role
    if (role && !['Guard', 'Resident'].includes(role)) {
      const { data: allCommunities, error: commError } = await supabase
        .from('community')
        .select('id, name')
        .order('name')

      if (!commError && allCommunities) {
        allCommunities.forEach(c => {
          communityMap.set(c.id, c.name || c.id)
        })
      }
    }

    communities.value = Array.from(communityMap).map(([id, name]) => ({
      title: name,
      value: id,
    }))

    // Auto-select if only one community
    if (communities.value.length === 1) {
      form.value.community_id = communities.value[0].value
      await fetchProperties()
    }
  } catch (err) {
    console.error('Error in fetchCommunities:', err)
  } finally {
    isLoading.value = false
  }
}

// Fetch properties for selected community
const fetchProperties = async () => {
  if (!form.value.community_id) {
    properties.value = []
    form.value.property_id = ''
    return
  }

  try {
    // Get user's properties in this community
    const { data: propertyOwners, error: poError } = await supabase
      .from('property_owner')
      .select('property_id, property:property_id(id, name)')
      .eq('profile_id', userData.value?.id)
      .eq('community_id', form.value.community_id)

    if (poError) {
      console.error('Error fetching properties:', poError)
    }

    const propertyMap = new Map<string, string>()

    propertyOwners?.forEach(po => {
      if (po.property_id && po.property) {
        propertyMap.set(po.property_id, (po.property as any).name || po.property_id)
      }
    })

    // If admin or higher, fetch all properties in community
    const role = userData.value?.role
    if (role && !['Guard', 'Resident'].includes(role)) {
      const { data: allProperties, error: propError } = await supabase
        .from('property')
        .select('id, name')
        .eq('community_id', form.value.community_id)
        .order('name')

      if (!propError && allProperties) {
        allProperties.forEach(p => {
          propertyMap.set(p.id, p.name || p.id)
        })
      }
    }

    properties.value = Array.from(propertyMap).map(([id, name]) => ({
      title: name,
      value: id,
    }))

    // Auto-select if only one property
    if (properties.value.length === 1) {
      form.value.property_id = properties.value[0].value
    }
  } catch (err) {
    console.error('Error in fetchProperties:', err)
  }
}

// Generate random UID
const generateUID = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Calculate validity end date
const calculateValidityEnd = () => {
  const now = new Date()

  switch (form.value.validity_type) {
    case 'single':
      // Same time as creation (single entry, no time extension)
      return now
    case 'day':
      // End of today
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    case 'week':
      // 7 days from now
      const weekLater = new Date(now)
      weekLater.setDate(weekLater.getDate() + 7)
      return weekLater
    case 'custom':
      // Handle string or Date from date picker
      if (form.value.validity_end) {
        return form.value.validity_end instanceof Date
          ? form.value.validity_end
          : new Date(form.value.validity_end)
      }
      return now
    case 'unlimited':
      // Far future date
      return new Date(2099, 11, 31, 23, 59, 59)
    default:
      return now
  }
}

// Calculate entries allowed
const calculateEntriesAllowed = () => {
  switch (form.value.validity_type) {
    case 'single':
      return 1
    case 'unlimited':
      return 9999
    default:
      return form.value.entries_allowed || 1
  }
}

// Submit form
const submitForm = async () => {
  // Validation
  if (!form.value.visitor_name.trim()) {
    snackbar.value = { show: true, message: 'Please enter visitor name', color: 'error' }
    return
  }
  if (!form.value.community_id) {
    snackbar.value = { show: true, message: 'Please select a community', color: 'error' }
    return
  }
  if (!form.value.property_id) {
    snackbar.value = { show: true, message: 'Please select a property', color: 'error' }
    return
  }
  if (form.value.validity_type === 'custom' && !form.value.validity_end) {
    snackbar.value = { show: true, message: 'Please select a validity end date', color: 'error' }
    return
  }

  try {
    isSubmitting.value = true

    const recordUid = generateUID()
    const randRecordUid = generateUID()
    const validityEnd = calculateValidityEnd()
    const entriesAllowed = calculateEntriesAllowed()

    const visitorData = {
      host_uid: userData.value?.id,
      record_uid: recordUid,
      rand_record_uid: randRecordUid,
      record_url: `https://qr.portun.app/${recordUid}`,
      visitor_name: form.value.visitor_name.trim(),
      visitor_type: form.value.visitor_type,
      community_id: form.value.community_id,
      property_id: form.value.property_id,
      validity_start: new Date().toISOString(),
      validity_end: validityEnd?.toISOString(),
      entries_allowed: entriesAllowed,
      entries_used: 0,
      notes: form.value.notes || '',
      document_num: form.value.document_num || '',
    }

    const { data, error } = await supabase
      .from('visitor_records_uid')
      .insert(visitorData)
      .select(`
        *,
        host:host_uid(id, display_name),
        community:community_id(id, name),
        property:property_id(id, name)
      `)
      .single()

    if (error) {
      console.error('Error creating visitor pass:', error)
      snackbar.value = { show: true, message: 'Failed to create visitor pass', color: 'error' }
      return
    }

    createdVisitor.value = data
    isSuccess.value = true
    snackbar.value = { show: true, message: 'Visitor pass created successfully!', color: 'success' }
  } catch (err) {
    console.error('Error in submitForm:', err)
    snackbar.value = { show: true, message: 'An error occurred', color: 'error' }
  } finally {
    isSubmitting.value = false
  }
}

// Create another pass
const createAnother = () => {
  isSuccess.value = false
  createdVisitor.value = null
  form.value = {
    visitor_name: '',
    visitor_type: 'Guest',
    community_id: form.value.community_id, // Keep community
    property_id: form.value.property_id, // Keep property
    validity_type: 'single',
    validity_end: null,
    entries_allowed: 1,
    notes: '',
    document_num: '',
  }
}

// Format date - show month/day, with + if future year or >12 months
const formatDate = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  const now = new Date()

  if (date.getFullYear() >= 2099) return 'Unlimited'

  // Check if date is in a different year or more than 12 months away
  const monthsDiff = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth())
  const isDifferentYear = date.getFullYear() !== now.getFullYear()
  const isMoreThan12Months = monthsDiff > 12

  const suffix = (isDifferentYear || isMoreThan12Months) ? '+' : ''

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) + suffix
}

// Watch community changes
watch(() => form.value.community_id, () => {
  form.value.property_id = ''
  fetchProperties()
})

// Lifecycle
onMounted(() => {
  fetchCommunities()
})
</script>

<template>
  <section>
    <!-- Success View -->
    <VCard
      v-if="isSuccess && createdVisitor"
      class="mx-auto"
      max-width="600"
    >
      <VCardText class="text-center pa-8">
        <VIcon
          icon="tabler-circle-check"
          color="success"
          size="64"
          class="mb-4"
        />

        <h4 class="text-h4 mb-2">
          Pass Created!
        </h4>

        <p class="text-body-1 text-medium-emphasis mb-6">
          Visitor pass for <strong>{{ createdVisitor.visitor_name }}</strong> has been created successfully.
        </p>

        <!-- QR Code -->
        <div class="d-flex justify-center mb-6">
          <QRCodeDisplay
            :value="createdVisitor.record_url"
            :size="200"
          />
        </div>

        <!-- Pass Details -->
        <VCard
          variant="outlined"
          class="text-start mb-6"
        >
          <VCardText>
            <VRow>
              <VCol
                cols="6"
                class="py-2"
              >
                <div class="text-caption text-disabled">
                  Pass Code
                </div>
                <div class="text-h6 font-weight-bold">
                  {{ createdVisitor.record_uid }}
                </div>
              </VCol>
              <VCol
                cols="6"
                class="py-2"
              >
                <div class="text-caption text-disabled">
                  Type
                </div>
                <div class="text-body-1">
                  {{ createdVisitor.visitor_type }}
                </div>
              </VCol>
              <VCol
                cols="6"
                class="py-2"
              >
                <div class="text-caption text-disabled">
                  Community
                </div>
                <div class="text-body-1">
                  {{ createdVisitor.community?.name || createdVisitor.community_id }}
                </div>
              </VCol>
              <VCol
                cols="6"
                class="py-2"
              >
                <div class="text-caption text-disabled">
                  Property
                </div>
                <div class="text-body-1">
                  {{ createdVisitor.property?.name || createdVisitor.property_id }}
                </div>
              </VCol>
              <VCol
                cols="6"
                class="py-2"
              >
                <div class="text-caption text-disabled">
                  Valid Until
                </div>
                <div class="text-body-1">
                  {{ formatDate(createdVisitor.validity_end) }}
                </div>
              </VCol>
              <VCol
                cols="6"
                class="py-2"
              >
                <div class="text-caption text-disabled">
                  Entries Allowed
                </div>
                <div class="text-body-1">
                  {{ createdVisitor.entries_allowed === 9999 ? 'Unlimited' : createdVisitor.entries_allowed }}
                </div>
              </VCol>
            </VRow>
          </VCardText>
        </VCard>

        <!-- Actions -->
        <div class="d-flex gap-4 justify-center">
          <VBtn
            color="primary"
            variant="elevated"
            prepend-icon="tabler-plus"
            @click="createAnother"
          >
            Create Another
          </VBtn>

          <VBtn
            color="secondary"
            variant="tonal"
            prepend-icon="tabler-list"
            :to="{ name: 'apps-visitor-list' }"
          >
            View All Passes
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <!-- Form View -->
    <VCard
      v-else
      class="mx-auto"
      max-width="800"
    >
      <VCardTitle class="pa-6">
        <div class="d-flex align-center gap-2">
          <VIcon
            icon="tabler-ticket"
            size="28"
            color="primary"
          />
          <span>Create Visitor Pass</span>
        </div>
      </VCardTitle>

      <VDivider />

      <VCardText class="pa-6">
        <VForm @submit.prevent="submitForm">
          <VRow>
            <!-- Visitor Name -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.visitor_name"
                label="Visitor Name *"
                placeholder="Enter visitor's full name"
                :rules="[v => !!v || 'Visitor name is required']"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-user" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Visitor Type -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.visitor_type"
                label="Visitor Type *"
                :items="visitorTypes"
                placeholder="Select type"
              >
                <template #prepend-inner>
                  <VIcon
                    :icon="resolveTypeVariant(form.visitor_type).icon"
                    :color="resolveTypeVariant(form.visitor_type).color"
                  />
                </template>
                <template #item="{ props, item }">
                  <VListItem v-bind="props">
                    <template #prepend>
                      <VIcon
                        :icon="item.raw.icon"
                        :color="item.raw.color"
                        class="me-2"
                      />
                    </template>
                  </VListItem>
                </template>
              </AppSelect>
            </VCol>

            <!-- Community -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.community_id"
                label="Community *"
                :items="communities"
                placeholder="Select community"
                :loading="isLoading"
                :rules="[v => !!v || 'Community is required']"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-building-community" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Property -->
            <VCol
              cols="12"
              md="6"
            >
              <AppSelect
                v-model="form.property_id"
                label="Property *"
                :items="properties"
                placeholder="Select property"
                :disabled="!form.community_id"
                :rules="[v => !!v || 'Property is required']"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-home" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Validity Type -->
            <VCol cols="12">
              <div class="text-body-1 font-weight-medium mb-3">
                Pass Validity
              </div>
              <VRadioGroup
                v-model="form.validity_type"
                inline
              >
                <VRadio
                  v-for="option in validityOptions"
                  :key="option.value"
                  :label="option.title"
                  :value="option.value"
                />
              </VRadioGroup>
            </VCol>

            <!-- Custom Date Picker -->
            <VCol
              v-if="form.validity_type === 'custom'"
              cols="12"
              md="6"
            >
              <AppDateTimePicker
                v-model="form.validity_end"
                label="Valid Until *"
                placeholder="Select end date and time"
                :config="{ enableTime: true, minDate: 'today' }"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-calendar" />
                </template>
              </AppDateTimePicker>
            </VCol>

            <!-- Entries Allowed (for day/week/custom) -->
            <VCol
              v-if="['day', 'week', 'custom'].includes(form.validity_type)"
              cols="12"
              md="6"
            >
              <AppTextField
                v-model.number="form.entries_allowed"
                label="Entries Allowed"
                type="number"
                min="1"
                max="100"
                placeholder="Number of allowed entries"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-login" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Document Number -->
            <VCol
              cols="12"
              md="6"
            >
              <AppTextField
                v-model="form.document_num"
                label="Document Number (Optional)"
                placeholder="ID or license number"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-id" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Notes -->
            <VCol cols="12">
              <AppTextarea
                v-model="form.notes"
                label="Notes (Optional)"
                placeholder="Additional notes about the visitor"
                rows="3"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-notes" />
                </template>
              </AppTextarea>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>

      <VDivider />

      <VCardActions class="pa-6">
        <VBtn
          color="secondary"
          variant="tonal"
          :to="{ name: 'apps-visitor-list' }"
        >
          Cancel
        </VBtn>

        <VSpacer />

        <VBtn
          color="primary"
          variant="elevated"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          @click="submitForm"
        >
          <VIcon
            icon="tabler-qrcode"
            class="me-2"
          />
          Generate Pass
        </VBtn>
      </VCardActions>
    </VCard>

    <!-- Snackbar -->
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
