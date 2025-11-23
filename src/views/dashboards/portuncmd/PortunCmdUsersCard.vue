<script setup lang="ts">
import { supabase } from '@/lib/supabase'

const totalUsers = ref(0)
const growthPercentage = ref(0)
const weeklyData = ref<number[]>([0, 0, 0, 0, 0, 0, 0])

// Fetch users data
const fetchUsersData = async () => {
  try {
    // Get total users
    const { count: total } = await supabase
      .from('profile')
      .select('*', { count: 'exact', head: true })

    totalUsers.value = total || 0

    // Get last 7 days of data for the chart
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    const { data: users } = await supabase
      .from('profile')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Group by day of week
    const dailyCounts = [0, 0, 0, 0, 0, 0, 0]
    users?.forEach(user => {
      const date = new Date(user.created_at)
      const dayIndex = date.getDay()
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

    // Calculate growth percentage
    const twoWeeksAgo = new Date(sevenDaysAgo)
    twoWeeksAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: lastWeekCount } = await supabase
      .from('profile')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    const { count: previousWeekCount } = await supabase
      .from('profile')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())

    if (previousWeekCount && previousWeekCount > 0) {
      growthPercentage.value = Number((((lastWeekCount || 0) - previousWeekCount) / previousWeekCount * 100).toFixed(1))
    } else {
      growthPercentage.value = lastWeekCount ? 100 : 0
    }
  } catch (error) {
    console.error('Error fetching users data:', error)
  }
}

onMounted(() => {
  fetchUsersData()
})

const series = computed(() => [
  {
    name: 'Users',
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
    colors: ['rgba(var(--v-theme-info),1)'],
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
          color="info"
          variant="tonal"
          rounded
          size="44"
        >
          <VIcon
            icon="tabler-users"
            size="28"
          />
        </VAvatar>
      </template>

      <VCardTitle>Total Users</VCardTitle>
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
          {{ totalUsers }}
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
          :to="{ name: 'apps-user-list' }"
          variant="text"
          color="info"
          size="small"
        >
          View All Users
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
