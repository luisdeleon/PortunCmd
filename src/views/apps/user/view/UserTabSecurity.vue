<script lang="ts" setup>
import { supabase } from '@/lib/supabase'

const { t } = useI18n({ useScope: 'global' })
const route = useRoute()

// 👉 User data for permission checks
const currentUserData = useCookie<any>('userData')

// Check if user can manage (not Guard or Resident)
const canManage = computed(() => {
  const role = currentUserData.value?.role
  return role && !['Guard', 'Resident'].includes(role)
})

// Property Table Header
const propertyTableHeaders = computed(() => [
  { title: t('userView.propertyTab.tableHeaders.property'), key: 'id' },
  { title: t('userView.propertyTab.tableHeaders.name'), key: 'name' },
  { title: t('userView.propertyTab.tableHeaders.community'), key: 'community_name' },
  { title: t('userView.propertyTab.tableHeaders.status'), key: 'status' },
  { title: t('userView.propertyTab.tableHeaders.action'), key: 'action', sortable: false },
])

const search = ref('')
const options = ref({ itemsPerPage: 5, page: 1 })
const properties = ref([])
const isLoading = ref(false)

// Assign property dialog
const isAssignPropertyDialogVisible = ref(false)
const availableProperties = ref([])
const selectedProperties = ref([])
const isAssigning = ref(false)
const snackbar = ref({ show: false, message: '', color: 'success' })

// Remove property confirmation dialog
const isRemovePropertyDialogVisible = ref(false)
const propertyToRemove = ref<{ id: string; name: string } | null>(null)

// Open remove property confirmation dialog
const openRemovePropertyDialog = (property: any) => {
  propertyToRemove.value = { id: property.id, name: property.name || property.id }
  isRemovePropertyDialogVisible.value = true
}

// Cancel remove
const cancelRemove = () => {
  isRemovePropertyDialogVisible.value = false
  propertyToRemove.value = null
}

// Confirm remove
const confirmRemoveProperty = async () => {
  if (!propertyToRemove.value) return
  await removeProperty(propertyToRemove.value.id)
  isRemovePropertyDialogVisible.value = false
  propertyToRemove.value = null
}

// Fetch available properties for assignment (only from assigned communities)
const fetchAvailableProperties = async () => {
  try {
    const userId = route.params.id

    // First, get user's assigned communities from profile_role
    const { data: profileRole, error: roleError } = await supabase
      .from('profile_role')
      .select('scope_community_ids, scope_type, role:role_id(role_name)')
      .eq('profile_id', userId)
      .single()

    if (roleError) {
      console.error('Error fetching profile role:', roleError)
      return
    }

    const roleName = (profileRole?.role as any)?.role_name
    let assignedCommunityIds: string[] = []

    // Super Admin or global scope can see all properties
    if (roleName === 'Super Admin' || profileRole?.scope_type === 'global') {
      const { data, error } = await supabase
        .from('property')
        .select('id, name, community_id, community:community_id(name)')
        .order('name')

      if (error) {
        console.error('Error fetching all properties:', error)
        return
      }

      const assignedIds = properties.value.map((p: any) => p.id)
      availableProperties.value = (data || [])
        .filter(p => !assignedIds.includes(p.id))
        .map(p => ({
          title: `${p.id} - ${p.name || 'No Name'} (${(p.community as any)?.name || p.community_id})`,
          value: p.id,
        }))
      return
    }

    // For other roles, only show properties from assigned communities
    assignedCommunityIds = profileRole?.scope_community_ids || []

    if (assignedCommunityIds.length === 0) {
      availableProperties.value = []
      return
    }

    const { data, error } = await supabase
      .from('property')
      .select('id, name, community_id, community:community_id(name)')
      .in('community_id', assignedCommunityIds)
      .order('name')

    if (error) {
      console.error('Error fetching available properties:', error)
      return
    }

    // Filter out already assigned properties
    const assignedIds = properties.value.map((p: any) => p.id)
    availableProperties.value = (data || [])
      .filter(p => !assignedIds.includes(p.id))
      .map(p => ({
        title: `${p.id} - ${p.name || 'No Name'} (${(p.community as any)?.name || p.community_id})`,
        value: p.id,
      }))
  } catch (err) {
    console.error('Error in fetchAvailableProperties:', err)
  }
}

// Open assign property dialog
const openAssignPropertyDialog = async () => {
  selectedProperties.value = []
  await fetchAvailableProperties()
  isAssignPropertyDialogVisible.value = true
}

// Assign properties to user
const assignProperties = async () => {
  if (selectedProperties.value.length === 0) return

  try {
    isAssigning.value = true
    const userId = route.params.id

    // Get current user's profile_role
    const { data: profileRole, error: roleError } = await supabase
      .from('profile_role')
      .select('id, scope_property_ids')
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

    // Merge existing and new property IDs
    const existingIds = profileRole.scope_property_ids || []
    const newIds = [...new Set([...existingIds, ...selectedProperties.value])]

    // Update profile_role with new property IDs
    // Note: scope_type should be set when assigning communities, not properties
    // Properties are secondary to communities for scope
    const { error: updateError } = await supabase
      .from('profile_role')
      .update({ scope_property_ids: newIds })
      .eq('id', profileRole.id)

    if (updateError) {
      console.error('Error updating profile role:', updateError)
      snackbar.value = {
        show: true,
        message: 'Failed to assign properties',
        color: 'error',
      }
      return
    }

    // Also add to property_owner table for each property
    for (const propertyId of selectedProperties.value) {
      // Get the property's community_id
      const { data: propData } = await supabase
        .from('property')
        .select('community_id')
        .eq('id', propertyId)
        .single()

      // Check if already exists
      const { data: existingOwner } = await supabase
        .from('property_owner')
        .select('id')
        .eq('profile_id', userId)
        .eq('property_id', propertyId)
        .maybeSingle()

      if (!existingOwner) {
        await supabase
          .from('property_owner')
          .insert({
            profile_id: userId,
            property_id: propertyId,
            community_id: propData?.community_id,
          })
      }
    }

    snackbar.value = {
      show: true,
      message: `Successfully assigned ${selectedProperties.value.length} property(ies)`,
      color: 'success',
    }

    // Refresh properties list
    await fetchUserProperties()
    isAssignPropertyDialogVisible.value = false
  } catch (err) {
    console.error('Error in assignProperties:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to assign properties',
      color: 'error',
    }
  } finally {
    isAssigning.value = false
  }
}

// Remove property from user
const removeProperty = async (propertyId: string) => {
  try {
    const userId = route.params.id

    // Get current user's profile_role
    const { data: profileRole, error: roleError } = await supabase
      .from('profile_role')
      .select('id, scope_property_ids')
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

    // Remove property ID from array
    const existingIds = profileRole.scope_property_ids || []
    const newIds = existingIds.filter((id: string) => id !== propertyId)

    // Update profile_role
    const { error: updateError } = await supabase
      .from('profile_role')
      .update({ scope_property_ids: newIds })
      .eq('id', profileRole.id)

    if (updateError) {
      console.error('Error updating profile role:', updateError)
      snackbar.value = {
        show: true,
        message: 'Failed to remove property',
        color: 'error',
      }
      return
    }

    // Also remove from property_owner table
    await supabase
      .from('property_owner')
      .delete()
      .eq('profile_id', userId)
      .eq('property_id', propertyId)

    snackbar.value = {
      show: true,
      message: 'Property removed successfully',
      color: 'success',
    }

    // Refresh properties list
    await fetchUserProperties()
  } catch (err) {
    console.error('Error in removeProperty:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to remove property',
      color: 'error',
    }
  }
}

// Fetch properties that user owns/manages
const fetchUserProperties = async () => {
  try {
    isLoading.value = true
    const userId = route.params.id

    // First, get user's role and scope from profile_role
    const { data: profileRoles, error: rolesError } = await supabase
      .from('profile_role')
      .select(`
        scope_type,
        scope_property_ids,
        role:role_id (
          role_name
        )
      `)
      .eq('profile_id', userId)

    if (rolesError) {
      console.error('Error fetching user roles:', rolesError)
      return
    }

    const userRole = profileRoles?.[0]

    if (!userRole) {
      console.log('No role found for user')
      return
    }

    // If super admin or global scope, fetch all properties
    if (userRole.role?.role_name === 'Super Admin' || userRole.scope_type === 'global') {
      const { data: allProperties, error: propError } = await supabase
        .from('property')
        .select(`
          id,
          name,
          status,
          community_id,
          community:community_id(name)
        `)
        .order('name')

      if (propError) {
        console.error('Error fetching all properties:', propError)
        return
      }

      properties.value = (allProperties || []).map(property => ({
        ...property,
        community_name: (property.community as any)?.name || property.community_id,
      }))
    }
    // If property scope, fetch only assigned properties
    else if (userRole.scope_property_ids?.length > 0) {
      const { data: scopedProperties, error: propError } = await supabase
        .from('property')
        .select(`
          id,
          name,
          status,
          community_id,
          community:community_id(name)
        `)
        .in('id', userRole.scope_property_ids)
        .order('name')

      if (propError) {
        console.error('Error fetching scoped properties:', propError)
        return
      }

      properties.value = (scopedProperties || []).map(property => ({
        ...property,
        community_name: (property.community as any)?.name || property.community_id,
      }))
    }
    // Also check property_owner table as fallback
    else {
      const { data: ownedProperties, error: ownerError } = await supabase
        .from('property_owner')
        .select(`
          property:property_id(
            id,
            name,
            status,
            community_id,
            community:community_id(name)
          )
        `)
        .eq('profile_id', userId)

      if (ownerError) {
        console.error('Error fetching owned properties:', ownerError)
        return
      }

      properties.value = (ownedProperties || [])
        .filter(po => po.property)
        .map(po => ({
          ...(po.property as any),
          community_name: (po.property as any)?.community?.name || (po.property as any)?.community_id,
        }))
    }
  } catch (err) {
    console.error('Error in fetchUserProperties:', err)
  } finally {
    isLoading.value = false
  }
}

// Get status color
const getStatusColor = (status: string) => {
  const statusColors: Record<string, string> = {
    active: 'success',
    vacant: 'warning',
    'access-restricted': 'error',
    maintenance: 'info',
    'emergency-lockdown': 'error',
    'guest-mode': 'primary',
    'out-of-service': 'secondary',
    deactivated: 'error',
    archived: 'secondary',
  }
  return statusColors[status] || 'secondary'
}

onMounted(() => {
  fetchUserProperties()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardText class="d-flex justify-space-between align-center flex-wrap gap-4">
          <h5 class="text-h5">
            {{ t('userView.propertyTab.title') }}
          </h5>

          <div class="d-flex align-center gap-4">
            <div style="inline-size: 250px;">
              <AppTextField
                v-model="search"
                :placeholder="t('userView.propertyTab.searchPlaceholder')"
              />
            </div>

            <!-- 👉 Refresh Button -->
            <IconBtn
              @click="fetchUserProperties"
            >
              <VIcon icon="tabler-refresh" />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('userView.tooltips.refresh') }}
              </VTooltip>
            </IconBtn>

            <!-- 👉 Assign Property Button -->
            <VBtn
              v-if="canManage"
              prepend-icon="tabler-plus"
              @click="openAssignPropertyDialog"
            >
              {{ t('userView.propertyTab.assignProperty') }}
            </VBtn>
          </div>
        </VCardText>
        <VDivider />
        <!-- 👉 User Properties List Table -->

        <!-- SECTION Datatable -->
        <VDataTable
          v-model:page="options.page"
          :headers="propertyTableHeaders"
          :items-per-page="options.itemsPerPage"
          :items="properties"
          item-value="id"
          hide-default-footer
          :search="search"
          :loading="isLoading"
          show-select
          class="text-no-wrap"
        >
          <!-- Property ID -->
          <template #item.id="{ item }">
            <div class="text-body-1 text-high-emphasis font-weight-medium">
              {{ item.id }}
            </div>
          </template>

          <!-- Name -->
          <template #item.name="{ item }">
            <div class="text-body-1 text-high-emphasis">
              {{ item.name || 'N/A' }}
            </div>
          </template>

          <!-- Community -->
          <template #item.community_name="{ item }">
            <div class="text-body-1">
              {{ item.community_name || 'N/A' }}
            </div>
          </template>

          <!-- Status -->
          <template #item.status="{ item }">
            <VChip
              :color="getStatusColor(item.status)"
              size="small"
              label
              class="text-capitalize"
            >
              {{ item.status || 'N/A' }}
            </VChip>
          </template>

          <!-- Action -->
          <template #item.action="{ item }">
            <IconBtn
              v-if="canManage"
              color="error"
              @click="openRemovePropertyDialog(item)"
            >
              <VIcon icon="tabler-trash" />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('userView.propertyTab.removeProperty') }}
              </VTooltip>
            </IconBtn>
          </template>

          <!-- TODO Refactor this after vuetify provides proper solution for removing default footer -->
          <template #bottom>
            <TablePagination
              v-model:page="options.page"
              :items-per-page="options.itemsPerPage"
              :total-items="properties.length"
            />
          </template>
        </VDataTable>
        <!-- !SECTION -->
      </VCard>
    </VCol>
  </VRow>

  <!-- 👉 Assign Property Dialog -->
  <VDialog
    v-model="isAssignPropertyDialogVisible"
    max-width="500"
  >
    <VCard>
      <VCardText class="text-center px-10 py-6">
        <VIcon
          icon="tabler-home"
          color="primary"
          size="56"
          class="my-4"
        />

        <h6 class="text-h6 mb-4">
          {{ t('userView.propertyTab.assignDialog.title') }}
        </h6>

        <p class="text-body-1 mb-4">
          {{ t('userView.propertyTab.assignDialog.description') }}
        </p>

        <AppSelect
          v-model="selectedProperties"
          :label="t('userView.propertyTab.assignDialog.label')"
          :placeholder="t('userView.propertyTab.assignDialog.placeholder')"
          :items="availableProperties"
          multiple
          chips
          closable-chips
          class="text-start mb-6"
        >
          <template #prepend-inner>
            <VIcon icon="tabler-home" />
          </template>
        </AppSelect>

        <div class="d-flex gap-4 justify-center">
          <VBtn
            color="secondary"
            variant="tonal"
            @click="isAssignPropertyDialogVisible = false"
          >
            {{ t('common.cancel') }}
          </VBtn>

          <VBtn
            color="primary"
            variant="elevated"
            :loading="isAssigning"
            :disabled="selectedProperties.length === 0"
            @click="assignProperties"
          >
            {{ t('userView.propertyTab.assignDialog.assign') }}
          </VBtn>
        </div>
      </VCardText>
    </VCard>
  </VDialog>

  <!-- 👉 Remove Property Confirmation Dialog -->
  <VDialog
    v-model="isRemovePropertyDialogVisible"
    max-width="500"
  >
    <VCard>
      <VCardText class="text-center px-10 py-6">
        <VIcon
          icon="tabler-home-off"
          color="warning"
          size="56"
          class="my-4"
        />

        <h6 class="text-h6 mb-4">
          {{ t('userView.propertyTab.removeDialog.title') }}
        </h6>

        <p class="text-body-1 mb-6">
          {{ t('userView.propertyTab.removeDialog.message', { name: propertyToRemove?.name }) }}
        </p>

        <VAlert
          color="warning"
          variant="tonal"
          class="mb-6 text-start"
        >
          <div class="text-body-2">
            {{ t('userView.propertyTab.removeDialog.warning') }}
          </div>
        </VAlert>

        <div class="d-flex gap-4 justify-center">
          <VBtn
            color="secondary"
            variant="tonal"
            @click="cancelRemove"
          >
            {{ t('common.cancel') }}
          </VBtn>

          <VBtn
            color="warning"
            variant="elevated"
            @click="confirmRemoveProperty"
          >
            {{ t('userView.propertyTab.removeDialog.remove') }}
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
