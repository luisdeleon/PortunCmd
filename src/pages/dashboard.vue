<script setup lang="ts">
// PortunCmd Dashboard with custom components
import PortunCmdCommunitiesCard from '@/views/dashboards/portuncmd/PortunCmdCommunitiesCard.vue'
import PortunCmdPropertiesCard from '@/views/dashboards/portuncmd/PortunCmdPropertiesCard.vue'
import PortunCmdUsersCard from '@/views/dashboards/portuncmd/PortunCmdUsersCard.vue'
import PortunCmdActiveVisitorsCard from '@/views/dashboards/portuncmd/PortunCmdActiveVisitorsCard.vue'
import PortunCmdCommunitiesByCountry from '@/views/dashboards/portuncmd/PortunCmdCommunitiesByCountry.vue'
import PortunCmdCommunitiesStatusCard from '@/views/dashboards/portuncmd/PortunCmdCommunitiesStatusCard.vue'
import PortunCmdPropertiesStatusCard from '@/views/dashboards/portuncmd/PortunCmdPropertiesStatusCard.vue'

// TODO: Replace remaining CRM components with PortunCmd-specific components
import CrmActivityTimeline from '@/views/dashboards/crm/CrmActivityTimeline.vue'

definePage({
  meta: {
    layout: 'default',
    public: false, // Requires authentication
  },
})
</script>

<template>
  <VRow class="match-height">
    <!-- 👉 Communities Card with Bar Chart -->
    <VCol
      cols="12"
      md="6"
      sm="6"
      lg="3"
    >
      <PortunCmdCommunitiesCard />
    </VCol>

    <!-- 👉 Properties Card with Area Chart -->
    <VCol
      cols="12"
      md="6"
      sm="6"
      lg="3"
    >
      <PortunCmdPropertiesCard />
    </VCol>

    <!-- 👉 Users Card with Bar Chart -->
    <VCol
      cols="12"
      md="6"
      sm="6"
      lg="3"
    >
      <PortunCmdUsersCard />
    </VCol>

    <!-- 👉 Active Visitors Card with Area Chart -->
    <VCol
      cols="12"
      md="6"
      sm="6"
      lg="3"
    >
      <PortunCmdActiveVisitorsCard />
    </VCol>

    <!-- 👉 Communities by Country -->
    <VCol
      cols="12"
      md="6"
      lg="4"
    >
      <PortunCmdCommunitiesByCountry />
    </VCol>

    <!-- 👉 Communities Status Card -->
    <VCol
      cols="12"
      md="6"
      lg="4"
    >
      <PortunCmdCommunitiesStatusCard />
    </VCol>

    <!-- 👉 Properties Status Card -->
    <VCol
      cols="12"
      md="6"
      lg="4"
    >
      <PortunCmdPropertiesStatusCard />
    </VCol>

    <!-- 👉 Activity Timeline - Good fit for Visitor Activity -->
    <VCol
      cols="12"
      md="6"
    >
      <CrmActivityTimeline />
    </VCol>
  </VRow>
</template>
