<script lang="ts" setup>
import { supabase } from '@/lib/supabase'
import UserTabDevices from './UserTabDevices.vue'

const route = useRoute()

// 👉 User data for permission checks
const currentUserData = useCookie<any>('userData')

// Check if user can manage (not Guard or Resident)
const canManage = computed(() => {
  const role = currentUserData.value?.role
  return role && !['Guard', 'Resident'].includes(role)
})

// Community Table Header
const communityTableHeaders = [
  { title: 'Community', key: 'id' },
  { title: 'Properties', key: 'property_count', sortable: false },
  { title: 'Name', key: 'name' },
  { title: 'City', key: 'city' },
  { title: 'Action', key: 'action', sortable: false },
]

const search = ref('')
const options = ref({ itemsPerPage: 5, page: 1 })
const communities = ref([])
const isLoading = ref(false)

// Assign community dialog
const isAssignCommunityDialogVisible = ref(false)
const availableCommunities = ref([])
const selectedCommunities = ref([])
const isAssigning = ref(false)
const snackbar = ref({ show: false, message: '', color: 'success' })

// Remove community confirmation dialog
const isRemoveCommunityDialogVisible = ref(false)
const communityToRemove = ref<{ id: string; name: string } | null>(null)

// Open remove community confirmation dialog
const openRemoveCommunityDialog = (community: any) => {
  communityToRemove.value = { id: community.id, name: community.name || community.id }
  isRemoveCommunityDialogVisible.value = true
}

// Cancel remove
const cancelRemove = () => {
  isRemoveCommunityDialogVisible.value = false
  communityToRemove.value = null
}

// Confirm remove
const isRemoving = ref(false)
const confirmRemoveCommunity = async () => {
  if (!communityToRemove.value) return
  isRemoving.value = true
  await removeCommunity(communityToRemove.value.id)
  isRemoving.value = false
  isRemoveCommunityDialogVisible.value = false
  communityToRemove.value = null
}

const moreList = [
  { title: 'View', value: 'View' },
  { title: 'Edit', value: 'Edit' },
  { title: 'Delete', value: 'Delete' },
]

// Fetch all available communities for assignment
const fetchAvailableCommunities = async () => {
  try {
    const { data, error } = await supabase
      .from('community')
      .select('id, name, city')
      .order('name')

    if (error) {
      console.error('Error fetching available communities:', error)
      return
    }

    // Filter out already assigned communities
    const assignedIds = communities.value.map((c: any) => c.id)
    availableCommunities.value = (data || [])
      .filter(c => !assignedIds.includes(c.id))
      .map(c => ({
        title: `${c.id} - ${c.name || 'No Name'}`,
        value: c.id,
      }))
  } catch (err) {
    console.error('Error in fetchAvailableCommunities:', err)
  }
}

// Open assign community dialog
const openAssignCommunityDialog = async () => {
  selectedCommunities.value = []
  await fetchAvailableCommunities()
  isAssignCommunityDialogVisible.value = true
}

// Assign communities to user
const assignCommunities = async () => {
  if (selectedCommunities.value.length === 0) return

  try {
    isAssigning.value = true
    const userId = route.params.id

    // Get current user's profile_role
    const { data: profileRole, error: roleError } = await supabase
      .from('profile_role')
      .select('id, scope_community_ids')
      .eq('profile_id', userId)
      .single()

    if (roleError) {
      console.error('Error fetching profile role:', roleError)
      snackbar.value = {
        show: true,
        message: 'Failed to fetch user role',
        color: 'error',
      }
      return
    }

    // Merge existing and new community IDs
    const existingIds = profileRole.scope_community_ids || []
    const newIds = [...new Set([...existingIds, ...selectedCommunities.value])]

    // Update profile_role with new community IDs and set scope_type to 'community'
    const { error: updateError } = await supabase
      .from('profile_role')
      .update({
        scope_community_ids: newIds,
        scope_type: 'community'
      })
      .eq('id', profileRole.id)

    if (updateError) {
      console.error('Error updating profile role:', updateError)
      snackbar.value = {
        show: true,
        message: 'Failed to assign communities',
        color: 'error',
      }
      return
    }

    snackbar.value = {
      show: true,
      message: `Successfully assigned ${selectedCommunities.value.length} community(ies)`,
      color: 'success',
    }

    // Refresh communities list
    await fetchUserCommunities()
    isAssignCommunityDialogVisible.value = false
  } catch (err) {
    console.error('Error in assignCommunities:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to assign communities',
      color: 'error',
    }
  } finally {
    isAssigning.value = false
  }
}

// Remove community from user
const removeCommunity = async (communityId: string) => {
  try {
    const userId = route.params.id

    // Get current user's profile_role
    const { data: profileRole, error: roleError } = await supabase
      .from('profile_role')
      .select('id, scope_community_ids')
      .eq('profile_id', userId)
      .single()

    if (roleError) {
      console.error('Error fetching profile role:', roleError)
      snackbar.value = {
        show: true,
        message: 'Failed to fetch user role',
        color: 'error',
      }
      return
    }

    // Remove community ID from array
    const existingIds = profileRole.scope_community_ids || []
    const newIds = existingIds.filter((id: string) => id !== communityId)

    // Update profile_role
    const { error: updateError } = await supabase
      .from('profile_role')
      .update({ scope_community_ids: newIds })
      .eq('id', profileRole.id)

    if (updateError) {
      console.error('Error updating profile role:', updateError)
      snackbar.value = {
        show: true,
        message: 'Failed to remove community',
        color: 'error',
      }
      return
    }

    snackbar.value = {
      show: true,
      message: 'Community removed successfully',
      color: 'success',
    }

    // Refresh communities list
    await fetchUserCommunities()
  } catch (err) {
    console.error('Error in removeCommunity:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to remove community',
      color: 'error',
    }
  }
}

// Fetch communities that user can manage
const fetchUserCommunities = async () => {
  try {
    isLoading.value = true
    const userId = route.params.id

    // First, get user's role and scope from profile_role
    const { data: profileRoles, error: rolesError } = await supabase
      .from('profile_role')
      .select(`
        scope_type,
        scope_community_ids,
        role:role_id (
          role_name
        )
      `)
      .eq('profile_id', userId)

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
      return
    }

    // Determine which communities to fetch based on scope
    let communityIds = []
    const userRole = profileRoles?.[0]

    if (!userRole) {
      console.log('No role found for user')
      return
    }

    // If super admin or global scope, fetch all communities
    if (userRole.role?.role_name === 'Super Admin' || userRole.scope_type === 'global') {
      const { data: allCommunities, error: commError } = await supabase
        .from('community')
        .select(`
          id,
          name,
          city,
          property:property(count)
        `)
        .order('name')

      if (commError) {
        console.error('Error fetching all communities:', commError)
        return
      }

      communities.value = (allCommunities || []).map(community => ({
        ...community,
        property_count: community.property?.[0]?.count || 0,
      }))
    }
    // If user has scope_community_ids (regardless of scope_type), fetch those communities
    else if (userRole.scope_community_ids?.length > 0) {
      const { data: scopedCommunities, error: commError } = await supabase
        .from('community')
        .select(`
          id,
          name,
          city,
          property:property(count)
        `)
        .in('id', userRole.scope_community_ids)
        .order('name')

      if (commError) {
        console.error('Error fetching scoped communities:', commError)
        return
      }

      communities.value = (scopedCommunities || []).map(community => ({
        ...community,
        property_count: community.property?.[0]?.count || 0,
      }))
    }
  } catch (err) {
    console.error('Error in fetchUserCommunities:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchUserCommunities()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardText class="d-flex justify-space-between align-center flex-wrap gap-4">
          <h5 class="text-h5">
            User's Communities
          </h5>

          <div class="d-flex align-center gap-4">
            <div style="inline-size: 250px;">
              <AppTextField
                v-model="search"
                placeholder="Search Community"
              />
            </div>

            <!-- 👉 Refresh Button -->
            <IconBtn
              @click="fetchUserCommunities"
            >
              <VIcon icon="tabler-refresh" />
              <VTooltip
                activator="parent"
                location="top"
              >
                Refresh
              </VTooltip>
            </IconBtn>

            <!-- 👉 Assign Community Button -->
            <VBtn
              v-if="canManage"
              prepend-icon="tabler-plus"
              @click="openAssignCommunityDialog"
            >
              Assign Community
            </VBtn>
          </div>
        </VCardText>
        <VDivider />
        <!-- 👉 User Communities List Table -->

        <!-- SECTION Datatable -->
        <VDataTable
          v-model:page="options.page"
          :headers="communityTableHeaders"
          :items-per-page="options.itemsPerPage"
          :items="communities"
          item-value="id"
          hide-default-footer
          :search="search"
          :loading="isLoading"
          show-select
          class="text-no-wrap"
        >
          <!-- Community ID -->
          <template #item.id="{ item }">
            <div class="text-body-1 text-high-emphasis font-weight-medium">
              {{ item.id }}
            </div>
          </template>

          <!-- Property Count -->
          <template #item.property_count="{ item }">
            <div class="text-center">
              <VChip
                color="primary"
                size="small"
                label
              >
                {{ item.property_count }}
              </VChip>
            </div>
          </template>

          <!-- Name -->
          <template #item.name="{ item }">
            <div class="text-body-1 text-high-emphasis">
              {{ item.name || 'N/A' }}
            </div>
          </template>

          <!-- City -->
          <template #item.city="{ item }">
            <div class="text-body-1">
              {{ item.city || 'N/A' }}
            </div>
          </template>

          <!-- Action -->
          <template #item.action="{ item }">
            <IconBtn
              v-if="canManage"
              color="error"
              @click="openRemoveCommunityDialog(item)"
            >
              <VIcon icon="tabler-trash" />
              <VTooltip
                activator="parent"
                location="top"
              >
                Remove Community
              </VTooltip>
            </IconBtn>
          </template>

          <!-- TODO Refactor this after vuetify provides proper solution for removing default footer -->
          <template #bottom>
            <TablePagination
              v-model:page="options.page"
              :items-per-page="options.itemsPerPage"
              :total-items="communities.length"
            />
          </template>
        </VDataTable>
        <!-- !SECTION -->
      </VCard>
    </VCol>
  </VRow>

  <!-- 👉 Automation Devices Section (Administrator and above only) -->
  <UserTabDevices class="mt-6" />

  <!-- 👉 Assign Community Dialog -->
  <VDialog
    v-model="isAssignCommunityDialogVisible"
    max-width="500"
  >
    <VCard>
      <VCardText class="text-center px-10 py-6">
        <VIcon
          icon="tabler-building-community"
          color="primary"
          size="56"
          class="my-4"
        />

        <h6 class="text-h6 mb-4">
          Assign Communities
        </h6>

        <p class="text-body-1 mb-4">
          Select one or more communities to assign to this user.
        </p>

        <AppSelect
          v-model="selectedCommunities"
          label="Communities"
          placeholder="Select communities to assign"
          :items="availableCommunities"
          multiple
          chips
          closable-chips
          class="text-start mb-6"
        >
          <template #prepend-inner>
            <VIcon icon="tabler-building-community" />
          </template>
        </AppSelect>

        <div class="d-flex gap-4 justify-center">
          <VBtn
            color="secondary"
            variant="tonal"
            @click="isAssignCommunityDialogVisible = false"
          >
            Cancel
          </VBtn>

          <VBtn
            color="primary"
            variant="elevated"
            :loading="isAssigning"
            :disabled="selectedCommunities.length === 0"
            @click="assignCommunities"
          >
            Assign
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>

  <!-- 👉 Remove Community Confirmation Dialog -->
  <VDialog
    v-model="isRemoveCommunityDialogVisible"
    max-width="500"
  >
    <VCard>
      <VCardText class="text-center px-10 py-6">
        <VIcon
          icon="tabler-building-community-off"
          color="warning"
          size="56"
          class="my-4"
        />

        <h6 class="text-h6 mb-4">
          Remove Community
        </h6>

        <p class="text-body-1 mb-6">
          Are you sure you want to remove <strong>{{ communityToRemove?.name }}</strong> from this user?
        </p>

        <VAlert
          color="warning"
          variant="tonal"
          class="mb-6 text-start"
        >
          <div class="text-body-2">
            The user will no longer have access to this community and its properties.
          </div>
        </VAlert>

        <div class="d-flex gap-4 justify-center">
          <VBtn
            color="secondary"
            variant="tonal"
            @click="cancelRemove"
          >
            Cancel
          </VBtn>

          <VBtn
            color="warning"
            variant="elevated"
            :loading="isRemoving"
            @click="confirmRemoveCommunity"
          >
            Remove
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>

  <!-- 👉 Snackbar -->
  <VSnackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    location="top end"
    :timeout="4000"
  >
    {{ snackbar.message }}
  </VSnackbar>
</template>
