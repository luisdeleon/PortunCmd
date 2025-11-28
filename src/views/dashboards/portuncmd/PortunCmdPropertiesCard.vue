<script setup lang="ts">
import { useTheme } from 'vuetify'
import { supabase } from '@/lib/supabase'

const vuetifyTheme = useTheme()
const currentTheme = vuetifyTheme.current.value.colors

const totalProperties = ref(0)
const growthPercentage = ref(0)
const weeklyData = ref<number[]>([0, 0, 0, 0, 0, 0, 0])
const isLoading = ref(true)

// Fetch properties data
const fetchPropertiesData = async () => {
  try {
    // Get total properties
    const { count: total } = await supabase
      .from('property')
      .select('*', { count: 'exact', head: true })

    totalProperties.value = total || 0

    // Get last 7 days of data for the chart
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    const { data: properties } = await supabase
      .from('property')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Group by day of week
    const dailyCounts = [0, 0, 0, 0, 0, 0, 0]
    properties?.forEach(property => {
      const date = new Date(property.created_at)
      const dayIndex = date.getDay()
      dailyCounts[dayIndex]++
    })

    // Reorder to start from Monday
    weeklyData.value = [
      dailyCounts[1], // Monday
      dailyCounts[2], // Tuesday
      dailyCounts[3], // Wednesday
      dailyCounts[4], // Thursday
      dailyCounts[5], // Friday
      dailyCounts[6], // Saturday
      dailyCounts[0], // Sunday
    ]

    // Calculate growth percentage
    const twoWeeksAgo = new Date(sevenDaysAgo)
    twoWeeksAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: lastWeekCount } = await supabase
      .from('property')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    const { count: previousWeekCount } = await supabase
      .from('property')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())

    if (previousWeekCount && previousWeekCount > 0) {
      growthPercentage.value = Number((((lastWeekCount || 0) - previousWeekCount) / previousWeekCount * 100).toFixed(1))
    } else {
      growthPercentage.value = lastWeekCount ? 100 : 0
    }
  } catch (error) {
    console.error('Error fetching properties data:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchPropertiesData()
})

// Ensure chart has valid data (prevent errors with all-zero arrays)
const chartData = computed(() => {
  const hasData = weeklyData.value.some(v => v > 0)

  return hasData ? weeklyData.value : weeklyData.value.map(() => 0.1)
})

const series = computed(() => [
  {
    name: 'Properties',
    data: chartData.value,
  },
])

const chartOptions = computed(() => ({
  chart: {
    type: 'area',
    parentHeightOffset: 0,
    toolbar: {
      show: false,
    },
    sparkline: {
      enabled: true,
    },
  },
  markers: {
    colors: 'transparent',
    strokeColors: 'transparent',
  },
  grid: {
    show: false,
  },
  colors: [currentTheme.success],
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 0.9,
      opacityFrom: 0.5,
      opacityTo: 0.07,
      stops: [0, 80, 100],
    },
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    width: 2,
    curve: 'smooth',
  },
  xaxis: {
    show: true,
    lines: {
      show: false,
    },
    labels: {
      show: false,
    },
    stroke: {
      width: 0,
    },
    axisBorder: {
      show: false,
    },
  },
  yaxis: {
    stroke: {
      width: 0,
    },
    show: false,
  },
  tooltip: {
    enabled: false,
  },
}))
</script>

<template>
  <VCard>
    <VCardItem class="pb-3">
      <template #prepend>
        <VAvatar
          color="success"
          variant="tonal"
          rounded
          size="44"
        >
          <VIcon
            icon="tabler-home"
            size="28"
          />
        </VAvatar>
      </template>

      <VCardTitle>Total Properties</VCardTitle>
      <VCardSubtitle>Last Week</VCardSubtitle>

      <template #append>
        <IconBtn
          :to="{ name: 'apps-property-list' }"
          color="success"
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
            View Properties
          </VTooltip>
        </IconBtn>
      </template>
    </VCardItem>

    <VueApexCharts
      v-if="!isLoading"
      :options="chartOptions"
      :series="series"
      :height="68"
    />

    <VCardText class="pt-1">
      <div class="d-flex align-center justify-space-between gap-x-2">
        <h4 class="text-h4 text-center">
          {{ totalProperties }}
        </h4>
        <span
          class="text-sm"
          :class="growthPercentage >= 0 ? 'text-success' : 'text-error'"
        >
          {{ growthPercentage >= 0 ? '+' : '' }}{{ growthPercentage }}%
        </span>
      </div>

    </VCardText>
  </VCard>
</template>
