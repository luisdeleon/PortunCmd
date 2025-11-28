<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'vue-router'
import { useCountriesStates } from '@/composables/useCountriesStates'

definePage({
  meta: {
    public: false, // Requires authentication
    action: 'read',
    subject: 'users',
  },
})

const router = useRouter()
const { getCountries } = useCountriesStates()

// 👉 Current user data for permission checks
const currentUserData = useCookie<any>('userData')

// Check if user can create users (not Guard or Resident)
const canCreateUsers = computed(() => {
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

const refUserForm = ref<VForm>()
const isSaving = ref(false)
const snackbar = ref({ show: false, message: '', color: 'success' })

// Form data
const userForm = ref({
  email: '',
  display_name: '',
  password: '',
  verify_password: '',
  enabled: true,
  language: 'en',
  def_community_id: '',
  def_property_id: '',
  communities: [] as string[],
  properties: [] as string[],
  roles: [] as string[],
})

// Communities list
const communities = ref<Array<{ title: string; value: string }>>([])
const isLoadingCommunities = ref(false)

// Properties list
const properties = ref<Array<{ title: string; value: string }>>([])
const isLoadingProperties = ref(false)

// Roles list
const roles = ref<Array<{ title: string; value: string }>>([])
const isLoadingRoles = ref(false)

// Languages
const languages = [
  { title: 'English', value: 'en' },
  { title: 'Spanish', value: 'es' },
  { title: 'Portuguese', value: 'pt' },
]

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

// Fetch properties
const fetchProperties = async () => {
  try {
    isLoadingProperties.value = true

    const { data, error } = await supabase
      .from('property')
      .select('id, name, community_id')
      .order('name')

    if (error) {
      console.error('Error fetching properties:', error)
      return
    }

    properties.value = data?.map(property => ({
      title: `${property.id}${property.name ? ' - ' + property.name : ''}`,
      value: property.id,
    })) || []
  } catch (err) {
    console.error('Error in fetchProperties:', err)
  } finally {
    isLoadingProperties.value = false
  }
}

// Fetch roles (filtered by role hierarchy)
const fetchRoles = async () => {
  try {
    isLoadingRoles.value = true

    const { data, error } = await supabase
      .from('role')
      .select('id, role_name')
      .eq('enabled', true)
      .order('role_name')

    if (error) {
      console.error('Error fetching roles:', error)
      return
    }

    // Filter roles based on current user's allowed roles
    const filteredRoles = (data || []).filter(role =>
      allowedRoleNames.value.includes(role.role_name)
    )

    roles.value = filteredRoles.map(role => ({
      title: role.role_name,
      value: role.id,
    }))
  } catch (err) {
    console.error('Error in fetchRoles:', err)
  } finally {
    isLoadingRoles.value = false
  }
}

// Load data on mount
onMounted(() => {
  // Redirect if user doesn't have permission to create users
  if (!canCreateUsers.value) {
    snackbar.value = {
      show: true,
      message: 'You do not have permission to create users',
      color: 'error',
    }
    setTimeout(() => {
      router.push({ name: 'apps-user-list' })
    }, 1500)
    return
  }

  fetchCommunities()
  fetchProperties()
  fetchRoles()
})

const onSubmit = async () => {
  const { valid } = await refUserForm.value!.validate()

  if (!valid) return

  try {
    isSaving.value = true

    // Get the current session token for authorization
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      throw new Error('Not authenticated')
    }

    // Call the Edge Function to create user (doesn't affect current session)
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({
        email: userForm.value.email,
        password: userForm.value.password,
        display_name: userForm.value.display_name,
        enabled: userForm.value.enabled,
        language: userForm.value.language,
        def_community_id: userForm.value.def_community_id || null,
        def_property_id: userForm.value.def_property_id || null,
        communities: userForm.value.communities,
        properties: userForm.value.properties,
        roles: userForm.value.roles,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to create user')
    }

    // Success
    snackbar.value = {
      show: true,
      message: 'User created successfully',
      color: 'success',
    }

    // Navigate back to user list after a delay
    setTimeout(() => {
      router.push({ name: 'apps-user-list' })
    }, 1500)
  } catch (err: any) {
    console.error('Error creating user:', err)
    snackbar.value = {
      show: true,
      message: `Failed to create user: ${err.message}`,
      color: 'error',
    }
  } finally {
    isSaving.value = false
  }
}

const onCancel = () => {
  router.push({ name: 'apps-user-list' })
}

// Validation rules
const requiredRule = (v: string) => !!v || 'This field is required'
const emailRule = (v: string) => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return pattern.test(v) || 'Invalid email address'
}
const passwordRule = (v: string) => {
  if (!v) return 'Password is required'
  if (v.length < 8) return 'Password must be at least 8 characters'
  return true
}
const verifyPasswordRule = (v: string) => {
  if (!v) return 'Please verify your password'
  if (v !== userForm.value.password) return 'Passwords do not match'
  return true
}
</script>

<template>
  <section>
    <VRow>
      <VCol cols="12">
        <VCard>
          <VCardText>
            <!-- Header -->
            <div class="d-flex align-center mb-6">
              <VBtn
                icon
                variant="text"
                color="default"
                size="small"
                class="me-3"
                :to="{ name: 'apps-user-list' }"
              >
                <VIcon
                  icon="tabler-arrow-left"
                  size="24"
                />
              </VBtn>
              <div>
                <h4 class="text-h4">
                  Add New User
                </h4>
                <p class="text-body-1 text-medium-emphasis mb-0">
                  Create a new user account and assign communities, properties, and roles
                </p>
              </div>
            </div>

            <VDivider class="my-6" />

            <!-- Form -->
            <VForm ref="refUserForm">
              <VRow>
                <!-- Basic Information Section -->
                <VCol cols="12">
                  <div class="d-flex align-center gap-2 mb-3">
                    <VIcon
                      icon="tabler-user"
                      size="20"
                      color="primary"
                    />
                    <h6 class="text-h6 text-primary">
                      Basic Information
                    </h6>
                  </div>
                </VCol>

                <!-- Email -->
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="userForm.email"
                    label="Email *"
                    placeholder="Enter email address"
                    type="email"
                    :rules="[requiredRule, emailRule]"
                  >
                    <template #prepend-inner>
                      <VIcon icon="tabler-mail" />
                    </template>
                  </AppTextField>
                </VCol>

                <!-- Display Name -->
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="userForm.display_name"
                    label="Display Name *"
                    placeholder="Enter display name"
                    :rules="[requiredRule]"
                  >
                    <template #prepend-inner>
                      <VIcon icon="tabler-user" />
                    </template>
                  </AppTextField>
                </VCol>

                <!-- Password -->
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="userForm.password"
                    label="Password *"
                    placeholder="Enter password (min. 8 characters)"
                    type="password"
                    :rules="[passwordRule]"
                  >
                    <template #prepend-inner>
                      <VIcon icon="tabler-lock" />
                    </template>
                  </AppTextField>
                </VCol>

                <!-- Verify Password -->
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppTextField
                    v-model="userForm.verify_password"
                    label="Verify Password *"
                    placeholder="Re-enter password"
                    type="password"
                    :rules="[verifyPasswordRule]"
                  >
                    <template #prepend-inner>
                      <VIcon icon="tabler-lock-check" />
                    </template>
                  </AppTextField>
                </VCol>

                <!-- Language -->
                <VCol
                  cols="12"
                  md="6"
                >
                  <AppSelect
                    v-model="userForm.language"
                    label="Language"
                    :items="languages"
                  >
                    <template #prepend-inner>
                      <VIcon icon="tabler-language" />
                    </template>
                  </AppSelect>
                </VCol>

                <!-- Enabled Status -->
                <VCol
                  cols="12"
                  md="6"
                >
                  <div class="d-flex align-center gap-2">
                    <VIcon
                      icon="tabler-power"
                      size="20"
                    />
                    <VSwitch
                      v-model="userForm.enabled"
                      label="User Enabled"
                      color="success"
                    />
                  </div>
                </VCol>

                <!-- Roles Section -->
                <VCol cols="12">
                  <VDivider class="my-2" />
                  <div class="d-flex align-center gap-2 mb-3 mt-4">
                    <VIcon
                      icon="tabler-shield"
                      size="20"
                      color="warning"
                    />
                    <h6 class="text-h6 text-warning">
                      Role Assignment
                    </h6>
                  </div>
                </VCol>

                <!-- Roles -->
                <VCol cols="12">
                  <VAutocomplete
                    v-model="userForm.roles"
                    :items="roles"
                    :loading="isLoadingRoles"
                    label="Roles"
                    placeholder="Select roles"
                    multiple
                    chips
                    clearable
                    clear-icon="tabler-x"
                    closable-chips
                  >
                    <template #prepend-inner>
                      <VIcon icon="tabler-shield" />
                    </template>
                  </VAutocomplete>
                  <div class="text-caption text-medium-emphasis mt-1">
                    <VIcon
                      icon="tabler-info-circle"
                      size="16"
                      class="me-1"
                    />
                    Select one or more roles for this user
                  </div>
                </VCol>

                <!-- Communities & Properties Section -->
                <VCol cols="12">
                  <VDivider class="my-2" />
                  <div class="d-flex align-center gap-2 mb-3 mt-4">
                    <VIcon
                      icon="tabler-building-community"
                      size="20"
                      color="success"
                    />
                    <h6 class="text-h6 text-success">
                      Communities & Properties Assignment
                    </h6>
                  </div>
                </VCol>

                <!-- Default Community -->
                <VCol
                  cols="12"
                  md="6"
                >
                  <VAutocomplete
                    v-model="userForm.def_community_id"
                    :items="communities"
                    :loading="isLoadingCommunities"
                    label="Default Community"
                    placeholder="Select default community"
                    clearable
                    clear-icon="tabler-x"
                  >
                    <template #prepend-inner>
                      <VIcon icon="tabler-building" />
                    </template>
                  </VAutocomplete>
                </VCol>

                <!-- Communities -->
                <VCol
                  cols="12"
                  md="6"
                >
                  <VAutocomplete
                    v-model="userForm.communities"
                    :items="communities"
                    :loading="isLoadingCommunities"
                    label="Communities"
                    placeholder="Select communities"
                    multiple
                    chips
                    clearable
                    clear-icon="tabler-x"
                    closable-chips
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
                    Assign this user to one or more communities
                  </div>
                </VCol>

                <!-- Default Property -->
                <VCol
                  cols="12"
                  md="6"
                >
                  <VAutocomplete
                    v-model="userForm.def_property_id"
                    :items="properties"
                    :loading="isLoadingProperties"
                    label="Default Property"
                    placeholder="Select default property"
                    clearable
                    clear-icon="tabler-x"
                  >
                    <template #prepend-inner>
                      <VIcon icon="tabler-home-check" />
                    </template>
                  </VAutocomplete>
                </VCol>

                <!-- Properties -->
                <VCol
                  cols="12"
                  md="6"
                >
                  <VAutocomplete
                    v-model="userForm.properties"
                    :items="properties"
                    :loading="isLoadingProperties"
                    label="Properties"
                    placeholder="Select properties"
                    multiple
                    chips
                    clearable
                    clear-icon="tabler-x"
                    closable-chips
                  >
                    <template #prepend-inner>
                      <VIcon icon="tabler-home" />
                    </template>
                  </VAutocomplete>
                  <div class="text-caption text-medium-emphasis mt-1">
                    <VIcon
                      icon="tabler-info-circle"
                      size="16"
                      class="me-1"
                    />
                    Assign this user to one or more properties
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
                    @click="onCancel"
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
                    {{ isSaving ? 'Creating User...' : 'Create User' }}
                  </VBtn>
                </VCol>
              </VRow>
            </VForm>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- Snackbar -->
    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="top end"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </section>
</template>
