<script setup lang="ts">
// Props
interface Props {
  entriesByHour: number[]
  isLoading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
})

// Find peak hour
const peakHour = computed(() => {
  const max = Math.max(...props.entriesByHour)
  if (max === 0) return { hour: -1, count: 0 }

  const hourIndex = props.entriesByHour.indexOf(max)
  return { hour: hourIndex, count: max }
})

// Format hour as time range (e.g., "2:00 PM - 3:00 PM")
const formatHourRange = (hour: number) => {
  if (hour < 0) return 'No data'

  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM'
    const hour12 = h % 12 || 12
    return `${hour12}:00 ${period}`
  }

  const start = formatHour(hour)
  const end = formatHour((hour + 1) % 24)
  return `${start} - ${end}`
}

// Get a simple indicator of which period of day
const periodLabel = computed(() => {
  const hour = peakHour.value.hour
  if (hour < 0) return ''
  if (hour >= 5 && hour < 12) return 'Morning'
  if (hour >= 12 && hour < 17) return 'Afternoon'
  if (hour >= 17 && hour < 21) return 'Evening'
  return 'Night'
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
          color="warning"
          size="40"
        />
      </div>
      <template v-else>
        <VAvatar
          color="warning"
          variant="tonal"
          rounded
          size="48"
          class="mb-3"
        >
          <VIcon
            icon="tabler-clock-hour-3"
            size="28"
          />
        </VAvatar>

        <h6 class="text-h6 mb-1">
          Peak Hour
        </h6>

        <div class="text-h5 font-weight-bold text-warning mb-1">
          {{ formatHourRange(peakHour.hour) }}
        </div>

        <div
          v-if="peakHour.count > 0"
          class="d-flex align-center gap-2"
        >
          <VChip
            size="small"
            color="warning"
            variant="tonal"
          >
            {{ peakHour.count }} entries
          </VChip>
          <span
            v-if="periodLabel"
            class="text-body-2 text-disabled"
          >
            {{ periodLabel }}
          </span>
        </div>
        <span
          v-else
          class="text-body-2 text-disabled"
        >
          No entries found
        </span>

      </template>
    </VCardText>

    <!-- Link icon in top right -->
    <IconBtn
      :to="{ name: 'apps-visitor-logs' }"
      color="warning"
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
        View Access Logs
      </VTooltip>
    </IconBtn>
  </VCard>
</template>
