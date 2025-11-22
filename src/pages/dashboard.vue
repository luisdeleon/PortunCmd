<script setup lang="ts">
// PortunCmd Dashboard with custom components
import PortunCmdCommunitiesCard from '@/views/dashboards/portuncmd/PortunCmdCommunitiesCard.vue'
import PortunCmdPropertiesCard from '@/views/dashboards/portuncmd/PortunCmdPropertiesCard.vue'
import PortunCmdUsersCard from '@/views/dashboards/portuncmd/PortunCmdUsersCard.vue'
import PortunCmdRolesCard from '@/views/dashboards/portuncmd/PortunCmdRolesCard.vue'

// TODO: Replace remaining CRM components with PortunCmd-specific components
import CrmActiveProject from '@/views/dashboards/crm/CrmActiveProject.vue'
import CrmActivityTimeline from '@/views/dashboards/crm/CrmActivityTimeline.vue'
import CrmAnalyticsSales from '@/views/dashboards/crm/CrmAnalyticsSales.vue'
import CrmEarningReportsYearlyOverview from '@/views/dashboards/crm/CrmEarningReportsYearlyOverview.vue'
import CrmProjectStatus from '@/views/dashboards/crm/CrmProjectStatus.vue'
import CrmRecentTransactions from '@/views/dashboards/crm/CrmRecentTransactions.vue'
import CrmRevenueGrowth from '@/views/dashboards/crm/CrmRevenueGrowth.vue'
import CrmSalesByCountries from '@/views/dashboards/crm/CrmSalesByCountries.vue'

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

    <!-- 👉 Roles Card with Area Chart -->
    <VCol
      cols="12"
      md="6"
      sm="6"
      lg="3"
    >
      <PortunCmdRolesCard />
    </VCol>

    <!-- 👉 TODO: Replace with Visitor Growth Chart -->
    <VCol
      cols="12"
      md="8"
      lg="4"
    >
      <CrmRevenueGrowth />
    </VCol>

    <!-- 👉 TODO: Replace with Community/Property Overview -->
    <VCol
      cols="12"
      md="8"
    >
      <CrmEarningReportsYearlyOverview />
    </VCol>

    <!-- 👉 TODO: Replace with Access Statistics -->
    <VCol
      cols="12"
      md="4"
    >
      <CrmAnalyticsSales />
    </VCol>

    <!-- 👉 TODO: Replace with Communities by Location -->
    <VCol
      cols="12"
      md="4"
    >
      <CrmSalesByCountries />
    </VCol>

    <!-- 👉 TODO: Replace with Community Status -->
    <VCol
      cols="12"
      md="4"
    >
      <CrmProjectStatus />
    </VCol>

    <!-- 👉 TODO: Replace with Active Communities -->
    <VCol
      cols="12"
      md="4"
    >
      <CrmActiveProject />
    </VCol>

    <!-- 👉 TODO: Replace with Recent Access Logs -->
    <VCol
      cols="12"
      md="6"
    >
      <CrmRecentTransactions />
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
