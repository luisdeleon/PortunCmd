<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { supabase } from '@/lib/supabase'

interface Props {
  userData: {
    id: string
    fullName: string
    firstName: string
    lastName: string
    company: string
    username: string
    role: string
    country: string
    contact: string
    email: string
    currentPlan: string
    status: string
    enabled: boolean
    avatar: string
    communitiesCount: number
    propertiesCount: number
    taxId: string
    language: string
  }
}

const props = defineProps<Props>()
const { t } = useI18n()

// 👉 User data for permission checks
const currentUserData = useCookie<any>('userData')

// Check if user can manage (delete/enable/disable) - not Guard or Resident
const canManage = computed(() => {
  const role = currentUserData.value?.role
  return role && !['Guard', 'Resident'].includes(role)
})

// Check if viewing user is the currently logged-in user (cannot delete/disable own account)
const isCurrentUser = computed(() => {
  return currentUserData.value?.id === props.userData?.id
})

// Role hierarchy - lower number = higher rank
const roleHierarchy: Record<string, number> = {
  'Super Admin': 1,
  'Mega Dealer': 2,
  'Dealer': 3,
  'Administrator': 4,
  'Guard': 5,
  'Client': 5,
  'Resident': 6,
}

// Check if target user has higher or equal rank (cannot manage them)
const isHigherOrEqualRank = computed(() => {
  const currentUserRole = currentUserData.value?.role
  const targetRole = props.userData?.role
  const currentRank = roleHierarchy[currentUserRole] || 999
  const targetRank = roleHierarchy[targetRole] || 999
  return targetRank <= currentRank
})

// Check if user can manage target user (not self, not higher rank)
// Exception: Super Admin can manage anyone including themselves
const canManageUser = computed(() => {
  const currentRole = currentUserData.value?.role

  // Super Admin can manage anyone
  if (currentRole === 'Super Admin') return true

  if (isCurrentUser.value) return false
  if (isHigherOrEqualRank.value) return false
  return true
})

// Get reason why user cannot be managed
const cannotManageReason = computed(() => {
  if (isCurrentUser.value) return 'own account'
  if (isHigherOrEqualRank.value) return 'higher rank'
  return ''
})

// 👉 Dynamic counts from database
const communitiesCount = ref(0)
const propertiesCount = ref(0)

// Fetch actual counts from database
const fetchCounts = async () => {
  if (!props.userData?.id) return

  try {
    // Get user's role and scope
    const { data: profileRole, error: roleError } = await supabase
      .from('profile_role')
      .select('scope_type, scope_community_ids, scope_property_ids, role:role_id(role_name)')
      .eq('profile_id', props.userData.id)
      .single()

    if (roleError) {
      console.error('Error fetching profile role:', roleError)
      return
    }

    const roleName = (profileRole?.role as any)?.role_name

    // For Super Admin or global scope, count all
    if (roleName === 'Super Admin' || profileRole?.scope_type === 'global') {
      const { count: commCount } = await supabase
        .from('community')
        .select('*', { count: 'exact', head: true })

      const { count: propCount } = await supabase
        .from('property')
        .select('*', { count: 'exact', head: true })

      communitiesCount.value = commCount || 0
      propertiesCount.value = propCount || 0
    } else {
      // Count from scope arrays
      communitiesCount.value = profileRole?.scope_community_ids?.length || 0
      propertiesCount.value = profileRole?.scope_property_ids?.length || 0

      // If no scope_property_ids, check property_owner table
      if (propertiesCount.value === 0) {
        const { count: ownerCount } = await supabase
          .from('property_owner')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', props.userData.id)

        propertiesCount.value = ownerCount || 0
      }
    }
  } catch (err) {
    console.error('Error fetching counts:', err)
  }
}

// Watch for userData changes and fetch counts
watch(() => props.userData?.id, () => {
  fetchCounts()
}, { immediate: true })

// Singular/plural labels
const communityLabel = computed(() => communitiesCount.value === 1 ? 'Community' : 'Communities')
const propertyLabel = computed(() => propertiesCount.value === 1 ? 'Property' : 'Properties')

const standardPlan = computed(() => ({
  plan: 'Standard',
  price: 99,
  benefits: [
    t('userView.plan.benefits.users'),
    t('userView.plan.benefits.storage'),
    t('userView.plan.benefits.support'),
  ],
}))

const isUserInfoEditDialogVisible = ref(false)
const isUpgradePlanDialogVisible = ref(false)
const isDeleteDialogVisible = ref(false)
const isToggleStatusDialogVisible = ref(false)

// Router for navigation
const router = useRouter()

// 👉 Role variant resolver
const resolveUserRoleVariant = (role: string) => {
  if (role === 'subscriber')
    return { color: 'warning', icon: 'tabler-user' }
  if (role === 'author')
    return { color: 'success', icon: 'tabler-circle-check' }
  if (role === 'maintainer')
    return { color: 'primary', icon: 'tabler-chart-pie-2' }
  if (role === 'editor')
    return { color: 'info', icon: 'tabler-pencil' }
  if (role === 'admin')
    return { color: 'secondary', icon: 'tabler-server-2' }

  return { color: 'primary', icon: 'tabler-user' }
}

// 👉 Delete user handler
const deleteUser = async () => {
  try {
    // Call the database function to delete user from both auth.users and profile
    const { data, error } = await supabase
      .rpc('delete_user_completely', { user_id: props.userData.id })

    if (error) {
      console.error('Error deleting user:', error)
      alert(`Failed to delete user: ${error.message}`)
      return
    }

    // Check if the function returned an error
    if (data && !data.success) {
      console.error('Error deleting user:', data.message)
      alert(`Failed to delete user: ${data.message}`)
      return
    }

    // Navigate back to user list
    router.push({ name: 'apps-user-list' })
  } catch (err) {
    console.error('Error in deleteUser:', err)
    alert('Failed to delete user')
  }
}

// 👉 Toggle user status handler
const toggleUserStatus = async () => {
  try {
    const newStatus = !props.userData.enabled

    const { error } = await supabase
      .from('profile')
      .update({ enabled: newStatus })
      .eq('id', props.userData.id)

    if (error) {
      console.error('Error updating user status:', error)
      alert('Failed to update user status')
      return
    }

    // Refresh page to show updated status
    window.location.reload()
  } catch (err) {
    console.error('Error in toggleUserStatus:', err)
    alert('Failed to update user status')
  }
}
</script>

<template>
  <VRow>
    <!-- SECTION User Details -->
    <VCol cols="12">
      <VCard v-if="props.userData">
        <VCardText class="text-center pt-12">
          <!-- 👉 Avatar -->
          <VAvatar
            rounded
            :size="100"
            :color="!props.userData.avatar ? 'primary' : undefined"
            :variant="!props.userData.avatar ? 'tonal' : undefined"
          >
            <VImg
              v-if="props.userData.avatar"
              :src="props.userData.avatar"
            />
            <span
              v-else
              class="text-5xl font-weight-medium"
            >
              {{ avatarText(props.userData.fullName) }}
            </span>
          </VAvatar>

          <!-- 👉 User fullName -->
          <h5 class="text-h5 mt-4">
            {{ props.userData.fullName }}
          </h5>

          <!-- 👉 Role chip -->
          <VChip
            label
            :color="resolveUserRoleVariant(props.userData.role).color"
            size="small"
            class="text-capitalize mt-4"
          >
            {{ props.userData.role }}
          </VChip>
        </VCardText>

        <VCardText>
          <div class="d-flex justify-space-around gap-x-6 gap-y-2 flex-wrap mb-6">
            <!-- 👉 Communities Count -->
            <div class="d-flex align-center me-8">
              <VAvatar
                :size="40"
                rounded
                color="primary"
                variant="tonal"
                class="me-4"
              >
                <VIcon
                  icon="tabler-building-community"
                  size="24"
                />
              </VAvatar>
              <div>
                <h5 class="text-h5">
                  {{ communitiesCount }}
                </h5>

                <span class="text-sm">{{ communityLabel }}</span>
              </div>
            </div>

            <!-- 👉 Properties Count -->
            <div class="d-flex align-center me-4">
              <VAvatar
                :size="38"
                rounded
                color="primary"
                variant="tonal"
                class="me-4"
              >
                <VIcon
                  icon="tabler-home"
                  size="24"
                />
              </VAvatar>
              <div>
                <h5 class="text-h5">
                  {{ propertiesCount }}
                </h5>
                <span class="text-sm">{{ propertyLabel }}</span>
              </div>
            </div>
          </div>

          <!-- 👉 Details -->
          <h5 class="text-h5">
            {{ $t('userView.bioPanel.details') }}
          </h5>

          <VDivider class="my-4" />

          <!-- 👉 User Details list -->
          <VList class="card-list mt-2">
            <VListItem>
              <VListItemTitle>
                <h6 class="text-h6">
                  <VIcon
                    icon="tabler-user"
                    size="18"
                    class="me-1"
                  />
                  {{ $t('userView.bioPanel.username') }}:
                  <div class="d-inline-block text-body-1">
                    {{ props.userData.fullName }}
                  </div>
                </h6>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle>
                <h6 class="text-h6">
                  <VIcon
                    icon="tabler-key"
                    size="18"
                    class="me-1"
                  />
                  UUID:
                  <div class="d-inline-block text-body-1 font-weight-light">
                    {{ props.userData.id }}
                  </div>
                </h6>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle>
                <h6 class="text-h6">
                  <VIcon
                    icon="tabler-mail"
                    size="18"
                    class="me-1"
                  />
                  {{ $t('userView.bioPanel.email') }}:
                  <span class="text-body-1">
                    {{ props.userData.email }}
                  </span>
                </h6>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle>
                <h6 class="text-h6">
                  <VIcon
                    icon="tabler-circle-check"
                    size="18"
                    class="me-1"
                  />
                  {{ $t('userView.bioPanel.status') }}:
                  <VChip
                    :color="props.userData.status === 'active' ? 'success' : 'error'"
                    size="small"
                    class="ms-2 text-capitalize"
                  >
                    {{ props.userData.status }}
                  </VChip>
                </h6>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle>
                <h6 class="text-h6">
                  <VIcon
                    icon="tabler-shield"
                    size="18"
                    class="me-1"
                  />
                  {{ $t('userView.bioPanel.role') }}:
                  <div class="d-inline-block text-capitalize text-body-1">
                    {{ props.userData.role }}
                  </div>
                </h6>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle>
                <h6 class="text-h6">
                  <VIcon
                    icon="tabler-id"
                    size="18"
                    class="me-1"
                  />
                  {{ $t('userView.bioPanel.taxId') }}:
                  <div class="d-inline-block text-body-1">
                    {{ props.userData.taxId }}
                  </div>
                </h6>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle>
                <h6 class="text-h6">
                  <VIcon
                    icon="tabler-phone"
                    size="18"
                    class="me-1"
                  />
                  {{ $t('userView.bioPanel.contact') }}:
                  <div class="d-inline-block text-body-1">
                    {{ props.userData.contact }}
                  </div>
                </h6>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle>
                <h6 class="text-h6">
                  <VIcon
                    icon="tabler-language"
                    size="18"
                    class="me-1"
                  />
                  {{ $t('userView.bioPanel.language') }}:
                  <div class="d-inline-block text-body-1">
                    {{ props.userData.language }}
                  </div>
                </h6>
              </VListItemTitle>
            </VListItem>

            <VListItem>
              <VListItemTitle>
                <h6 class="text-h6">
                  <VIcon
                    icon="tabler-map-pin"
                    size="18"
                    class="me-1"
                  />
                  {{ $t('userView.bioPanel.country') }}:
                  <div class="d-inline-block text-body-1">
                    {{ props.userData.country }}
                  </div>
                </h6>
              </VListItemTitle>
            </VListItem>
          </VList>
        </VCardText>

        <!-- 👉 Action buttons -->
        <VCardText class="d-flex justify-center gap-x-4">
          <VBtn
            v-if="canManage"
            variant="elevated"
            @click="isUserInfoEditDialogVisible = true"
          >
            {{ $t('userView.bioPanel.edit') }}
          </VBtn>

          <VBtn
            v-if="canManage"
            variant="tonal"
            color="error"
            :disabled="!canManageUser"
            @click="isDeleteDialogVisible = true"
          >
            Delete
            <VTooltip
              v-if="!canManageUser"
              activator="parent"
              location="top"
            >
              You cannot delete {{ cannotManageReason === 'own account' ? 'your own account' : 'a user with higher rank' }}
            </VTooltip>
          </VBtn>

          <VBtn
            v-if="canManage"
            variant="tonal"
            :color="props.userData.enabled ? 'warning' : 'success'"
            :disabled="!canManageUser"
            @click="isToggleStatusDialogVisible = true"
          >
            {{ props.userData.enabled ? 'Disable' : 'Enable' }}
            <VTooltip
              v-if="!canManageUser"
              activator="parent"
              location="top"
            >
              You cannot {{ props.userData.enabled ? 'disable' : 'enable' }} {{ cannotManageReason === 'own account' ? 'your own account' : 'a user with higher rank' }}
            </VTooltip>
          </VBtn>
        </VCardText>
      </VCard>
    </VCol>
    <!-- !SECTION -->

    <!-- SECTION Current Plan -->
    <VCol cols="12">
      <VCard>
        <VCardText class="d-flex">
          <!-- 👉 Standard Chip -->
          <VChip
            label
            color="primary"
            size="small"
            class="font-weight-medium"
          >
            {{ $t('userView.plan.popular') }}
          </VChip>

          <VSpacer />

          <!-- 👉 Current Price  -->
          <div class="d-flex align-center">
            <sup class="text-h5 text-primary mt-1">$</sup>
            <h1 class="text-h1 text-primary">
              99
            </h1>
            <sub class="mt-3"><h6 class="text-h6 font-weight-regular mb-n1">{{ $t('userView.plan.perMonth') }}</h6></sub>
          </div>
        </VCardText>

        <VCardText>
          <!-- 👉 Price Benefits -->
          <VList class="card-list">
            <VListItem
              v-for="benefit in standardPlan.benefits"
              :key="benefit"
            >
              <div class="d-flex align-center gap-x-2">
                <VIcon
                  size="10"
                  color="secondary"
                  icon="tabler-circle-filled"
                />
                <div class="text-medium-emphasis">
                  {{ benefit }}
                </div>
              </div>
            </VListItem>
          </VList>

          <!-- 👉 Days -->
          <div class="my-6">
            <div class="d-flex justify-space-between mb-1">
              <h6 class="text-h6">
                {{ $t('userView.plan.days') }}
              </h6>
              <h6 class="text-h6">
                {{ $t('userView.plan.daysProgress', { current: 26, total: 30 }) }}
              </h6>
            </div>

            <!-- 👉 Progress -->
            <VProgressLinear
              rounded
              rounded-bar
              :model-value="65"
              color="primary"
            />

            <p class="mt-1">
              {{ $t('userView.plan.daysRemaining', { count: 4 }) }}
            </p>
          </div>

          <!-- 👉 Upgrade Plan -->
          <div class="d-flex gap-4">
            <VBtn
              block
              @click="isUpgradePlanDialogVisible = true"
            >
              {{ $t('userView.plan.upgradePlan') }}
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VCol>
    <!-- !SECTION -->
  </VRow>

  <!-- 👉 Edit user info dialog -->
  <UserInfoEditDialog
    v-model:is-dialog-visible="isUserInfoEditDialogVisible"
    :user-data="props.userData"
  />

  <!-- 👉 Upgrade plan dialog -->
  <UserUpgradePlanDialog v-model:is-dialog-visible="isUpgradePlanDialogVisible" />

  <!-- 👉 Delete Confirmation Dialog -->
  <VDialog
    v-model="isDeleteDialogVisible"
    max-width="500"
  >
    <VCard>
      <VCardText class="text-center px-10 py-6">
        <VIcon
          icon="tabler-trash"
          color="error"
          size="56"
          class="my-4"
        />

        <h6 class="text-h6 mb-4">
          Delete User
        </h6>

        <p class="text-body-1 mb-6">
          Are you sure you want to delete <strong>{{ props.userData.fullName }}</strong>?
          This action cannot be undone and will permanently remove the user account.
        </p>

        <VAlert
          color="error"
          variant="tonal"
          class="mb-6 text-start"
        >
          <div class="text-body-2">
            <strong>Warning:</strong> Deleting this user will remove all associated data and cannot be reversed.
          </div>
        </VAlert>

        <div class="d-flex gap-4 justify-center">
          <VBtn
            color="secondary"
            variant="tonal"
            @click="isDeleteDialogVisible = false"
          >
            Cancel
          </VBtn>

          <VBtn
            color="error"
            variant="elevated"
            @click="deleteUser(); isDeleteDialogVisible = false"
          >
            Delete User
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>

  <!-- 👉 Toggle Status Confirmation Dialog -->
  <VDialog
    v-model="isToggleStatusDialogVisible"
    max-width="500"
  >
    <VCard>
      <VCardText class="text-center px-10 py-6">
        <VIcon
          :icon="props.userData.enabled ? 'tabler-user-off' : 'tabler-user-check'"
          :color="props.userData.enabled ? 'warning' : 'success'"
          size="56"
          class="my-4"
        />

        <h6 class="text-h6 mb-4">
          {{ props.userData.enabled ? 'Disable User' : 'Enable User' }}
        </h6>

        <p class="text-body-1 mb-6">
          Are you sure you want to {{ props.userData.enabled ? 'disable' : 'enable' }} <strong>{{ props.userData.fullName }}</strong>?
        </p>

        <VAlert
          :color="props.userData.enabled ? 'warning' : 'info'"
          variant="tonal"
          class="mb-6 text-start"
        >
          <div class="text-body-2">
            <template v-if="props.userData.enabled">
              <strong>Disabling this user</strong> will prevent them from logging in and accessing the system.
            </template>
            <template v-else>
              <strong>Enabling this user</strong> will allow them to log in and access the system again.
            </template>
          </div>
        </VAlert>

        <div class="d-flex gap-4 justify-center">
          <VBtn
            color="secondary"
            variant="tonal"
            @click="isToggleStatusDialogVisible = false"
          >
            Cancel
          </VBtn>

          <VBtn
            :color="props.userData.enabled ? 'warning' : 'success'"
            variant="elevated"
            @click="toggleUserStatus(); isToggleStatusDialogVisible = false"
          >
            {{ props.userData.enabled ? 'Disable' : 'Enable' }} User
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style lang="scss" scoped>
.card-list {
  --v-card-list-gap: 0.5rem;
}

.text-capitalize {
  text-transform: capitalize !important;
}
</style>
