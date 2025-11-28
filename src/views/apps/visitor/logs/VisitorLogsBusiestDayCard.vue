<script setup lang="ts">
import { supabase } from '@/lib/supabase'

const { t } = useI18n({ useScope: 'global' })

// Props
interface Props {
  communityFilter?: string
  timeRange?: number // 0 = all time, otherwise days
}

const props = withDefaults(defineProps<Props>(), {
  timeRange: 90,
})

// User data for permission checks
const userData = useCookie<any>('userData')

// Get user scope for filtering
const userScope = computed(() => userData.value?.scope || {})
const isSuperAdmin = computed(() => userData.value?.role === 'Super Admin' || userScope.value.scopeType === 'global')
const isResident = computed(() => userData.value?.role === 'Resident')

// Data state
const isLoading = ref(true)
const entriesByDay = ref<number[]>(Array(7).fill(0))

// Day names (computed for translation)
const dayNames = computed(() => [
  t('common.sunday'),
  t('common.monday'),
  t('common.tuesday'),
  t('common.wednesday'),
  t('common.thursday'),
  t('common.friday'),
  t('common.saturday'),
])

// Find busiest day
const busiestDay = computed(() => {
  const max = Math.max(...entriesByDay.value)
  if (max === 0) return { day: -1, count: 0 }

  const dayIndex = entriesByDay.value.indexOf(max)
  return { day: dayIndex, count: max }
})

// Get day name
const dayName = computed(() => {
  if (busiestDay.value.day < 0) return t('visitorLogs.noData')
  return dayNames.value[busiestDay.value.day]
})

// Fetch data
const fetchDayData = async () => {
  try {
    isLoading.value = true

    // Build query
    let query = supabase
      .from('visitor_record_logs')
      .select('in_time, record_uid')
      .not('in_time', 'is', null)

    // Apply time range filter (0 = all time)
    if (props.timeRange && props.timeRange > 0) {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - props.timeRange)
      query = query.gte('in_time', startDate.toISOString())
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Error fetching day data:', error)
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

    // Process data by day of week
    const days = Array(7).fill(0)

    filteredLogs.forEach(log => {
      if (log.in_time) {
        const dayIndex = new Date(log.in_time).getDay()
        days[dayIndex]++
      }
    })

    entriesByDay.value = days
  } catch (err) {
    console.error('Error in fetchDayData:', err)
  } finally {
    isLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  fetchDayData()
})

// Watch for filter changes
watch([() => props.communityFilter, () => props.timeRange], () => {
  fetchDayData()
})

// Expose refresh method
defineExpose({
  refresh: fetchDayData,
})
</script>

<template>
  <VCard class="h-100">
    <VCardText class="d-flex flex-column align-center justify-center pa-6">
      <div
        v-if="isLoading"
        class="d-flex justify-center align-center"
        style="height: 120px;"
      >
        <VProgressCircular
          indeterminate
          color="primary"
          size="40"
        />
      </div>
      <template v-else>
        <VAvatar
          color="primary"
          variant="tonal"
          rounded
          size="48"
          class="mb-3"
        >
          <VIcon
            icon="tabler-calendar-stats"
            size="28"
          />
        </VAvatar>

        <h6 class="text-h6 mb-1">
          {{ t('visitorLogs.busiestDay') }}
        </h6>

        <div class="text-h5 font-weight-bold text-primary mb-1">
          {{ dayName }}
        </div>

        <div
          v-if="busiestDay.count > 0"
          class="d-flex align-center gap-2"
        >
          <VChip
            size="small"
            color="primary"
            variant="tonal"
          >
            {{ busiestDay.count }} {{ t('visitorLogs.entries').toLowerCase() }}
          </VChip>
          <span class="text-body-2 text-disabled">
            {{ t('visitorLogs.total') }}
          </span>
        </div>
        <span
          v-else
          class="text-body-2 text-disabled"
        >
          {{ t('visitorLogs.noEntriesFound') }}
        </span>

      </template>
    </VCardText>

    <!-- Link icon in top right -->
    <IconBtn
      :to="{ name: 'apps-visitor-logs' }"
      color="primary"
      variant="text"
      class="position-absolute"
      style="top: 8px; right: 8px;"
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
  </VCard>
</template>
