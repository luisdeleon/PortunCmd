<script lang="ts" setup>
import { supabase } from '@/lib/supabase'

const route = useRoute()

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

const moreList = [
  { title: 'View', value: 'View' },
  { title: 'Edit', value: 'Edit' },
  { title: 'Delete', value: 'Delete' },
]

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
    // If community scope, fetch only assigned communities
    else if (userRole.scope_type === 'community' && userRole.scope_community_ids?.length > 0) {
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

          <div style="inline-size: 250px;">
            <AppTextField
              v-model="search"
              placeholder="Search Community"
            />
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
          <template #item.action>
            <MoreBtn :menu-list="moreList" />
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
</template>
