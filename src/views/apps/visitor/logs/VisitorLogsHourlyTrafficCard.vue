<script setup lang="ts">
import { supabase } from '@/lib/supabase'

const { t } = useI18n({ useScope: 'global' })

// Props
interface Props {
  communityFilter?: string
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  dataLoaded: [data: { entries: number[], exits: number[], isLoading: boolean, timeRange: number }]
}>()

// Time range options
const timeRangeOptions = computed(() => [
  { title: t('visitorLogs.last7Days'), value: 7 },
  { title: t('visitorLogs.last30Days'), value: 30 },
  { title: t('visitorLogs.last90Days'), value: 90 },
  { title: t('visitorLogs.last6Months'), value: 180 },
  { title: t('visitorLogs.lastYear'), value: 365 },
  { title: t('visitorLogs.allTime'), value: 0 },
])

const selectedTimeRange = ref(90) // Default to 90 days

// Computed label for selected time range
const selectedTimeRangeLabel = computed(() => {
  const option = timeRangeOptions.value.find(o => o.value === selectedTimeRange.value)
  return option?.title || t('visitorLogs.last30Days')
})

// User data for permission checks
const userData = useCookie<any>('userData')

// Get user scope for filtering
const userScope = computed(() => userData.value?.scope || {})
const isSuperAdmin = computed(() => userData.value?.role === 'Super Admin' || userScope.value.scopeType === 'global')
const isResident = computed(() => userData.value?.role === 'Resident')

// Chart colors
const chartColors = {
  entries: '#FFB400', // Orange/Warning for entries
  exits: '#9055FD', // Purple for exits
}

const headingColor = 'rgba(var(--v-theme-on-background), var(--v-high-emphasis-opacity))'
const labelColor = 'rgba(var(--v-theme-on-background), var(--v-medium-emphasis-opacity))'
const borderColor = 'rgba(var(--v-border-color), var(--v-border-opacity))'

// Data state
const isLoading = ref(true)
const entriesByHour = ref<number[]>(Array(24).fill(0))
const exitsByHour = ref<number[]>(Array(24).fill(0))
const totalEntries = ref(0)
const totalExits = ref(0)

// Computed chart series
const series = computed(() => [
  {
    name: t('visitorLogs.entries'),
    type: 'column',
    data: entriesByHour.value,
  },
  {
    name: t('visitorLogs.exits'),
    type: 'line',
    data: exitsByHour.value,
  },
])

// Hour labels for x-axis (12-hour format)
const hourLabels = [
  '12am', '1am', '2am', '3am', '4am', '5am',
  '6am', '7am', '8am', '9am', '10am', '11am',
  '12pm', '1pm', '2pm', '3pm', '4pm', '5pm',
  '6pm', '7pm', '8pm', '9pm', '10pm', '11pm',
]

// Compute dynamic Y-axis max
const yAxisMax = computed(() => {
  const maxEntry = Math.max(...entriesByHour.value)
  const maxExit = Math.max(...exitsByHour.value)
  const max = Math.max(maxEntry, maxExit, 10)
  // Round up to a nice number
  if (max <= 10) return 10
  if (max <= 25) return 25
  if (max <= 50) return 50
  if (max <= 100) return 100
  return Math.ceil(max / 50) * 50
})

// Chart configuration
const chartConfig = computed(() => ({
  chart: {
    type: 'line',
    stacked: false,
    parentHeightOffset: 0,
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
  },
  markers: {
    size: 5,
    colors: '#fff',
    strokeColors: chartColors.exits,
    hover: {
      size: 6,
    },
    borderRadius: 4,
  },
  stroke: {
    curve: ['smooth', 'monotoneCubic'],
    width: [0, 3],
    lineCap: 'round',
  },
  legend: {
    show: true,
    position: 'bottom',
    markers: {
      width: 8,
      height: 8,
      offsetX: -3,
    },
    height: 40,
    itemMargin: {
      horizontal: 10,
      vertical: 0,
    },
    fontSize: '15px',
    fontFamily: 'Open Sans',
    fontWeight: 400,
    labels: {
      colors: headingColor,
      useSeriesColors: false,
    },
    offsetY: 10,
  },
  grid: {
    strokeDashArray: 8,
    borderColor,
  },
  colors: [chartColors.entries, chartColors.exits],
  fill: {
    opacity: [1, 1],
  },
  plotOptions: {
    bar: {
      columnWidth: '30%',
      borderRadius: 4,
      borderRadiusApplication: 'end',
    },
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    tickAmount: 24,
    categories: hourLabels,
    labels: {
      style: {
        colors: labelColor,
        fontSize: '11px',
        fontWeight: 400,
      },
      rotate: -45,
      rotateAlways: false,
    },
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
  },
  yaxis: {
    tickAmount: 4,
    min: 0,
    max: yAxisMax.value,
    labels: {
      style: {
        colors: labelColor,
        fontSize: '13px',
        fontWeight: 400,
      },
      formatter(val: number) {
        return Math.round(val).toString()
      },
    },
  },
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter(val: number) {
        return val.toString()
      },
    },
  },
  responsive: [
    {
      breakpoint: 1400,
      options: {
        chart: {
          height: 280,
        },
        xaxis: {
          labels: {
            style: {
              fontSize: '9px',
            },
          },
        },
        legend: {
          itemMargin: {
            vertical: 0,
            horizontal: 10,
          },
          fontSize: '13px',
          offsetY: 12,
        },
      },
    },
    {
      breakpoint: 1025,
      options: {
        chart: {
          height: 350,
        },
        plotOptions: {
          bar: {
            columnWidth: '50%',
          },
        },
      },
    },
    {
      breakpoint: 768,
      options: {
        chart: {
          height: 300,
        },
        xaxis: {
          labels: {
            rotate: -90,
            style: {
              fontSize: '8px',
            },
          },
        },
      },
    },
    {
      breakpoint: 480,
      options: {
        chart: {
          height: 250,
        },
        legend: {
          offsetY: 7,
        },
      },
    },
  ],
}))

// Fetch hourly data
const fetchHourlyData = async () => {
  try {
    isLoading.value = true

    // Build query
    let query = supabase
      .from('visitor_record_logs')
      .select('in_time, out_time, record_uid')
      .not('in_time', 'is', null)

    // Apply time range filter (0 = all time)
    if (selectedTimeRange.value > 0) {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - selectedTimeRange.value)
      query = query.gte('in_time', startDate.toISOString())
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching hourly data:', error)
      return
    }

    // If not super admin, we need to filter by scope
    let filteredLogs = logs || []

    if (!isSuperAdmin.value && filteredLogs.length > 0) {
      // Get unique record_uids
      const recordUids = [...new Set(filteredLogs.map(log => log.record_uid).filter(Boolean))]

      if (recordUids.length > 0) {
        // Fetch visitor records to get community/property info
        const { data: visitorRecords } = await supabase
          .from('visitor_records_uid')
          .select('record_uid, community_id, property_id, host_uid')
          .in('record_uid', recordUids)

        if (visitorRecords) {
          const recordMap = visitorRecords.reduce((acc, vr) => {
            if (vr.record_uid) acc[vr.record_uid] = vr
            return acc
          }, {} as Record<string, any>)

          const scope = userScope.value

          filteredLogs = filteredLogs.filter(log => {
            const vr = recordMap[log.record_uid]
            if (!vr) return false

            if (scope.scopeType === 'property' && scope.scopePropertyIds?.length > 0) {
              return scope.scopePropertyIds.includes(vr.property_id)
            } else if (scope.scopeType === 'community' && scope.scopeCommunityIds?.length > 0) {
              return scope.scopeCommunityIds.includes(vr.community_id)
            } else if (isResident.value && userData.value?.id) {
              return vr.host_uid === userData.value.id
            }

            return true
          })
        }
      }
    }

    // Apply community filter if provided
    if (props.communityFilter && filteredLogs.length > 0) {
      const recordUids = [...new Set(filteredLogs.map(log => log.record_uid).filter(Boolean))]

      if (recordUids.length > 0) {
        const { data: visitorRecords } = await supabase
          .from('visitor_records_uid')
          .select('record_uid, community_id')
          .in('record_uid', recordUids)
          .eq('community_id', props.communityFilter)

        if (visitorRecords) {
          const validUids = new Set(visitorRecords.map(vr => vr.record_uid))
          filteredLogs = filteredLogs.filter(log => validUids.has(log.record_uid))
        }
      }
    }

    // Process data by hour
    const entries = Array(24).fill(0)
    const exits = Array(24).fill(0)

    filteredLogs.forEach(log => {
      if (log.in_time) {
        const hour = new Date(log.in_time).getHours()
        entries[hour]++
      }
      if (log.out_time) {
        const hour = new Date(log.out_time).getHours()
        exits[hour]++
      }
    })

    entriesByHour.value = entries
    exitsByHour.value = exits
    totalEntries.value = entries.reduce((a, b) => a + b, 0)
    totalExits.value = exits.reduce((a, b) => a + b, 0)

    // Emit data for parent components
    emit('dataLoaded', { entries, exits, isLoading: false, timeRange: selectedTimeRange.value })
  } catch (err) {
    console.error('Error in fetchHourlyData:', err)
  } finally {
    isLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchHourlyData()
})

// Watch for filter changes
watch([() => props.communityFilter, selectedTimeRange], () => {
  fetchHourlyData()
})

// Expose refresh method
defineExpose({
  refresh: fetchHourlyData,
})
</script>

<template>
  <VCard>
    <VCardItem>
      <template #prepend>
        <div>
          <VCardTitle>{{ t('visitorLogs.hourlyTraffic') }}</VCardTitle>
          <VCardSubtitle>{{ t('visitorLogs.entryExitPatterns') }}</VCardSubtitle>
        </div>
      </template>

      <template #append>
        <div class="d-flex align-center gap-2">
          <VChip
            size="small"
            color="default"
            variant="tonal"
          >
            {{ totalEntries.toLocaleString() }} {{ t('visitorLogs.entries').toLowerCase() }}
          </VChip>
          <VMenu>
            <template #activator="{ props: menuProps }">
              <VBtn
                v-bind="menuProps"
                variant="tonal"
                size="small"
                append-icon="tabler-chevron-down"
              >
                {{ selectedTimeRangeLabel }}
              </VBtn>
            </template>
            <VList density="compact">
              <VListItem
                v-for="option in timeRangeOptions"
                :key="option.value"
                :active="selectedTimeRange === option.value"
                @click="selectedTimeRange = option.value"
              >
                <VListItemTitle>{{ option.title }}</VListItemTitle>
              </VListItem>
            </VList>
          </VMenu>
          <IconBtn
            :to="{ name: 'apps-visitor-logs' }"
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
              {{ t('visitorLogs.viewAccessLogs') }}
            </VTooltip>
          </IconBtn>
        </div>
      </template>
    </VCardItem>

    <VCardText>
      <div
        v-if="isLoading"
        class="d-flex justify-center align-center"
        style="height: 280px;"
      >
        <VProgressCircular
          indeterminate
          color="primary"
        />
      </div>
      <VueApexCharts
        v-else
        id="hourly-traffic-chart"
        type="line"
        height="280"
        :options="chartConfig"
        :series="series"
      />
    </VCardText>

  </VCard>
</template>

<style lang="scss">
@use "@core/scss/template/libs/apex-chart.scss";

#hourly-traffic-chart {
  .apexcharts-legend-text {
    font-size: 14px !important;
  }

  .apexcharts-legend-series {
    border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    border-radius: 0.375rem;
    block-size: 83%;
    padding-block: 4px;
    padding-inline: 12px 10px;
  }
}
</style>
