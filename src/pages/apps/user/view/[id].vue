<script setup lang="ts">
import UserBioPanel from '@/views/apps/user/view/UserBioPanel.vue'
import UserTabAccount from '@/views/apps/user/view/UserTabAccount.vue'
import UserTabBillingsPlans from '@/views/apps/user/view/UserTabBillingsPlans.vue'
import UserTabConnections from '@/views/apps/user/view/UserTabConnections.vue'
import UserTabNotifications from '@/views/apps/user/view/UserTabNotifications.vue'
import UserTabSecurity from '@/views/apps/user/view/UserTabSecurity.vue'
import { supabase } from '@/lib/supabase'
import { useI18n } from 'vue-i18n'

definePage({
  meta: {
    public: false, // Requires authentication
  },
})

const route = useRoute('apps-user-view-id')
const { t } = useI18n()

const userTab = ref(null)

const tabs = computed(() => [
  { icon: 'tabler-building-community', title: 'Community' },
  { icon: 'tabler-home', title: 'Property' },
  { icon: 'tabler-bookmark', title: 'Billing & Plan' },
  { icon: 'tabler-bell', title: 'Notifications' },
  { icon: 'tabler-link', title: 'Connections' },
])

// Fetch user data from Supabase
const userData = ref(null)
const isLoading = ref(true)
const hasError = ref(false)

const fetchUserData = async () => {
  try {
    isLoading.value = true
    hasError.value = false

    const { data, error } = await supabase
      .from('profile')
      .select(`
        id,
        display_name,
        email,
        enabled,
        def_community_id,
        def_property_id,
        profile_role!profile_role_profile_id_fkey(
          role_id,
          role!profile_role_role_id_fkey(role_name)
        )
      `)
      .eq('id', route.params.id)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      hasError.value = true
      return
    }

    if (!data) {
      hasError.value = true
      return
    }

    // Fetch community count (from community_manager table)
    const { count: communityCount, error: communityError } = await supabase
      .from('community_manager')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', route.params.id)

    // Fetch property count (from property_owner table)
    const { count: propertyCount, error: propertyError } = await supabase
      .from('property_owner')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', route.params.id)

    // Transform data to match expected format
    userData.value = {
      id: data.id,
      fullName: data.display_name || 'No Name',
      firstName: data.display_name?.split(' ')[0] || '',
      lastName: data.display_name?.split(' ').slice(1).join(' ') || '',
      company: 'N/A',
      username: data.display_name || 'No Name',
      role: data.profile_role?.[0]?.role?.role_name || 'No Role',
      country: 'N/A',
      contact: 'N/A',
      email: data.email || 'No Email',
      currentPlan: data.profile_role?.[0]?.role?.role_name || 'No Role',
      status: data.enabled ? 'active' : 'inactive',
      enabled: data.enabled || false,
      avatar: null,
      communitiesCount: communityCount || 0,
      propertiesCount: propertyCount || 0,
      taxId: 'N/A',
      language: 'English',
    }
  } catch (err) {
    console.error('Error in fetchUserData:', err)
    hasError.value = true
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchUserData()
})
</script>

<template>
  <div v-if="isLoading">
    <VRow>
      <VCol cols="12">
        <VCard>
          <VCardText class="text-center">
            <VProgressCircular
              indeterminate
              color="primary"
              size="64"
            />
            <div class="mt-4">
              {{ $t('userView.loading') }}
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </div>
  <VRow v-else-if="userData">
    <VCol
      cols="12"
      md="5"
      lg="4"
    >
      <UserBioPanel :user-data="userData" />
    </VCol>

    <VCol
      cols="12"
      md="7"
      lg="8"
    >
      <VTabs
        v-model="userTab"
        class="v-tabs-pill"
      >
        <VTab
          v-for="tab in tabs"
          :key="tab.icon"
        >
          <VIcon
            :size="18"
            :icon="tab.icon"
            class="me-1"
          />
          <span>{{ tab.title }}</span>
        </VTab>
      </VTabs>

      <VWindow
        v-model="userTab"
        class="mt-6 disable-tab-transition"
        :touch="false"
      >
        <VWindowItem>
          <UserTabAccount />
        </VWindowItem>

        <VWindowItem>
          <UserTabSecurity />
        </VWindowItem>

        <VWindowItem>
          <UserTabBillingsPlans />
        </VWindowItem>

        <VWindowItem>
          <UserTabNotifications />
        </VWindowItem>

        <VWindowItem>
          <UserTabConnections />
        </VWindowItem>
      </VWindow>
    </VCol>
  </VRow>
  <div v-else>
    <VAlert
      type="error"
      variant="tonal"
    >
      {{ $t('userView.notFound', { id: route.params.id }) }}
    </VAlert>
  </div>
</template>
