<script setup lang="ts">
import { supabase } from '@/lib/supabase'

const totalCommunities = ref(0)
const growthPercentage = ref(0)
const weeklyData = ref<number[]>([0, 0, 0, 0, 0, 0, 0])

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

    // Reorder to start from Monday (M, T, W, T, F, S, S)
    weeklyData.value = [
      dailyCounts[1], // Monday
      dailyCounts[2], // Tuesday
      dailyCounts[3], // Wednesday
      dailyCounts[4], // Thursday
      dailyCounts[5], // Friday
      dailyCounts[6], // Saturday
      dailyCounts[0], // Sunday
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
  }
}

onMounted(() => {
  fetchCommunitiesData()
})

const series = computed(() => [
  {
    name: 'Communities',
    data: weeklyData.value,
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
        startingShape: 'rounded',
        endingShape: 'rounded',
        borderRadius: 4,
        colors: {
          backgroundBarColors: [
            'rgba(var(--v-track-bg))',
            'rgba(var(--v-track-bg))',
            'rgba(var(--v-track-bg))',
            'rgba(var(--v-track-bg))',
            'rgba(var(--v-track-bg))',
            'rgba(var(--v-track-bg))',
            'rgba(var(--v-track-bg))',
          ],
          backgroundBarRadius: 4,
        },
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
      categories: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        show: false,
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

      <VCardTitle>Total Communities</VCardTitle>
      <VCardSubtitle>Last Week</VCardSubtitle>
    </VCardItem>

    <VCardText>
      <VueApexCharts
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

      <VDivider class="my-3" />

      <div class="d-flex align-center justify-center">
        <VBtn
          :to="{ name: 'apps-community-list' }"
          variant="text"
          color="primary"
          size="small"
        >
          View All Communities
          <VIcon
            end
            icon="tabler-chevron-right"
            size="18"
          />
        </VBtn>
      </div>
    </VCardText>
  </VCard>
</template>
