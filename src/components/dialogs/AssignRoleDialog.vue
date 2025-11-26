<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'
import { supabase } from '@/lib/supabase'

interface User {
  id: string
  display_name: string
  email: string
}

interface Role {
  id: string
  role_name: string
}

interface Community {
  id: string
  name: string
}

interface Property {
  id: string
  name: string
  community_id: string
}

interface Dealer {
  id: string
  name: string
}

interface Props {
  isDialogVisible: boolean
  userId?: string | null
}

interface Emit {
  (e: 'update:isDialogVisible', value: boolean): void
  (e: 'roleAssigned'): void
}

const props = withDefaults(defineProps<Props>(), {
  userId: null,
})

const emit = defineEmits<Emit>()

// 👉 Current user data for permission checks
const currentUserData = useCookie<any>('userData')

// Check if user can assign roles (not Guard or Resident)
const canAssignRoles = computed(() => {
  const role = currentUserData.value?.role
  return role && ['Super Admin', 'Mega Dealer', 'Dealer', 'Administrator'].includes(role)
})

// Role hierarchy - defines which roles each role can assign
const roleHierarchy: Record<string, string[]> = {
  'Super Admin': ['Super Admin', 'Mega Dealer', 'Dealer', 'Administrator', 'Guard', 'Resident'],
  'Mega Dealer': ['Dealer', 'Administrator', 'Guard', 'Resident'],
  'Dealer': ['Administrator', 'Guard', 'Resident'],
  'Administrator': ['Administrator', 'Guard', 'Resident'],
  'Guard': [],
  'Resident': [],
}

// Get allowed roles for current user
const allowedRoleNames = computed(() => {
  const currentRole = currentUserData.value?.role
  return roleHierarchy[currentRole] || []
})

// Form data
const selectedUser = ref<string | null>(null)
const selectedRole = ref<string | null>(null)
const scopeType = ref<'global' | 'dealer' | 'community' | 'property'>('global')
const selectedDealer = ref<string | null>(null)
const selectedCommunities = ref<string[]>([])
const selectedProperties = ref<string[]>([])
const expiresAt = ref<string | null>(null)

// Data lists
const users = ref<User[]>([])
const roles = ref<Role[]>([])
const dealers = ref<Dealer[]>([])
const communities = ref<Community[]>([])
const properties = ref<Property[]>([])
const filteredProperties = ref<Property[]>([])

// Loading states
const isLoading = ref(false)
const isSaving = ref(false)

// Form ref
const refRoleAssignForm = ref<VForm>()

// Scope type options
const scopeTypeOptions = [
  { title: 'Global Access', value: 'global', description: 'Access to all communities and properties' },
  { title: 'Dealer Scope', value: 'dealer', description: 'Limited to dealer\'s communities' },
  { title: 'Community Scope', value: 'community', description: 'Limited to specific communities' },
  { title: 'Property Scope', value: 'property', description: 'Limited to specific properties' },
]

// Fetch users
const fetchUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('profile')
      .select('id, display_name, email')
      .eq('enabled', true)
      .order('display_name')

    if (error) throw error

    users.value = data || []
  } catch (err) {
    console.error('Error fetching users:', err)
  }
}

// Fetch roles (filtered by role hierarchy)
const fetchRoles = async () => {
  try {
    const { data, error } = await supabase
      .from('role')
      .select('id, role_name')
      .eq('enabled', true)
      .order('role_name')

    if (error) throw error

    // Filter roles based on current user's allowed roles
    roles.value = (data || []).filter(role =>
      allowedRoleNames.value.includes(role.role_name)
    )
  } catch (err) {
    console.error('Error fetching roles:', err)
  }
}

// Fetch dealers
const fetchDealers = async () => {
  try {
    const { data, error } = await supabase
      .from('profile')
      .select(`
        id,
        display_name,
        profile_role!profile_role_profile_id_fkey(
          role_id,
          role!profile_role_role_id_fkey(role_name)
        )
      `)
      .eq('enabled', true)

    if (error) throw error

    // Filter for dealer role
    dealers.value = (data || [])
      .filter(profile => profile.profile_role?.[0]?.role?.role_name === 'Dealer')
      .map(dealer => ({
        id: dealer.id,
        name: dealer.display_name,
      }))
  } catch (err) {
    console.error('Error fetching dealers:', err)
  }
}

// Fetch communities
const fetchCommunities = async () => {
  try {
    const { data, error } = await supabase
      .from('community')
      .select('id, name')
      .order('name')

    if (error) throw error

    communities.value = data || []
  } catch (err) {
    console.error('Error fetching communities:', err)
  }
}

// Fetch properties
const fetchProperties = async () => {
  try {
    const { data, error } = await supabase
      .from('property')
      .select('id, name, community_id')
      .order('name')

    if (error) throw error

    properties.value = data || []
    filteredProperties.value = data || []
  } catch (err) {
    console.error('Error fetching properties:', err)
  }
}

// Filter properties by selected communities
watch(selectedCommunities, (newCommunities) => {
  if (newCommunities && newCommunities.length > 0) {
    filteredProperties.value = properties.value.filter(prop =>
      newCommunities.includes(prop.community_id)
    )
  } else {
    filteredProperties.value = properties.value
  }
  // Clear selected properties if they're no longer valid
  selectedProperties.value = selectedProperties.value.filter(propId =>
    filteredProperties.value.some(prop => prop.id === propId)
  )
})

// Reset scope fields when scope type changes
watch(scopeType, (newType) => {
  if (newType !== 'dealer') selectedDealer.value = null
  if (newType !== 'community') selectedCommunities.value = []
  if (newType !== 'property') selectedProperties.value = []
})

// Load data when dialog opens
watch(() => props.isDialogVisible, async (newVal) => {
  if (newVal) {
    // Check if user has permission to assign roles
    if (!canAssignRoles.value) {
      alert('You do not have permission to assign roles')
      emit('update:isDialogVisible', false)
      return
    }

    isLoading.value = true
    await Promise.all([
      fetchUsers(),
      fetchRoles(),
      fetchDealers(),
      fetchCommunities(),
      fetchProperties(),
    ])
    isLoading.value = false

    // Pre-fill user if userId prop is provided
    if (props.userId) {
      selectedUser.value = props.userId
    }
  }
})

// Get current user ID for granted_by
const getCurrentUserId = async () => {
  const { data } = await supabase.auth.getUser()
  return data.user?.id || null
}

// Submit form
const onSubmit = async () => {
  const { valid } = await refRoleAssignForm.value?.validate()
  if (!valid) return

  try {
    isSaving.value = true

    const currentUserId = await getCurrentUserId()

    // Prepare the role assignment data
    const roleAssignment: any = {
      profile_id: selectedUser.value,
      role_id: selectedRole.value,
      scope_type: scopeType.value,
      granted_by: currentUserId,
      granted_at: new Date().toISOString(),
    }

    // Add scope-specific fields
    if (scopeType.value === 'dealer' && selectedDealer.value) {
      roleAssignment.scope_dealer_id = selectedDealer.value
    }

    if (scopeType.value === 'community' && selectedCommunities.value.length > 0) {
      roleAssignment.scope_community_ids = selectedCommunities.value
    }

    if (scopeType.value === 'property' && selectedProperties.value.length > 0) {
      roleAssignment.scope_property_ids = selectedProperties.value
    }

    if (expiresAt.value) {
      roleAssignment.expires_at = new Date(expiresAt.value).toISOString()
    }

    // Insert into profile_role table
    const { error } = await supabase
      .from('profile_role')
      .insert(roleAssignment)

    if (error) throw error

    // Success
    emit('roleAssigned')
    onReset()
  } catch (err) {
    console.error('Error assigning role:', err)
    alert('Failed to assign role. Please try again.')
  } finally {
    isSaving.value = false
  }
}

// Reset form
const onReset = () => {
  selectedUser.value = null
  selectedRole.value = null
  scopeType.value = 'global'
  selectedDealer.value = null
  selectedCommunities.value = []
  selectedProperties.value = []
  expiresAt.value = null
  refRoleAssignForm.value?.reset()
  emit('update:isDialogVisible', false)
}

// Computed user options for select
const userOptions = computed(() =>
  users.value.map(user => ({
    title: `${user.display_name} (${user.email})`,
    value: user.id,
  }))
)

// Computed role options
const roleOptions = computed(() =>
  roles.value.map(role => ({
    title: role.role_name,
    value: role.id,
  }))
)

// Computed dealer options
const dealerOptions = computed(() =>
  dealers.value.map(dealer => ({
    title: dealer.name,
    value: dealer.id,
  }))
)

// Computed community options
const communityOptions = computed(() =>
  communities.value.map(community => ({
    title: community.name,
    value: community.id,
  }))
)

// Computed property options
const propertyOptions = computed(() =>
  filteredProperties.value.map(property => ({
    title: property.name,
    value: property.id,
  }))
)

// Get selected user's name (for display when userId is provided)
const selectedUserName = computed(() => {
  if (!selectedUser.value) return ''
  const user = users.value.find(u => u.id === selectedUser.value)
  return user ? user.display_name : selectedUser.value
})

// Get selected user's display name with email
const selectedUserDisplayName = computed(() => {
  if (!selectedUser.value) return ''
  const user = users.value.find(u => u.id === selectedUser.value)
  return user ? user.display_name : ''
})

// Validation rules
const requiredRule = (v: any) => !!v || 'This field is required'
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
        <h4 class="text-h4 text-center mb-2">
          Assign Role to User
        </h4>
        <p class="text-body-1 text-center mb-6">
          Configure role assignment with scope restrictions
        </p>

        <!-- Loading State -->
        <div
          v-if="isLoading"
          class="text-center py-10"
        >
          <VProgressCircular
            indeterminate
            color="primary"
            size="48"
          />
          <div class="mt-4 text-body-2">
            Loading data...
          </div>
        </div>

        <!-- Form -->
        <VForm
          v-else
          ref="refRoleAssignForm"
          @submit.prevent="onSubmit"
        >
          <VRow>
            <!-- User Selection (hidden if userId is provided) -->
            <VCol
              v-if="!userId"
              cols="12"
            >
              <AppSelect
                v-model="selectedUser"
                label="Select User"
                placeholder="Choose a user"
                :items="userOptions"
                :rules="[requiredRule]"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-user" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Selected User Display (shown if userId is provided) -->
            <VCol
              v-if="userId"
              cols="12"
            >
              <div class="text-body-2 text-disabled mb-1">
                Selected User
              </div>
              <div class="d-flex align-center gap-2 pa-3 rounded bg-light">
                <VIcon
                  icon="tabler-user"
                  color="primary"
                />
                <span class="text-body-1 font-weight-medium">{{ selectedUserName }}</span>
              </div>
            </VCol>

            <!-- User Name Display -->
            <VCol
              v-if="selectedUser"
              cols="12"
            >
              <AppTextField
                :model-value="selectedUserDisplayName"
                label="Name"
                readonly
                disabled
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-id" />
                </template>
              </AppTextField>
            </VCol>

            <!-- Role Selection -->
            <VCol cols="12">
              <AppSelect
                v-model="selectedRole"
                label="Select Role"
                placeholder="Choose a role"
                :items="roleOptions"
                :rules="[requiredRule]"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-shield" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Scope Type Selection -->
            <VCol cols="12">
              <div class="text-body-2 text-disabled mb-3">
                Access Scope
              </div>
              <VRow>
                <VCol
                  cols="12"
                  sm="6"
                >
                  <VRadioGroup v-model="scopeType">
                    <VRadio value="global">
                      <template #label>
                        <div>
                          <div class="text-body-2 font-weight-medium">
                            Global Access
                          </div>
                          <div class="text-caption text-disabled">
                            Access to all communities and properties
                          </div>
                        </div>
                      </template>
                    </VRadio>
                    <VRadio value="dealer">
                      <template #label>
                        <div>
                          <div class="text-body-2 font-weight-medium">
                            Dealer Scope
                          </div>
                          <div class="text-caption text-disabled">
                            Limited to dealer's communities
                          </div>
                        </div>
                      </template>
                    </VRadio>
                  </VRadioGroup>
                </VCol>
                <VCol
                  cols="12"
                  sm="6"
                >
                  <VRadioGroup v-model="scopeType">
                    <VRadio value="community">
                      <template #label>
                        <div>
                          <div class="text-body-2 font-weight-medium">
                            Community Scope
                          </div>
                          <div class="text-caption text-disabled">
                            Limited to specific communities
                          </div>
                        </div>
                      </template>
                    </VRadio>
                    <VRadio value="property">
                      <template #label>
                        <div>
                          <div class="text-body-2 font-weight-medium">
                            Property Scope
                          </div>
                          <div class="text-caption text-disabled">
                            Limited to specific properties
                          </div>
                        </div>
                      </template>
                    </VRadio>
                  </VRadioGroup>
                </VCol>
              </VRow>
            </VCol>

            <!-- Dealer Scope Field -->
            <VCol
              v-if="scopeType === 'dealer'"
              cols="12"
            >
              <AppSelect
                v-model="selectedDealer"
                label="Select Dealer"
                placeholder="Choose a dealer"
                :items="dealerOptions"
                :rules="[requiredRule]"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-briefcase" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Community Scope Field -->
            <VCol
              v-if="scopeType === 'community'"
              cols="12"
            >
              <AppSelect
                v-model="selectedCommunities"
                label="Select Communities"
                placeholder="Choose communities"
                :items="communityOptions"
                :rules="[v => (v && v.length > 0) || 'Select at least one community']"
                multiple
                chips
                closable-chips
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-building-community" />
                </template>
              </AppSelect>
            </VCol>

            <!-- Property Scope Field -->
            <VCol
              v-if="scopeType === 'property'"
              cols="12"
            >
              <AppSelect
                v-model="selectedProperties"
                label="Select Properties"
                placeholder="Choose properties"
                :items="propertyOptions"
                :rules="[v => (v && v.length > 0) || 'Select at least one property']"
                multiple
                chips
                closable-chips
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-home" />
                </template>
              </AppSelect>
              <div
                v-if="selectedCommunities.length > 0"
                class="text-caption text-disabled mt-2"
              >
                Properties filtered by selected communities
              </div>
            </VCol>

            <!-- Expiration Date (Optional) -->
            <VCol cols="12">
              <AppDateTimePicker
                v-model="expiresAt"
                label="Expiration Date (Optional)"
                placeholder="Select expiration date"
                :config="{
                  enableTime: true,
                  dateFormat: 'Y-m-d H:i',
                  minDate: 'today',
                }"
              >
                <template #prepend-inner>
                  <VIcon icon="tabler-calendar" />
                </template>
              </AppDateTimePicker>
              <div class="text-caption text-disabled mt-2">
                Leave empty for permanent access
              </div>
            </VCol>

            <!-- Action Buttons -->
            <VCol
              cols="12"
              class="d-flex flex-wrap justify-center gap-4"
            >
              <VBtn
                color="secondary"
                variant="tonal"
                @click="onReset"
              >
                Cancel
              </VBtn>

              <VBtn
                type="submit"
                :loading="isSaving"
                :disabled="isSaving"
              >
                Assign Role
              </VBtn>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.v-radio-group :deep(.v-selection-control) {
  margin-bottom: 1rem;
}
</style>
