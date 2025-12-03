<script setup lang="ts">
import { VForm } from 'vuetify/components/VForm'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'vue-router'
import { useCountriesStates } from '@/composables/useCountriesStates'

const { t, locale } = useI18n({ useScope: 'global' })

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

// Email duplicate checking
const isCheckingEmail = ref(false)
const emailExists = ref(false)
const lastCheckedEmail = ref('')

// Form data
const userForm = ref({
  email: '',
  display_name: '',
  password: '',
  verify_password: '',
  enabled: true,
  language: locale.value,
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
const languages = computed(() => [
  { title: t('userForm.languages.english'), value: 'en' },
  { title: t('userForm.languages.spanish'), value: 'es' },
  { title: t('userForm.languages.portuguese'), value: 'pt' },
])

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

// Check if email already exists in database
const checkEmailExists = async (email: string): Promise<boolean> => {
  if (!email || email === lastCheckedEmail.value) {
    return emailExists.value
  }

  try {
    isCheckingEmail.value = true
    const normalizedEmail = email.toLowerCase().trim()

    const { data, error } = await supabase
      .from('profile')
      .select('id')
      .ilike('email', normalizedEmail)
      .limit(1)

    if (error) {
      console.error('Error checking email:', error)
      return false
    }

    emailExists.value = (data?.length || 0) > 0
    lastCheckedEmail.value = email
    return emailExists.value
  } catch (err) {
    console.error('Error in checkEmailExists:', err)
    return false
  } finally {
    isCheckingEmail.value = false
  }
}

// Debounced email check
let emailCheckTimeout: ReturnType<typeof setTimeout> | null = null
const debouncedEmailCheck = (email: string) => {
  if (emailCheckTimeout) {
    clearTimeout(emailCheckTimeout)
  }
  emailCheckTimeout = setTimeout(() => {
    checkEmailExists(email)
  }, 500)
}

// Watch email field for changes
watch(() => userForm.value.email, (newEmail) => {
  if (newEmail) {
    debouncedEmailCheck(newEmail)
  } else {
    emailExists.value = false
    lastCheckedEmail.value = ''
  }
})

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
      message: t('userForm.messages.noPermission'),
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

  // Double-check email doesn't exist (in case user types fast and hits submit)
  if (userForm.value.email) {
    await checkEmailExists(userForm.value.email)
    if (emailExists.value) {
      snackbar.value = {
        show: true,
        message: t('userForm.validation.emailExists'),
        color: 'error',
      }
      return
    }
  }

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
      message: t('userForm.messages.createSuccess'),
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
      message: `${t('userForm.messages.createError')}: ${err.message}`,
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
const requiredRule = (v: string) => !!v || t('userForm.validation.required')
const emailRule = (v: string) => {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return pattern.test(v) || t('userForm.validation.invalidEmail')
}
const emailDuplicateRule = () => {
  if (emailExists.value) {
    return t('userForm.validation.emailExists')
  }
  return true
}
const passwordRule = (v: string) => {
  if (!v) return t('userForm.validation.passwordRequired')
  if (v.length < 8) return t('userForm.validation.passwordMinLength')
  return true
}
const verifyPasswordRule = (v: string) => {
  if (!v) return t('userForm.validation.verifyPassword')
  if (v !== userForm.value.password) return t('userForm.validation.passwordMismatch')
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
                  {{ t('userForm.title') }}
                </h4>
                <p class="text-body-1 text-medium-emphasis mb-0">
                  {{ t('userForm.subtitle') }}
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
                      {{ t('userForm.sections.basicInfo') }}
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
                    :label="t('userForm.fields.email')"
                    :placeholder="t('userForm.fields.emailPlaceholder')"
                    type="email"
                    :rules="[requiredRule, emailRule, emailDuplicateRule]"
                    :loading="isCheckingEmail"
                    :error="emailExists"
                    :error-messages="emailExists ? [t('userForm.validation.emailExists')] : []"
                  >
                    <template #prepend-inner>
                      <VIcon icon="tabler-mail" />
                    </template>
                    <template #append-inner>
                      <VProgressCircular
                        v-if="isCheckingEmail"
                        size="20"
                        width="2"
                        indeterminate
                        color="primary"
                      />
                      <VIcon
                        v-else-if="userForm.email && !emailExists && lastCheckedEmail === userForm.email"
                        icon="tabler-check"
                        color="success"
                        size="20"
                      />
                      <VIcon
                        v-else-if="emailExists"
                        icon="tabler-alert-circle"
                        color="error"
                        size="20"
                      />
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
                    :label="t('userForm.fields.displayName')"
                    :placeholder="t('userForm.fields.displayNamePlaceholder')"
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
                    :label="t('userForm.fields.password')"
                    :placeholder="t('userForm.fields.passwordPlaceholder')"
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
                    :label="t('userForm.fields.verifyPassword')"
                    :placeholder="t('userForm.fields.verifyPasswordPlaceholder')"
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
                    :label="t('userForm.fields.language')"
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
                      :label="t('userForm.fields.userEnabled')"
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
                      {{ t('userForm.sections.roleAssignment') }}
                    </h6>
                  </div>
                </VCol>

                <!-- Roles -->
                <VCol cols="12">
                  <VAutocomplete
                    v-model="userForm.roles"
                    :items="roles"
                    :loading="isLoadingRoles"
                    :label="t('userForm.fields.roles')"
                    :placeholder="t('userForm.fields.rolesPlaceholder')"
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
                    {{ t('userForm.fields.rolesHint') }}
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
                      {{ t('userForm.sections.communitiesPropertiesAssignment') }}
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
                    :label="t('userForm.fields.defaultCommunity')"
                    :placeholder="t('userForm.fields.defaultCommunityPlaceholder')"
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
                    :label="t('userForm.fields.communities')"
                    :placeholder="t('userForm.fields.communitiesPlaceholder')"
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
                    {{ t('userForm.fields.communitiesHint') }}
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
                    :label="t('userForm.fields.defaultProperty')"
                    :placeholder="t('userForm.fields.defaultPropertyPlaceholder')"
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
                    :label="t('userForm.fields.properties')"
                    :placeholder="t('userForm.fields.propertiesPlaceholder')"
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
                    {{ t('userForm.fields.propertiesHint') }}
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
                    {{ t('userForm.buttons.cancel') }}
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
                    {{ isSaving ? t('userForm.buttons.creating') : t('userForm.buttons.create') }}
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
