<script setup lang="ts">
import { supabase } from '@/lib/supabase'

const { t } = useI18n({ useScope: 'global' })

const totalCommunities = ref(0)
const growthPercentage = ref(0)
const weeklyData = ref<number[]>([0, 0, 0, 0, 0, 0, 0])
const isLoading = ref(true)

// Fetch communities data
const fetchCommunitiesData = async () => {
  try {
    // Get total communities
    const { count: total } = await supabase
      .from('community')
      .select('*', { count: 'exact', head: true })

    totalCommunities.value = total || 0

    // Get last 7 days of data for the chart
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    const { data: communities } = await supabase
      .from('community')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Group by day of week
    const dailyCounts = [0, 0, 0, 0, 0, 0, 0]
    communities?.forEach(community => {
      const date = new Date(community.created_at)
      const dayIndex = date.getDay() // 0 = Sunday, 6 = Saturday
      dailyCounts[dayIndex]++
    })

    // Keep original order starting from Sunday (S, M, T, W, T, F, S)
    weeklyData.value = [
      dailyCounts[0], // Sunday
      dailyCounts[1], // Monday
      dailyCounts[2], // Tuesday
      dailyCounts[3], // Wednesday
      dailyCounts[4], // Thursday
      dailyCounts[5], // Friday
      dailyCounts[6], // Saturday
    ]

    // Calculate growth percentage (last week vs previous week)
    const twoWeeksAgo = new Date(sevenDaysAgo)
    twoWeeksAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: lastWeekCount } = await supabase
      .from('community')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    const { count: previousWeekCount } = await supabase
      .from('community')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())

    if (previousWeekCount && previousWeekCount > 0) {
      growthPercentage.value = Number((((lastWeekCount || 0) - previousWeekCount) / previousWeekCount * 100).toFixed(1))
    } else {
      growthPercentage.value = lastWeekCount ? 100 : 0
    }
  } catch (error) {
    console.error('Error fetching communities data:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchCommunitiesData()
})

// Ensure chart has valid data (prevent errors with all-zero arrays)
const chartData = computed(() => {
  const hasData = weeklyData.value.some(v => v > 0)

  return hasData ? weeklyData.value : weeklyData.value.map(() => 0.1)
})

const series = computed(() => [
  {
    name: 'Communities',
    data: chartData.value,
  },
])

const chartOptions = computed(() => {
  return {
    chart: {
      height: 90,
      parentHeightOffset: 0,
      type: 'bar',
      toolbar: {
        show: false,
      },
    },
    tooltip: {
      enabled: false,
    },
    plotOptions: {
      bar: {
        barHeight: '100%',
        columnWidth: '30%',
        borderRadius: 4,
        borderRadiusApplication: 'end',
      },
    },
    colors: ['rgba(var(--v-theme-primary),1)'],
    grid: {
      show: false,
      padding: {
        top: -30,
        left: -16,
        bottom: 0,
        right: -6,
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    xaxis: {
      categories: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        show: true,
        style: {
          colors: 'rgba(var(--v-theme-on-surface), 0.38)',
          fontSize: '13px',
        },
      },
    },
    yaxis: {
      labels: {
        show: false,
      },
    },
    responsive: [
      {
        breakpoint: 1441,
        options: {
          plotOptions: {
            bar: {
              columnWidth: '30%',
              borderRadius: 4,
              borderRadiusApplication: 'end',
            },
          },
        },
      },
      {
        breakpoint: 1264,
        options: {
          plotOptions: {
            bar: {
              borderRadius: 6,
              columnWidth: '30%',
              borderRadiusApplication: 'end',
            },
          },
        },
      },
      {
        breakpoint: 960,
        options: {
          plotOptions: {
            bar: {
              columnWidth: '15%',
              borderRadius: 4,
              borderRadiusApplication: 'end',
            },
          },
        },
      },
    ],
  }
})
</script>

<template>
  <VCard>
    <VCardItem class="pb-3">
      <template #prepend>
        <VAvatar
          color="primary"
          variant="tonal"
          rounded
          size="44"
        >
          <VIcon
            icon="tabler-building-community"
            size="28"
          />
        </VAvatar>
      </template>

      <VCardTitle>{{ t('dashboard.communities') }}</VCardTitle>
      <VCardSubtitle>{{ t('dashboard.lastWeek') }}</VCardSubtitle>

      <template #append>
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
            {{ t('dashboard.viewCommunities') }}
          </VTooltip>
        </IconBtn>
      </template>
    </VCardItem>

    <VCardText>
      <VueApexCharts
        v-if="!isLoading"
        :options="chartOptions"
        :series="series"
        :height="62"
      />

      <div class="d-flex align-center justify-space-between gap-x-2 mt-3">
        <h4 class="text-h4 text-center">
          {{ totalCommunities }}
        </h4>
        <div
          class="text-sm"
          :class="growthPercentage >= 0 ? 'text-success' : 'text-error'"
        >
          {{ growthPercentage >= 0 ? '+' : '' }}{{ growthPercentage }}%
        </div>
      </div>

    </VCardText>
  </VCard>
</template>
