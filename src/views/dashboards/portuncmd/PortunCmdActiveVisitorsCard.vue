<script setup lang="ts">
import { useTheme } from 'vuetify'
import { supabase } from '@/lib/supabase'

const { t } = useI18n({ useScope: 'global' })
const vuetifyTheme = useTheme()
const currentTheme = vuetifyTheme.current.value.colors

// User data for scoping
const userData = useCookie<any>('userData')
const userScope = computed(() => userData.value?.scope || {})
const isSuperAdmin = computed(() => userData.value?.role === 'Super Admin' || userScope.value.scopeType === 'global')

const totalActiveVisitors = ref(0)
const growthPercentage = ref(0)
const weeklyData = ref<number[]>([0, 0, 0, 0, 0, 0, 0])
const isLoading = ref(true)

// Helper to determine if a visitor pass is active
const isActivePass = (visitor: any) => {
  const now = new Date()
  const validityEnd = new Date(visitor.validity_end)
  const entriesUsed = visitor.entries_used || 0
  const entriesAllowed = visitor.entries_allowed || 1

  // Check if entries are exhausted (unless unlimited)
  if (entriesUsed >= entriesAllowed && entriesAllowed !== 9999) {
    return false
  }
  // Check if expired
  if (validityEnd < now) {
    return false
  }
  return true
}

// Fetch active visitors data
const fetchVisitorsData = async () => {
  try {
    // Build query with scope filtering
    let query = supabase
      .from('visitor_records_uid')
      .select('validity_end, entries_used, entries_allowed, created_at, community_id, property_id')

    // Apply role-based scoping
    if (!isSuperAdmin.value) {
      const scope = userScope.value

      if (scope.scopeType === 'property' && scope.scopePropertyIds?.length > 0) {
        query = query.in('property_id', scope.scopePropertyIds)
      }
      else if (scope.scopeType === 'community' && scope.scopeCommunityIds?.length > 0) {
        query = query.in('community_id', scope.scopeCommunityIds)
      }
      else if (userData.value?.role === 'Resident' && userData.value?.id) {
        query = query.eq('host_uid', userData.value.id)
      }
    }

    const { data: allVisitors } = await query

    // Count active visitors
    const activeCount = (allVisitors || []).filter(isActivePass).length
    totalActiveVisitors.value = activeCount

    // Get last 7 days of data for the chart
    const today = new Date()
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(today.getDate() - 7)

    // Build query for recent visitors
    let recentQuery = supabase
      .from('visitor_records_uid')
      .select('created_at, community_id, property_id')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Apply role-based scoping
    if (!isSuperAdmin.value) {
      const scope = userScope.value

      if (scope.scopeType === 'property' && scope.scopePropertyIds?.length > 0) {
        recentQuery = recentQuery.in('property_id', scope.scopePropertyIds)
      }
      else if (scope.scopeType === 'community' && scope.scopeCommunityIds?.length > 0) {
        recentQuery = recentQuery.in('community_id', scope.scopeCommunityIds)
      }
      else if (userData.value?.role === 'Resident' && userData.value?.id) {
        recentQuery = recentQuery.eq('host_uid', userData.value.id)
      }
    }

    const { data: recentVisitors } = await recentQuery

    // Group by day of week (Sun=0 to Sat=6)
    const dailyCounts = [0, 0, 0, 0, 0, 0, 0]
    recentVisitors?.forEach(visitor => {
      const date = new Date(visitor.created_at)
      const dayIndex = date.getDay()
      dailyCounts[dayIndex]++
    })

    // Reorder to start from Sunday for display (S M T W T F S)
    weeklyData.value = dailyCounts

    // Calculate growth percentage (this week vs last week)
    const twoWeeksAgo = new Date(sevenDaysAgo)
    twoWeeksAgo.setDate(sevenDaysAgo.getDate() - 7)

    let lastWeekQuery = supabase
      .from('visitor_records_uid')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    let previousWeekQuery = supabase
      .from('visitor_records_uid')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', sevenDaysAgo.toISOString())

    // Apply scoping to both queries
    if (!isSuperAdmin.value) {
      const scope = userScope.value

      if (scope.scopeType === 'property' && scope.scopePropertyIds?.length > 0) {
        lastWeekQuery = lastWeekQuery.in('property_id', scope.scopePropertyIds)
        previousWeekQuery = previousWeekQuery.in('property_id', scope.scopePropertyIds)
      }
      else if (scope.scopeType === 'community' && scope.scopeCommunityIds?.length > 0) {
        lastWeekQuery = lastWeekQuery.in('community_id', scope.scopeCommunityIds)
        previousWeekQuery = previousWeekQuery.in('community_id', scope.scopeCommunityIds)
      }
      else if (userData.value?.role === 'Resident' && userData.value?.id) {
        lastWeekQuery = lastWeekQuery.eq('host_uid', userData.value.id)
        previousWeekQuery = previousWeekQuery.eq('host_uid', userData.value.id)
      }
    }

    const { count: lastWeekCount } = await lastWeekQuery
    const { count: previousWeekCount } = await previousWeekQuery

    if (previousWeekCount && previousWeekCount > 0) {
      growthPercentage.value = Number((((lastWeekCount || 0) - previousWeekCount) / previousWeekCount * 100).toFixed(1))
    } else {
      growthPercentage.value = lastWeekCount ? 100 : 0
    }
  } catch (error) {
    console.error('Error fetching visitors data:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchVisitorsData()
})

// Ensure chart has valid data (prevent errors with all-zero arrays)
const chartData = computed(() => {
  const hasData = weeklyData.value.some(v => v > 0)

  return hasData ? weeklyData.value : weeklyData.value.map(() => 0.1)
})

const series = computed(() => [
  {
    name: 'Visitor Passes',
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
  colors: [currentTheme.warning],
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
          color="warning"
          variant="tonal"
          rounded
          size="44"
        >
          <VIcon
            icon="tabler-ticket"
            size="28"
          />
        </VAvatar>
      </template>

      <VCardTitle>{{ t('dashboard.activeVisitors') }}</VCardTitle>
      <VCardSubtitle>{{ t('dashboard.lastWeek') }}</VCardSubtitle>

      <template #append>
        <IconBtn
          :to="{ name: 'apps-visitor-list' }"
          color="warning"
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
            {{ t('dashboard.viewVisitors') }}
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
          {{ totalActiveVisitors }}
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
