<script setup lang="ts">
// PortunCmd Dashboard with custom components
import PortunCmdCommunitiesCard from '@/views/dashboards/portuncmd/PortunCmdCommunitiesCard.vue'
import PortunCmdPropertiesCard from '@/views/dashboards/portuncmd/PortunCmdPropertiesCard.vue'
import PortunCmdUsersCard from '@/views/dashboards/portuncmd/PortunCmdUsersCard.vue'
import PortunCmdActiveVisitorsCard from '@/views/dashboards/portuncmd/PortunCmdActiveVisitorsCard.vue'
import PortunCmdCommunitiesByCountry from '@/views/dashboards/portuncmd/PortunCmdCommunitiesByCountry.vue'
import PortunCmdCommunitiesStatusCard from '@/views/dashboards/portuncmd/PortunCmdCommunitiesStatusCard.vue'
import PortunCmdPropertiesStatusCard from '@/views/dashboards/portuncmd/PortunCmdPropertiesStatusCard.vue'

// Visitor Analytics Cards
import VisitorLogsHourlyTrafficCard from '@/views/apps/visitor/logs/VisitorLogsHourlyTrafficCard.vue'
import VisitorLogsPeakHourCard from '@/views/apps/visitor/logs/VisitorLogsPeakHourCard.vue'
import VisitorLogsBusiestDayCard from '@/views/apps/visitor/logs/VisitorLogsBusiestDayCard.vue'

// TODO: Replace remaining CRM components with PortunCmd-specific components
import CrmActivityTimeline from '@/views/dashboards/crm/CrmActivityTimeline.vue'

definePage({
  meta: {
    layout: 'default',
    public: false, // Requires authentication
  },
})

// Hourly data for Peak Hour card (shared from hourly traffic card)
const entriesByHour = ref<number[]>(Array(24).fill(0))
const isHourlyLoading = ref(true)
const selectedTimeRange = ref(90)

// Callback to receive hourly data from the chart component
const onHourlyDataLoaded = (data: { entries: number[], exits: number[], isLoading: boolean, timeRange: number }) => {
  entriesByHour.value = data.entries
  isHourlyLoading.value = data.isLoading
  selectedTimeRange.value = data.timeRange
}
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

    <!-- 👉 Visitor Hourly Traffic Analytics -->
    <VCol
      cols="12"
      lg="8"
    >
      <VisitorLogsHourlyTrafficCard @data-loaded="onHourlyDataLoaded" />
    </VCol>

    <!-- 👉 Peak Hour & Busiest Day Cards -->
    <VCol
      cols="12"
      lg="4"
    >
      <VRow>
        <VCol cols="12">
          <VisitorLogsPeakHourCard
            :entries-by-hour="entriesByHour"
            :is-loading="isHourlyLoading"
          />
        </VCol>
        <VCol cols="12">
          <VisitorLogsBusiestDayCard :time-range="selectedTimeRange" />
        </VCol>
      </VRow>
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
