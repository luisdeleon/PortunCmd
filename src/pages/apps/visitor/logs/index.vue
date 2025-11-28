<script setup lang="ts">
import { supabase } from '@/lib/supabase'

const { t } = useI18n({ useScope: 'global' })

definePage({
  meta: {
    public: false,
    navActiveLink: 'apps-visitor-logs',
  },
})

// User data for permission checks
const userData = useCookie<any>('userData')

// Get user scope for filtering
const userScope = computed(() => userData.value?.scope || {})
const isSuperAdmin = computed(() => userData.value?.role === 'Super Admin' || userScope.value.scopeType === 'global')
const isResident = computed(() => userData.value?.role === 'Resident')

// Data state
const logs = ref<any[]>([])
const groupedLogs = ref<any[]>([])
const totalLogs = ref(0)
const isLoading = ref(false)

// Expanded rows state (only one at a time)
const expandedRows = ref<string[]>([])

// Filters
const searchQuery = ref('')
const selectedCommunity = ref()
const selectedDateRange = ref()

// Pagination
const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()

// Communities for filter
const communities = ref<{ title: string; value: string }[]>([])

// Dialog state
const isViewDialogVisible = ref(false)
const selectedLog = ref<any>(null)
const isImageDialogVisible = ref(false)

// Image gallery state
const currentImageUrls = ref<string[]>([])
const currentImageIndex = ref(0)
const currentImageLog = ref<any>(null)
const selectedImageUrl = computed(() => currentImageUrls.value[currentImageIndex.value] || '')
const currentImageTimestamp = computed(() => currentImageLog.value?.in_time || null)

// Stats
const totalEntries = ref(0)
const todayEntries = ref(0)
const weeklyEntries = ref(0)
const withPhotos = ref(0)

// Headers
const headers = computed(() => [
  { title: t('visitorLogs.table.visitor'), key: 'visitor' },
  { title: t('visitorLogs.table.lastEntry'), key: 'in_time' },
  { title: t('visitorLogs.table.exit'), key: 'out_time' },
  { title: t('visitorLogs.table.host'), key: 'host' },
  { title: t('visitorLogs.table.community'), key: 'community' },
  { title: t('visitorLogs.table.entries'), key: 'entries', sortable: false },
  { title: t('visitorLogs.table.evidence'), key: 'evidence', sortable: false },
  { title: t('visitorLogs.table.actions'), key: 'actions', sortable: false },
  { title: '', key: 'data-table-expand' },
])

// Update options from data table
const updateOptions = (options: any) => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

// Fetch logs
const fetchLogs = async () => {
  try {
    isLoading.value = true

    // Fetch ALL logs to group by record_uid (no pagination at DB level)
    let query = supabase
      .from('visitor_record_logs')
      .select('*')

    // Apply search filter
    if (searchQuery.value) {
      query = query.or(`visitor_name.ilike.%${searchQuery.value}%,record_uid.ilike.%${searchQuery.value}%`)
    }

    // Always order by newest first for grouping
    query = query.order('in_time', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching logs:', error)
      return
    }

    // Get unique record_uids to fetch visitor records (which has foreign keys)
    const recordUids = [...new Set((data || []).map(log => log.record_uid).filter(Boolean))]

    // Fetch visitor records to get community/property/host info
    let visitorRecordsMap: Record<string, any> = {}
    if (recordUids.length > 0) {
      const { data: visitorRecords, error: vrError } = await supabase
        .from('visitor_records_uid')
        .select(`
          record_uid,
          community_id,
          property_id,
          visitor_type,
          host_uid,
          community:community_id(id, name),
          property:property_id(id, name),
          host:host_uid(id, display_name, email)
        `)
        .in('record_uid', recordUids)

      if (!vrError && visitorRecords) {
        visitorRecordsMap = visitorRecords.reduce((acc, vr) => {
          acc[vr.record_uid] = vr
          return acc
        }, {} as Record<string, any>)
      }
    }

    // Transform and filter data based on user scope
    let transformedData = (data || []).map(log => {
      const visitorRecord = visitorRecordsMap[log.record_uid] || {}
      return {
        ...log,
        community_id: visitorRecord.community_id,
        property_id: visitorRecord.property_id,
        visitor_type: visitorRecord.visitor_type,
        community: visitorRecord.community,
        property: visitorRecord.property,
        host: visitorRecord.host,
        hasEvidence: !!(log.doc1_upload_url || log.doc2_upload_url || log.doc3_upload_url || log.doc4_upload_url),
        evidenceCount: [log.doc1_upload_url, log.doc2_upload_url, log.doc3_upload_url, log.doc4_upload_url].filter(Boolean).length,
      }
    })

    // Apply role-based filtering client-side
    if (!isSuperAdmin.value) {
      const scope = userScope.value

      if (scope.scopeType === 'property' && scope.scopePropertyIds?.length > 0) {
        transformedData = transformedData.filter(log =>
          scope.scopePropertyIds.includes(log.property_id)
        )
      } else if (scope.scopeType === 'community' && scope.scopeCommunityIds?.length > 0) {
        transformedData = transformedData.filter(log =>
          scope.scopeCommunityIds.includes(log.community_id)
        )
      } else if (isResident.value && userData.value?.id) {
        transformedData = transformedData.filter(log =>
          log.host_uid === userData.value.id
        )
      }
    }

    // Apply community filter
    if (selectedCommunity.value) {
      transformedData = transformedData.filter(log =>
        log.community_id === selectedCommunity.value
      )
    }

    logs.value = transformedData

    // Group logs by record_uid, showing latest entry first with previous entries nested
    const grouped = transformedData.reduce((acc, log) => {
      const key = log.record_uid
      if (!acc[key]) {
        acc[key] = {
          ...log,
          allEntries: [log],
          previousEntries: [],
        }
      } else {
        // Check if this log is newer than the current latest
        const currentLatest = new Date(acc[key].in_time).getTime()
        const thisTime = new Date(log.in_time).getTime()

        if (thisTime > currentLatest) {
          // This is newer, move current to previousEntries
          acc[key].previousEntries.unshift({ ...acc[key] })
          // Update with new latest
          Object.assign(acc[key], log)
          acc[key].allEntries.unshift(log)
        } else {
          // This is older, add to previousEntries
          acc[key].previousEntries.push(log)
          acc[key].allEntries.push(log)
        }
      }
      return acc
    }, {} as Record<string, any>)

    // Convert to array and sort by latest entry time
    groupedLogs.value = Object.values(grouped)
      .map(g => ({
        ...g,
        totalEntries: g.allEntries.length,
        previousEntries: g.previousEntries.sort((a: any, b: any) =>
          new Date(b.in_time).getTime() - new Date(a.in_time).getTime()
        ),
      }))
      .sort((a, b) => new Date(b.in_time).getTime() - new Date(a.in_time).getTime())

    totalLogs.value = groupedLogs.value.length

    // Compute stats from filtered data
    computeStats()
  } catch (err) {
    console.error('Error in fetchLogs:', err)
  } finally {
    isLoading.value = false
  }
}

// Fetch communities for filter
const fetchCommunities = async () => {
  try {
    let query = supabase
      .from('community')
      .select('id, name')
      .order('name')

    // Apply role-based scoping
    if (!isSuperAdmin.value) {
      const scope = userScope.value

      if (scope.scopeCommunityIds?.length > 0) {
        query = query.in('id', scope.scopeCommunityIds)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching communities:', error)
      return
    }

    communities.value = (data || []).map(c => ({
      title: c.name || c.id,
      value: c.id,
    }))
  } catch (err) {
    console.error('Error in fetchCommunities:', err)
  }
}

// Compute stats from filtered logs data (respects role-based scoping)
const computeStats = () => {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)

  const filteredData = logs.value

  totalEntries.value = filteredData.length
  todayEntries.value = filteredData.filter(log => new Date(log.in_time) >= todayStart).length
  weeklyEntries.value = filteredData.filter(log => new Date(log.in_time) >= weekStart).length
  withPhotos.value = filteredData.filter(log => log.hasEvidence).length
}

// View log details
const viewLog = (log: any) => {
  selectedLog.value = log
  isViewDialogVisible.value = true
}

// View image in full size with gallery support
const viewImage = (url: string, allUrls?: string[], log?: any) => {
  if (allUrls && allUrls.length > 0) {
    currentImageUrls.value = allUrls
    currentImageIndex.value = allUrls.indexOf(url)
    if (currentImageIndex.value === -1) currentImageIndex.value = 0
  } else {
    currentImageUrls.value = [url]
    currentImageIndex.value = 0
  }
  currentImageLog.value = log || null
  isImageDialogVisible.value = true
}

// Download current image
const downloadImage = async () => {
  if (!selectedImageUrl.value) return

  try {
    const response = await fetch(selectedImageUrl.value)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const timestamp = currentImageTimestamp.value ? new Date(currentImageTimestamp.value).toISOString().slice(0, 19).replace(/[T:]/g, '-') : 'evidence'
    link.download = `visitor-evidence-${timestamp}-${currentImageIndex.value + 1}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Error downloading image:', err)
  }
}

// Prevent right-click on images
const preventContextMenu = (e: Event) => {
  e.preventDefault()
}

// Navigate to previous image
const prevImage = () => {
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--
  }
}

// Navigate to next image
const nextImage = () => {
  if (currentImageIndex.value < currentImageUrls.value.length - 1) {
    currentImageIndex.value++
  }
}

// Check if navigation is possible
const hasPrevImage = computed(() => currentImageIndex.value > 0)
const hasNextImage = computed(() => currentImageIndex.value < currentImageUrls.value.length - 1)
const hasMultipleImages = computed(() => currentImageUrls.value.length > 1)

// Toggle row expansion (only one at a time)
const toggleRowExpansion = (recordUid: string) => {
  if (expandedRows.value.includes(recordUid)) {
    expandedRows.value = []
  } else {
    expandedRows.value = [recordUid]
  }
}

// Format date/time
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format duration
const formatDuration = (inTime: string, outTime: string) => {
  if (!inTime || !outTime) return 'N/A'
  const diff = new Date(outTime).getTime() - new Date(inTime).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

// Get evidence URLs as array
const getEvidenceUrls = (log: any) => {
  return [log.doc1_upload_url, log.doc2_upload_url, log.doc3_upload_url, log.doc4_upload_url].filter(Boolean)
}

// Lifecycle
onMounted(() => {
  fetchLogs()
  fetchCommunities()
})

// Watch for filter changes
watch([searchQuery, selectedCommunity, page, itemsPerPage, sortBy, orderBy], () => {
  fetchLogs()
})

// Widget data
const widgetData = computed(() => [
  {
    title: t('visitorLogs.widgets.today'),
    value: todayEntries.value.toLocaleString(),
    icon: 'tabler-calendar-check',
    iconColor: 'success',
  },
  {
    title: t('visitorLogs.widgets.thisWeek'),
    value: weeklyEntries.value.toLocaleString(),
    icon: 'tabler-calendar-week',
    iconColor: 'warning',
  },
  {
    title: t('visitorLogs.widgets.totalEntries'),
    value: totalEntries.value.toLocaleString(),
    icon: 'tabler-login',
    iconColor: 'primary',
  },
  {
    title: t('visitorLogs.widgets.withPhotos'),
    value: withPhotos.value.toLocaleString(),
    icon: 'tabler-photo',
    iconColor: 'info',
  },
])
</script>

<template>
  <section>
    <!-- Widgets -->
    <div class="d-flex mb-6">
      <VRow>
        <template
          v-for="(data, id) in widgetData"
          :key="id"
        >
          <VCol
            cols="12"
            md="3"
            sm="6"
          >
            <VCard>
              <VCardText>
                <div class="d-flex justify-space-between">
                  <div class="d-flex flex-column gap-y-1">
                    <div class="text-body-1 text-high-emphasis">
                      {{ data.title }}
                    </div>
                    <h4 class="text-h4">
                      {{ data.value }}
                    </h4>
                  </div>
                  <VAvatar
                    :color="data.iconColor"
                    variant="tonal"
                    rounded
                    size="42"
                  >
                    <VIcon
                      :icon="data.icon"
                      size="26"
                    />
                  </VAvatar>
                </div>
              </VCardText>
            </VCard>
          </VCol>
        </template>
      </VRow>
    </div>

    <!-- Filters Card -->
    <VCard class="mb-6">
      <VCardItem class="pb-4">
        <VCardTitle>{{ t('visitorLogs.title') }}</VCardTitle>
      </VCardItem>

      <VCardText>
        <VRow>
          <!-- Filter by Community -->
          <VCol
            cols="12"
            sm="6"
          >
            <AppAutocomplete
              v-model="selectedCommunity"
              :placeholder="t('visitorLogs.filters.filterByCommunity')"
              :items="communities"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
          <!-- Search -->
          <VCol
            cols="12"
            sm="6"
          >
            <AppTextField
              v-model="searchQuery"
              :placeholder="t('visitorLogs.search.placeholder')"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
        </VRow>
      </VCardText>

      <VDivider />

      <VCardText class="d-flex flex-wrap gap-4">
        <div class="me-3 d-flex gap-3">
          <AppSelect
            :model-value="itemsPerPage"
            :items="[
              { value: 10, title: '10' },
              { value: 25, title: '25' },
              { value: 50, title: '50' },
              { value: 100, title: '100' },
              { value: -1, title: 'All' },
            ]"
            style="inline-size: 6.25rem;"
            @update:model-value="itemsPerPage = parseInt($event, 10)"
          />
        </div>
        <VSpacer />

        <div class="d-flex align-center gap-4">
          <!-- Refresh button -->
          <VBtn
            variant="tonal"
            color="default"
            icon="tabler-refresh"
            @click="fetchLogs()"
          />
        </div>
      </VCardText>

      <VDivider />

      <!-- Data Table -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        v-model:expanded="expandedRows"
        :items="groupedLogs"
        item-value="record_uid"
        :items-length="totalLogs"
        :headers="headers"
        :loading="isLoading"
        class="text-no-wrap"
        @update:options="updateOptions"
        @click:row="(_: any, row: any) => row.item.totalEntries > 1 && toggleRowExpansion(row.item.record_uid)"
      >
        <!-- Visitor -->
        <template #item.visitor="{ item }">
          <div class="d-flex align-center gap-x-3">
            <VAvatar
              size="34"
              variant="tonal"
              color="primary"
            >
              <VIcon
                icon="tabler-user"
                size="22"
              />
            </VAvatar>
            <div class="d-flex flex-column">
              <h6 class="text-base font-weight-medium">
                {{ item.visitor_name }}
              </h6>
              <div class="text-sm text-disabled">
                {{ item.record_uid }}
              </div>
            </div>
          </div>
        </template>

        <!-- Entry Time -->
        <template #item.in_time="{ item }">
          <div class="d-flex flex-column">
            <span class="text-body-2">{{ formatDateTime(item.in_time) }}</span>
            <span
              v-if="item.out_time"
              class="text-sm text-disabled"
            >
              Duration: {{ formatDuration(item.in_time, item.out_time) }}
            </span>
          </div>
        </template>

        <!-- Exit Time -->
        <template #item.out_time="{ item }">
          <VChip
            v-if="item.out_time"
            size="small"
            color="success"
            variant="tonal"
            label
          >
            {{ formatDateTime(item.out_time) }}
          </VChip>
          <VChip
            v-else
            size="small"
            color="warning"
            variant="tonal"
            label
          >
            {{ t('visitorLogs.dialog.stillInside') }}
          </VChip>
        </template>

        <!-- Host -->
        <template #item.host="{ item }">
          <span class="text-body-2">{{ item.host?.display_name || t('common.notAvailable') }}</span>
        </template>

        <!-- Community -->
        <template #item.community="{ item }">
          <VChip
            v-if="item.community?.name"
            size="small"
            color="primary"
            variant="tonal"
            label
          >
            {{ item.community.name }}
          </VChip>
          <span
            v-else
            class="text-disabled"
          >{{ t('common.notAvailable') }}</span>
        </template>

        <!-- Entries Count -->
        <template #item.entries="{ item }">
          <VChip
            size="small"
            :color="item.totalEntries > 1 ? 'info' : 'default'"
            variant="tonal"
            label
          >
            {{ item.totalEntries }} {{ item.totalEntries === 1 ? t('visitorLogs.labels.entry') : t('visitorLogs.labels.entries') }}
          </VChip>
        </template>

        <!-- Evidence -->
        <template #item.evidence="{ item }">
          <VChip
            v-if="item.hasEvidence"
            size="small"
            color="info"
            variant="tonal"
            label
            class="cursor-pointer"
            prepend-icon="tabler-camera"
            @click.stop="viewImage(getEvidenceUrls(item)[0], getEvidenceUrls(item), item)"
          >
            {{ item.evidenceCount }} {{ item.evidenceCount === 1 ? t('visitorLogs.labels.photo') : t('visitorLogs.labels.photos') }}
          </VChip>
          <VChip
            v-else
            size="small"
            color="default"
            variant="tonal"
            label
            prepend-icon="tabler-camera-off"
          >
            {{ t('visitorLogs.dialog.noPhotos') }}
          </VChip>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div class="d-flex">
            <IconBtn
              size="small"
              @click.stop="viewLog(item)"
            >
              <VIcon
                icon="tabler-eye"
                size="20"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('visitorLogs.buttons.viewDetails') }}
              </VTooltip>
            </IconBtn>
          </div>
        </template>

        <!-- Expand icon - only show if more than 1 entry -->
        <template #item.data-table-expand="{ item }">
          <VBtn
            v-if="item.totalEntries > 1"
            icon
            variant="text"
            size="small"
            @click.stop="toggleRowExpansion(item.record_uid)"
          >
            <VIcon :icon="expandedRows.includes(item.record_uid) ? 'tabler-chevron-up' : 'tabler-chevron-down'" />
          </VBtn>
        </template>

        <!-- Expanded row content -->
        <template #expanded-row="{ columns, item }">
          <tr class="v-data-table__tr">
            <td :colspan="columns.length" class="pa-0">
              <div class="px-4 py-3 bg-var-theme-background">
                <div class="text-body-2 font-weight-medium mb-3">
                  {{ t('visitorLogs.dialog.previousEntries') }} ({{ item.previousEntries.length }})
                </div>
                <VTable density="compact" class="rounded border">
                  <thead>
                    <tr>
                      <th>{{ t('visitorLogs.dialog.entryTime') }}</th>
                      <th>{{ t('visitorLogs.dialog.exitTime') }}</th>
                      <th>{{ t('visitorLogs.dialog.duration') }}</th>
                      <th>{{ t('visitorLogs.table.evidence') }}</th>
                      <th>{{ t('visitorLogs.table.actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="entry in item.previousEntries"
                      :key="entry.id"
                    >
                      <td>
                        <VChip
                          size="x-small"
                          color="primary"
                          variant="tonal"
                          label
                          prepend-icon="tabler-login"
                        >
                          {{ formatDateTime(entry.in_time) }}
                        </VChip>
                      </td>
                      <td>
                        <VChip
                          v-if="entry.out_time"
                          size="x-small"
                          color="success"
                          variant="tonal"
                          label
                          prepend-icon="tabler-logout"
                        >
                          {{ formatDateTime(entry.out_time) }}
                        </VChip>
                        <VChip
                          v-else
                          size="x-small"
                          color="warning"
                          variant="tonal"
                          label
                          prepend-icon="tabler-clock"
                        >
                          Still Inside
                        </VChip>
                      </td>
                      <td>
                        <span class="text-body-2">{{ entry.out_time ? formatDuration(entry.in_time, entry.out_time) : 'N/A' }}</span>
                      </td>
                      <td>
                        <VChip
                          v-if="entry.hasEvidence"
                          size="x-small"
                          color="info"
                          variant="tonal"
                          label
                          class="cursor-pointer"
                          prepend-icon="tabler-camera"
                          @click="viewImage(getEvidenceUrls(entry)[0], getEvidenceUrls(entry), entry)"
                        >
                          {{ entry.evidenceCount }} {{ entry.evidenceCount === 1 ? 'photo' : 'photos' }}
                        </VChip>
                        <VChip
                          v-else
                          size="x-small"
                          color="default"
                          variant="tonal"
                          label
                          prepend-icon="tabler-camera-off"
                        >
                          No photos
                        </VChip>
                      </td>
                      <td>
                        <IconBtn
                          size="small"
                          @click="viewLog(entry)"
                        >
                          <VIcon icon="tabler-eye" size="18" />
                        </IconBtn>
                      </td>
                    </tr>
                  </tbody>
                </VTable>
              </div>
            </td>
          </tr>
        </template>

        <!-- pagination -->
        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalLogs"
          />
        </template>
      </VDataTableServer>
    </VCard>

    <!-- View Log Dialog -->
    <VDialog
      v-model="isViewDialogVisible"
      max-width="700"
    >
      <VCard v-if="selectedLog">
        <VCardTitle class="d-flex justify-space-between align-center pa-6">
          <span>Access Log Details</span>
          <VChip
            :color="selectedLog.out_time ? 'success' : 'warning'"
            size="small"
            label
          >
            {{ selectedLog.out_time ? 'Completed' : 'Still Inside' }}
          </VChip>
        </VCardTitle>

        <VDivider />

        <VCardText class="pa-6">
          <VRow>
            <!-- Left Column: Info -->
            <VCol
              cols="12"
              md="6"
            >
              <VList
                density="compact"
                class="card-list"
              >
                <VListItem>
                  <template #prepend>
                    <VIcon
                      icon="tabler-user"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>Visitor</VListItemTitle>
                  <VListItemSubtitle>{{ selectedLog.visitor_name }}</VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <template #prepend>
                    <VIcon
                      icon="tabler-id"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>Pass Code</VListItemTitle>
                  <VListItemSubtitle>{{ selectedLog.record_uid }}</VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <template #prepend>
                    <VIcon
                      icon="tabler-user-check"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>Host</VListItemTitle>
                  <VListItemSubtitle>{{ selectedLog.host?.display_name || 'N/A' }}</VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <template #prepend>
                    <VIcon
                      icon="tabler-building-community"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>Community</VListItemTitle>
                  <VListItemSubtitle>{{ selectedLog.community?.name || 'N/A' }}</VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <template #prepend>
                    <VIcon
                      icon="tabler-home"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>Property</VListItemTitle>
                  <VListItemSubtitle>{{ selectedLog.property?.name || 'N/A' }}</VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <template #prepend>
                    <VIcon
                      icon="tabler-login"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>Entry Time</VListItemTitle>
                  <VListItemSubtitle>{{ formatDateTime(selectedLog.in_time) }}</VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <template #prepend>
                    <VIcon
                      icon="tabler-logout"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>Exit Time</VListItemTitle>
                  <VListItemSubtitle>{{ selectedLog.out_time ? formatDateTime(selectedLog.out_time) : 'Still Inside' }}</VListItemSubtitle>
                </VListItem>

                <VListItem v-if="selectedLog.notes">
                  <template #prepend>
                    <VIcon
                      icon="tabler-notes"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>Notes</VListItemTitle>
                  <VListItemSubtitle>{{ selectedLog.notes }}</VListItemSubtitle>
                </VListItem>
              </VList>
            </VCol>

            <!-- Right Column: Evidence Photos -->
            <VCol
              cols="12"
              md="6"
            >
              <div class="text-body-1 font-weight-medium mb-3">
                Evidence Photos
              </div>
              <div
                v-if="selectedLog.hasEvidence"
                class="d-flex flex-wrap gap-2"
              >
                <template
                  v-for="(url, idx) in getEvidenceUrls(selectedLog)"
                  :key="idx"
                >
                  <VCard
                    class="cursor-pointer"
                    rounded="lg"
                    @click="viewImage(url, getEvidenceUrls(selectedLog), selectedLog)"
                    @contextmenu="preventContextMenu"
                  >
                    <VImg
                      :src="url"
                      width="120"
                      height="120"
                      cover
                    />
                  </VCard>
                </template>
              </div>
              <div
                v-else
                class="text-disabled"
              >
                No photos attached to this entry
              </div>
            </VCol>
          </VRow>
        </VCardText>

        <VDivider />

        <VCardActions class="pa-4">
          <VSpacer />
          <VBtn
            color="secondary"
            variant="tonal"
            @click="isViewDialogVisible = false"
          >
            Close
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Image Preview Dialog -->
    <VDialog
      v-model="isImageDialogVisible"
      width="auto"
      max-width="95vw"
    >
      <VCard class="image-preview-card">
        <VCardText class="pa-6">
          <VImg
            :src="selectedImageUrl"
            min-width="500"
            max-height="75vh"
            max-width="90vw"
            class="rounded-lg"
            @contextmenu="preventContextMenu"
          />
        </VCardText>

        <!-- Timestamp label -->
        <div
          v-if="currentImageTimestamp"
          class="d-flex justify-center pb-2"
        >
          <VChip
            size="small"
            color="default"
            variant="tonal"
            prepend-icon="tabler-calendar-time"
          >
            Captured: {{ formatDateTime(currentImageTimestamp) }}
          </VChip>
        </div>

        <!-- Navigation arrows (only show if multiple images) -->
        <VCardActions
          v-if="hasMultipleImages"
          class="d-flex justify-center gap-4 pb-4"
        >
          <VBtn
            icon
            variant="tonal"
            color="default"
            :disabled="!hasPrevImage"
            @click="prevImage"
          >
            <VIcon icon="tabler-chevron-left" />
          </VBtn>

          <span class="text-body-2 align-self-center">
            {{ currentImageIndex + 1 }} / {{ currentImageUrls.length }}
          </span>

          <VBtn
            icon
            variant="tonal"
            color="default"
            :disabled="!hasNextImage"
            @click="nextImage"
          >
            <VIcon icon="tabler-chevron-right" />
          </VBtn>
        </VCardActions>

        <VCardActions class="pa-4 pt-0">
          <VBtn
            color="primary"
            variant="tonal"
            prepend-icon="tabler-download"
            @click="downloadImage"
          >
            Download
          </VBtn>
          <VSpacer />
          <VBtn
            color="secondary"
            variant="tonal"
            @click="isImageDialogVisible = false"
          >
            Close
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>

<style lang="scss" scoped>
// Prevent horizontal scroll
:deep(.v-data-table) {
  overflow-x: hidden !important;
}

:deep(.v-table__wrapper) {
  overflow-x: auto;
}

// Truncate long community names
:deep(.v-chip) {
  max-inline-size: 160px;

  .v-chip__content {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
