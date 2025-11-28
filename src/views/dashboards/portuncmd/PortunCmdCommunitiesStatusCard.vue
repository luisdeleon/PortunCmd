<script setup lang="ts">
import { supabase } from '@/lib/supabase'
import { useTheme } from 'vuetify'

const { t } = useI18n({ useScope: 'global' })
const vuetifyTheme = useTheme()

const statusData = ref<{ status: string; count: number; color: string }[]>([])
const totalCommunities = ref(0)
const activeCount = ref(0)
const activePercentage = ref(0)
const isLoading = ref(false)

// Status colors mapping
const statusColors: Record<string, string> = {
  'active': 'rgb(var(--v-theme-success))',
  'inactive': 'rgb(var(--v-theme-error))',
  'archived': 'rgb(var(--v-theme-secondary))',
  'pre-launch': 'rgb(var(--v-theme-warning))',
}

const statusLabels = computed(() => ({
  'active': t('status.active'),
  'inactive': t('status.inactive'),
  'archived': t('status.archived'),
  'pre-launch': t('status.preLaunch'),
}))

const fetchStatusData = async () => {
  try {
    isLoading.value = true

    const { data, error } = await supabase
      .from('community')
      .select('status')

    if (error) {
      console.error('Error fetching communities:', error)
      return
    }

    if (!data || data.length === 0) {
      statusData.value = []
      totalCommunities.value = 0
      return
    }

    // Count by status
    const statusCount: Record<string, number> = {}
    data.forEach(community => {
      const status = community.status || 'unknown'
      statusCount[status] = (statusCount[status] || 0) + 1
    })

    totalCommunities.value = data.length
    activeCount.value = statusCount['active'] || 0
    activePercentage.value = totalCommunities.value > 0
      ? Number(((activeCount.value / totalCommunities.value) * 100).toFixed(1))
      : 0

    // Convert to array
    statusData.value = Object.entries(statusCount)
      .map(([status, count]) => ({
        status,
        count,
        color: statusColors[status] || 'rgb(var(--v-theme-info))',
      }))
      .sort((a, b) => b.count - a.count)
  } catch (err) {
    console.error('Error in fetchStatusData:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchStatusData()
})

const series = computed(() => statusData.value.map(s => s.count))

const chartOptions = computed(() => {
  const currentTheme = vuetifyTheme.current.value.colors
  // Get the top status for center display
  const topStatus = statusData.value[0]
  const topPercentage = topStatus && totalCommunities.value > 0
    ? Math.round((topStatus.count / totalCommunities.value) * 100)
    : 0

  return {
    chart: {
      type: 'donut',
      height: 220,
      parentHeightOffset: 0,
      toolbar: { show: false },
    },
    labels: statusData.value.map(s => statusLabels.value[s.status as keyof typeof statusLabels.value] || s.status),
    colors: [
      currentTheme.success,
      currentTheme.error,
      currentTheme.secondary,
      currentTheme.warning,
    ],
    stroke: { width: 0 },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: {
      y: {
        formatter: (val: number) => `${val} communities`,
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '0.875rem',
              fontWeight: 400,
              color: currentTheme.success,
              offsetY: 20,
            },
            value: {
              show: true,
              fontSize: '1.75rem',
              fontWeight: 500,
              color: currentTheme.success,
              offsetY: -15,
              formatter: () => `${topPercentage}%`,
            },
            total: {
              show: true,
              showAlways: true,
              label: topStatus ? (statusLabels.value[topStatus.status as keyof typeof statusLabels.value] || topStatus.status) : '',
              fontSize: '0.875rem',
              fontWeight: 400,
              color: currentTheme.success,
              formatter: () => `${topPercentage}%`,
            },
          },
        },
      },
    },
  }
})
</script>

<template>
  <VCard>
    <VCardItem>
      <VCardTitle>
        {{ t('Communities Status') }}
      </VCardTitle>

      <template #append>
        <div class="d-flex align-center">
          <IconBtn
            :to="{ name: 'apps-community-list' }"
            color="primary"
            variant="text"
          >
            <VIcon
              icon="tabler-external-link"
              size="22"
            />
            <VTooltip
              activator="parent"
              location="top"
            >
              View Communities
            </VTooltip>
          </IconBtn>
          <MoreBtn :menu-list="[{ title: t('Refresh'), value: 'refresh' }]" />
        </div>
      </template>
    </VCardItem>

    <VCardText>
      <div
        v-if="isLoading"
        class="d-flex justify-center py-8"
      >
        <VProgressCircular
          indeterminate
          color="primary"
          size="40"
        />
      </div>

      <template v-else>
        <!-- Centered Donut Chart -->
        <div class="d-flex justify-center">
          <VueApexCharts
            v-if="statusData.length > 0"
            type="donut"
            :options="chartOptions"
            :series="series"
            :height="220"
            :width="220"
          />
        </div>

        <!-- Legend in 2 columns -->
        <div class="d-flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4">
          <div
            v-for="item in statusData"
            :key="item.status"
            class="d-flex align-center gap-2"
            style="min-inline-size: 120px;"
          >
            <VIcon
              icon="tabler-circle-filled"
              :color="item.status === 'active' ? 'success' : item.status === 'inactive' ? 'error' : item.status === 'archived' ? 'secondary' : 'warning'"
              size="10"
            />
            <span class="text-body-2">
              {{ statusLabels[item.status as keyof typeof statusLabels] || item.status }}
            </span>
          </div>
        </div>
      </template>
    </VCardText>
  </VCard>
</template>
