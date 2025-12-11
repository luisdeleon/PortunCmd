<script setup lang="ts">
import { supabase } from '@/lib/supabase'
import { useI18n } from 'vue-i18n'
import QRCodeDisplay from '@/components/QRCodeDisplay.vue'
import { useTranslations } from '@/composables/useTranslations'

definePage({
  meta: {
    public: false,
    navActiveLink: 'apps-visitor-list',
  },
})

const { t } = useI18n()

// Translations for visitor types
const { loadTranslations, translateVisitorType } = useTranslations()

// User data for permission checks
const userData = useCookie<any>('userData')

// Check if user can manage (not Guard or Resident for delete/edit)
const canManage = computed(() => {
  const role = userData.value?.role
  return role && !['Guard', 'Resident'].includes(role)
})

// Check if user is a resident (can only see their own passes)
const isResident = computed(() => userData.value?.role === 'Resident')

// Get user scope for filtering
const userScope = computed(() => userData.value?.scope || {})
const isSuperAdmin = computed(() => userData.value?.role === 'Super Admin' || userScope.value.scopeType === 'global')

// Data state
const visitors = ref<any[]>([])
const totalVisitors = ref(0)
const isLoading = ref(false)

// Filters
const searchQuery = ref('')
const selectedCommunity = ref()
const selectedStatus = ref()
const selectedType = ref()

// Pagination
const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()

// Communities for filter
const communities = ref<{ title: string; value: string }[]>([])

// Visitor types with icons
const visitorTypes = [
  { title: 'Guest', value: 'Guest', icon: 'tabler-user-check', color: 'primary' },
  { title: 'Invitado', value: 'Invitado', icon: 'tabler-user-check', color: 'primary' },
  { title: 'Family', value: 'Family', icon: 'tabler-users-group', color: 'success' },
  { title: 'Party', value: 'Party', icon: 'tabler-confetti', color: 'warning' },
  { title: 'Delivery', value: 'Delivery', icon: 'tabler-truck-delivery', color: 'info' },
  { title: 'Service', value: 'Service', icon: 'tabler-tools', color: 'secondary' },
  { title: 'Contractor', value: 'Contractor', icon: 'tabler-helmet', color: 'error' },
]

// Status options based on validity
const statusOptions = [
  { title: 'Active', value: 'active' },
  { title: 'Expired', value: 'expired' },
  { title: 'Used', value: 'used' },
]

// Dialog state
const isViewDialogVisible = ref(false)
const isDeleteDialogVisible = ref(false)
const isBulkDeleteDialogVisible = ref(false)
const selectedVisitor = ref<any>(null)
const snackbar = ref({ show: false, message: '', color: 'success' })

// Bulk selection
const selectedRows = ref<string[]>([])
const isDeleting = ref(false)

// Stats
const totalActive = ref(0)
const totalExpired = ref(0)
const totalUsed = ref(0)
const totalToday = ref(0)

// Expanded rows for additional details (only one at a time)
const expandedRows = ref<string[]>([])

// Toggle row expansion on click (collapse others, only one open at a time)
const toggleRowExpansion = (id: string) => {
  if (expandedRows.value.includes(id)) {
    expandedRows.value = []
  } else {
    expandedRows.value = [id]
  }
}

// Headers (reduced - additional info in expanded row)
const headers = computed(() => [
  { title: t('visitorList.table.visitor'), key: 'visitor' },
  { title: t('visitorList.table.host'), key: 'host' },
  { title: t('visitorList.table.type'), key: 'visitor_type' },
  { title: t('visitorList.table.status'), key: 'status', sortable: false },
  { title: t('visitorList.table.validUntil'), key: 'validity_end' },
  { title: t('visitorList.table.actions'), key: 'actions', sortable: false },
])

// Update options from data table
const updateOptions = (options: any) => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

// Determine visitor status based on validity and entries
const getVisitorStatus = (visitor: any) => {
  const now = new Date()
  const validityEnd = new Date(visitor.validity_end)

  // Set validity_end to end of day (23:59:59.999) so passes are valid for the entire day
  validityEnd.setHours(23, 59, 59, 999)

  const entriesUsed = visitor.entries_used || 0
  const entriesAllowed = visitor.entries_allowed || 1

  if (entriesUsed >= entriesAllowed && entriesAllowed !== 9999) {
    return { status: 'used', color: 'secondary', icon: 'tabler-check' }
  }
  if (validityEnd < now) {
    return { status: 'expired', color: 'error', icon: 'tabler-clock-off' }
  }
  return { status: 'active', color: 'success', icon: 'tabler-check' }
}

// Fetch visitors
const fetchVisitors = async () => {
  try {
    isLoading.value = true

    let query = supabase
      .from('visitor_records_uid')
      .select(`
        *,
        host:profile!visitor_records_uid_host_uid_fkey(id, display_name, email),
        community:community!visitor_records_uid_community_id_fkey(id, name),
        property:property!visitor_records_uid_property_id_fkey(id, name)
      `, { count: 'exact' })

    // Apply role-based scoping
    if (!isSuperAdmin.value) {
      const scope = userScope.value

      if (scope.scopeType === 'property' && scope.scopePropertyIds?.length > 0) {
        // Property-scoped users (Residents) - see only their properties
        query = query.in('property_id', scope.scopePropertyIds)
      }
      else if (scope.scopeType === 'community' && scope.scopeCommunityIds?.length > 0) {
        // Community-scoped users (Admin, Guard) - see only their communities
        query = query.in('community_id', scope.scopeCommunityIds)
      }
      else if (isResident.value && userData.value?.id) {
        // Fallback for residents without scope - show only their own passes
        query = query.eq('host_uid', userData.value.id)
      }
    }

    // Apply search filter
    if (searchQuery.value) {
      query = query.or(`visitor_name.ilike.%${searchQuery.value}%,record_uid.ilike.%${searchQuery.value}%`)
    }

    // Apply community filter
    if (selectedCommunity.value) {
      query = query.eq('community_id', selectedCommunity.value)
    }

    // Apply type filter
    if (selectedType.value) {
      query = query.eq('visitor_type', selectedType.value)
    }

    // Apply sorting
    if (sortBy.value) {
      const ascending = orderBy.value !== 'desc'
      query = query.order(sortBy.value, { ascending })
    } else {
      // Default: newest created first, then most recently used
      query = query
        .order('created_at', { ascending: false })
        .order('updated_at', { ascending: false })
    }

    // Apply pagination
    const from = (page.value - 1) * itemsPerPage.value
    const to = from + itemsPerPage.value - 1

    if (itemsPerPage.value !== -1) {
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching visitors:', error)
      return
    }

    // Transform data and add status
    visitors.value = (data || []).map(visitor => ({
      ...visitor,
      statusInfo: getVisitorStatus(visitor),
    }))

    // Filter by status client-side (since it's computed)
    if (selectedStatus.value) {
      visitors.value = visitors.value.filter(v => v.statusInfo.status === selectedStatus.value)
    }

    totalVisitors.value = selectedStatus.value
      ? visitors.value.length
      : (count || 0)
  } catch (err) {
    console.error('Error in fetchVisitors:', err)
  } finally {
    isLoading.value = false
  }
}

// Fetch communities for filter (scoped by user role)
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
        // Community-scoped users - only their communities
        query = query.in('id', scope.scopeCommunityIds)
      }
      else if (scope.scopePropertyIds?.length > 0) {
        // Property-scoped users - get communities from their properties
        const { data: properties } = await supabase
          .from('property')
          .select('community_id')
          .in('id', scope.scopePropertyIds)

        const communityIds = [...new Set(properties?.map(p => p.community_id).filter(Boolean))]
        if (communityIds.length > 0) {
          query = query.in('id', communityIds)
        }
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

// Fetch stats
const fetchStats = async () => {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Build base query for user scope
    let baseQuery = supabase.from('visitor_records_uid').select('validity_end, entries_used, entries_allowed, created_at, community_id, property_id')

    // Apply role-based scoping (same as fetchVisitors)
    if (!isSuperAdmin.value) {
      const scope = userScope.value

      if (scope.scopeType === 'property' && scope.scopePropertyIds?.length > 0) {
        baseQuery = baseQuery.in('property_id', scope.scopePropertyIds)
      }
      else if (scope.scopeType === 'community' && scope.scopeCommunityIds?.length > 0) {
        baseQuery = baseQuery.in('community_id', scope.scopeCommunityIds)
      }
      else if (isResident.value && userData.value?.id) {
        baseQuery = baseQuery.eq('host_uid', userData.value.id)
      }
    }

    const { data, error } = await baseQuery

    if (error) {
      console.error('Error fetching stats:', error)
      return
    }

    let active = 0
    let expired = 0
    let used = 0
    let today = 0

    ;(data || []).forEach(visitor => {
      const status = getVisitorStatus(visitor)
      if (status.status === 'active') active++
      else if (status.status === 'expired') expired++
      else if (status.status === 'used') used++

      if (new Date(visitor.created_at) >= todayStart) today++
    })

    totalActive.value = active
    totalExpired.value = expired
    totalUsed.value = used
    totalToday.value = today
  } catch (err) {
    console.error('Error in fetchStats:', err)
  }
}

// View visitor details
const viewVisitor = (visitor: any) => {
  selectedVisitor.value = visitor
  isViewDialogVisible.value = true
}

// Open delete dialog
const openDeleteDialog = (visitor: any) => {
  selectedVisitor.value = visitor
  isDeleteDialogVisible.value = true
}

// Delete visitor pass (with cascade delete for logs)
const deleteVisitor = async () => {
  if (!selectedVisitor.value) return

  try {
    isDeleting.value = true

    // First, delete associated logs (cascade)
    const { error: logsError } = await supabase
      .from('visitor_record_logs')
      .delete()
      .eq('record_uid', selectedVisitor.value.record_uid)

    if (logsError) {
      console.error('Error deleting visitor logs:', logsError)
      // Continue even if logs deletion fails (may not have any logs)
    }

    // Then delete the visitor record
    const { error } = await supabase
      .from('visitor_records_uid')
      .delete()
      .eq('id', selectedVisitor.value.id)

    if (error) {
      console.error('Error deleting visitor:', error)
      snackbar.value = {
        show: true,
        message: 'Failed to delete visitor pass',
        color: 'error',
      }
      return
    }

    snackbar.value = {
      show: true,
      message: 'Visitor pass deleted successfully',
      color: 'success',
    }

    isDeleteDialogVisible.value = false
    selectedVisitor.value = null
    fetchVisitors()
    fetchStats()
  } catch (err) {
    console.error('Error in deleteVisitor:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to delete visitor pass',
      color: 'error',
    }
  } finally {
    isDeleting.value = false
  }
}

// Open bulk delete dialog
const openBulkDeleteDialog = () => {
  if (selectedRows.value.length === 0) return
  isBulkDeleteDialogVisible.value = true
}

// Bulk delete visitor passes (with cascade delete for logs)
const bulkDeleteVisitors = async () => {
  if (selectedRows.value.length === 0) return

  try {
    isDeleting.value = true

    // Get the record_uids for the selected visitors to delete their logs
    const selectedVisitors = visitors.value.filter(v => selectedRows.value.includes(v.id))
    const recordUids = selectedVisitors.map(v => v.record_uid).filter(Boolean)

    // First, delete associated logs for all selected visitors (cascade)
    if (recordUids.length > 0) {
      const { error: logsError } = await supabase
        .from('visitor_record_logs')
        .delete()
        .in('record_uid', recordUids)

      if (logsError) {
        console.error('Error deleting visitor logs:', logsError)
        // Continue even if logs deletion fails
      }
    }

    // Then delete the visitor records
    const { error } = await supabase
      .from('visitor_records_uid')
      .delete()
      .in('id', selectedRows.value)

    if (error) {
      console.error('Error bulk deleting visitors:', error)
      snackbar.value = {
        show: true,
        message: 'Failed to delete visitor passes',
        color: 'error',
      }
      return
    }

    snackbar.value = {
      show: true,
      message: `Successfully deleted ${selectedRows.value.length} visitor pass(es)`,
      color: 'success',
    }

    isBulkDeleteDialogVisible.value = false
    selectedRows.value = []
    fetchVisitors()
    fetchStats()
  } catch (err) {
    console.error('Error in bulkDeleteVisitors:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to delete visitor passes',
      color: 'error',
    }
  } finally {
    isDeleting.value = false
  }
}

// Format date - show month/day, with + if future year or >12 months
const formatDate = (dateStr: string, showTime = false) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  const now = new Date()

  // Check if it's the "unlimited" date
  if (date.getFullYear() >= 2099) return 'Unlimited'

  // Check if date is in a different year or more than 12 months away
  const monthsDiff = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth())
  const isDifferentYear = date.getFullYear() !== now.getFullYear()
  const isMoreThan12Months = monthsDiff > 12

  const suffix = (isDifferentYear || isMoreThan12Months) ? '+' : ''

  if (showTime) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + suffix
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) + suffix
}

// Format entries
const formatEntries = (visitor: any) => {
  const used = visitor.entries_used || 0
  const allowed = visitor.entries_allowed || 1
  if (allowed === 9999) return `${used} / Unlimited`
  return `${used} / ${allowed}`
}

// Resolve visitor type icon and color
const resolveTypeVariant = (type: string) => {
  const typeLower = type?.toLowerCase() || ''
  if (typeLower.includes('family') || typeLower.includes('familia'))
    return { color: 'success', icon: 'tabler-users-group' }
  if (typeLower.includes('guest') || typeLower.includes('invitado'))
    return { color: 'primary', icon: 'tabler-user-check' }
  if (typeLower.includes('party') || typeLower.includes('fiesta'))
    return { color: 'warning', icon: 'tabler-confetti' }
  if (typeLower.includes('delivery') || typeLower.includes('entrega'))
    return { color: 'info', icon: 'tabler-truck-delivery' }
  if (typeLower.includes('service') || typeLower.includes('servicio'))
    return { color: 'secondary', icon: 'tabler-tools' }
  if (typeLower.includes('contractor') || typeLower.includes('contratista'))
    return { color: 'error', icon: 'tabler-helmet' }
  return { color: 'primary', icon: 'tabler-user-check' }
}

// Copy access link to clipboard
const copyAccessLink = async (uuid: string) => {
  const accessLink = `https://access.portun.app/hm/${uuid}`
  try {
    await navigator.clipboard.writeText(accessLink)
    snackbar.value = {
      show: true,
      message: t('visitorList.dialog.linkCopied'),
      color: 'success',
    }
  } catch (err) {
    console.error('Failed to copy:', err)
    snackbar.value = {
      show: true,
      message: 'Failed to copy link',
      color: 'error',
    }
  }
}

// Lifecycle
onMounted(() => {
  loadTranslations()
  fetchVisitors()
  fetchCommunities()
  fetchStats()
})

// Watch for filter changes
watch([searchQuery, selectedCommunity, selectedStatus, selectedType, page, itemsPerPage, sortBy, orderBy], () => {
  fetchVisitors()
})

// Widget data
const widgetData = computed(() => [
  {
    title: t('visitorList.widgets.activePasses'),
    value: totalActive.value.toLocaleString(),
    icon: 'tabler-ticket',
    iconColor: 'success',
  },
  {
    title: t('visitorList.widgets.expired'),
    value: totalExpired.value.toLocaleString(),
    icon: 'tabler-clock-off',
    iconColor: 'error',
  },
  {
    title: t('visitorList.widgets.used'),
    value: totalUsed.value.toLocaleString(),
    icon: 'tabler-check',
    iconColor: 'secondary',
  },
  {
    title: t('visitorList.widgets.createdToday'),
    value: totalToday.value.toLocaleString(),
    icon: 'tabler-calendar-plus',
    iconColor: 'primary',
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
        <VCardTitle>{{ t('visitorList.filters.title') }}</VCardTitle>
      </VCardItem>

      <VCardText>
        <VRow>
          <!-- Filter by Community -->
          <VCol
            cols="12"
            sm="4"
          >
            <AppAutocomplete
              v-model="selectedCommunity"
              :placeholder="t('visitorList.filters.filterByCommunity')"
              :items="communities"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
          <!-- Filter by Type -->
          <VCol
            cols="12"
            sm="4"
          >
            <AppSelect
              v-model="selectedType"
              :placeholder="t('visitorList.filters.filterByType')"
              :items="visitorTypes"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
          <!-- Filter by Status -->
          <VCol
            cols="12"
            sm="4"
          >
            <AppSelect
              v-model="selectedStatus"
              :placeholder="t('visitorList.filters.filterByStatus')"
              :items="statusOptions"
              clearable
              clear-icon="tabler-x"
            />
          </VCol>
        </VRow>
      </VCardText>

      <VDivider />

      <VCardText class="d-flex flex-wrap gap-4">
        <div class="me-3 d-flex gap-3 align-center">
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

          <!-- Bulk delete button (visible when rows selected) -->
          <VBtn
            v-if="canManage && selectedRows.length > 0"
            color="error"
            variant="tonal"
            prepend-icon="tabler-trash"
            @click="openBulkDeleteDialog"
          >
            {{ t('Delete') }} ({{ selectedRows.length }})
          </VBtn>
        </div>
        <VSpacer />

        <div class="app-user-search-filter d-flex align-center flex-wrap gap-4">
          <!-- Search -->
          <div style="inline-size: 15.625rem;">
            <AppTextField
              v-model="searchQuery"
              :placeholder="t('visitorList.search.placeholder')"
              clearable
              clear-icon="tabler-x"
            />
          </div>

          <!-- Refresh button -->
          <VBtn
            variant="tonal"
            color="default"
            icon="tabler-refresh"
            @click="fetchVisitors(); fetchStats()"
          />

          <!-- Add visitor button -->
          <VBtn
            prepend-icon="tabler-plus"
            :to="{ name: 'apps-visitor-add' }"
          >
            {{ t('visitorList.buttons.createPass') }}
          </VBtn>
        </div>
      </VCardText>

      <VDivider />

      <!-- Data Table -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        v-model:expanded="expandedRows"
        v-model="selectedRows"
        :items="visitors"
        item-value="id"
        :items-length="totalVisitors"
        :headers="headers"
        :loading="isLoading"
        show-expand
        show-select
        class="text-no-wrap cursor-pointer"
        @update:options="updateOptions"
        @click:row="(_event: Event, row: any) => toggleRowExpansion(row.item.id)"
      >
        <!-- Visitor -->
        <template #item.visitor="{ item }">
          <div class="d-flex align-center gap-x-4">
            <VAvatar
              size="34"
              variant="tonal"
              :color="item.statusInfo.color"
            >
              <VIcon
                :icon="resolveTypeVariant(item.visitor_type).icon"
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

        <!-- Host -->
        <template #item.host="{ item }">
          <div class="d-flex flex-column">
            <span class="text-body-1">{{ item.host?.display_name || 'N/A' }}</span>
            <span class="text-sm text-disabled">{{ item.host?.email || '' }}</span>
          </div>
        </template>

        <!-- Type -->
        <template #item.visitor_type="{ item }">
          <div class="d-flex align-center gap-x-2">
            <VIcon
              :icon="resolveTypeVariant(item.visitor_type).icon"
              :color="resolveTypeVariant(item.visitor_type).color"
              size="20"
            />
            <span class="text-body-1">{{ translateVisitorType(item.visitor_type) }}</span>
          </div>
        </template>

        <!-- Status -->
        <template #item.status="{ item }">
          <VChip
            :color="item.statusInfo.color"
            size="small"
            label
          >
            <VIcon
              :icon="item.statusInfo.icon"
              size="16"
              class="me-1"
            />
            {{ item.statusInfo.status }}
          </VChip>
        </template>

        <!-- Valid Until -->
        <template #item.validity_end="{ item }">
          <span class="text-body-2">{{ formatDate(item.validity_end) }}</span>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <div class="d-flex">
            <IconBtn
              size="small"
              @click="viewVisitor(item)"
            >
              <VIcon
                icon="tabler-qrcode"
                size="20"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('visitorList.actions.viewQR') }}
              </VTooltip>
            </IconBtn>

            <IconBtn
              size="small"
              @click="viewVisitor(item)"
            >
              <VIcon
                icon="tabler-eye"
                size="20"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('visitorList.actions.viewDetails') }}
              </VTooltip>
            </IconBtn>

            <IconBtn
              v-if="canManage || item.host_uid === userData?.id"
              size="small"
              @click="openDeleteDialog(item)"
            >
              <VIcon
                icon="tabler-trash"
                size="20"
              />
              <VTooltip
                activator="parent"
                location="top"
              >
                {{ t('visitorList.actions.delete') }}
              </VTooltip>
            </IconBtn>
          </div>
        </template>

        <!-- Expanded Row Details -->
        <template #expanded-row="{ item }">
          <tr class="v-data-table__tr--expanded">
            <td :colspan="headers.length + 1">
              <div class="pa-4 d-flex flex-wrap gap-6">
                <!-- Community -->
                <div class="d-flex align-center gap-2">
                  <VIcon
                    icon="tabler-building-community"
                    size="18"
                    class="text-disabled"
                  />
                  <span class="text-body-2 text-disabled">{{ t('visitorList.table.community') }}:</span>
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
                  >{{ t('N/A') }}</span>
                </div>

                <!-- Property -->
                <div class="d-flex align-center gap-2">
                  <VIcon
                    icon="tabler-home"
                    size="18"
                    class="text-disabled"
                  />
                  <span class="text-body-2 text-disabled">{{ t('visitorList.table.property') }}:</span>
                  <VChip
                    v-if="item.property?.name"
                    size="small"
                    color="success"
                    variant="tonal"
                    label
                  >
                    {{ item.property.name }}
                  </VChip>
                  <span
                    v-else
                    class="text-disabled"
                  >{{ t('N/A') }}</span>
                </div>

                <!-- Entries -->
                <div class="d-flex align-center gap-2">
                  <VIcon
                    icon="tabler-login"
                    size="18"
                    class="text-disabled"
                  />
                  <span class="text-body-2 text-disabled">{{ t('visitorList.dialog.entries') }}:</span>
                  <span class="text-body-2">{{ formatEntries(item) }}</span>
                </div>
              </div>
            </td>
          </tr>
        </template>

        <!-- Pagination -->
        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalVisitors"
          />
        </template>
      </VDataTableServer>
    </VCard>

    <!-- View Visitor Dialog -->
    <VDialog
      v-model="isViewDialogVisible"
      max-width="700"
    >
      <VCard v-if="selectedVisitor">
        <VCardTitle class="d-flex justify-space-between align-center pa-6">
          <span>{{ t('visitorList.dialog.title') }}</span>
          <VChip
            :color="selectedVisitor.statusInfo?.color"
            size="small"
            label
          >
            {{ t(`visitorList.status.${selectedVisitor.statusInfo?.status}`) }}
          </VChip>
        </VCardTitle>

        <VDivider />

        <VCardText class="pa-6">
          <VRow>
            <!-- Left Column: QR Code -->
            <VCol
              cols="12"
              md="5"
              class="d-flex flex-column align-center"
            >
              <QRCodeDisplay
                :value="selectedVisitor.record_uid"
                :size="180"
              />
              <div class="text-center mt-4">
                <h6 class="text-h6">
                  {{ selectedVisitor.visitor_name }}
                </h6>
                <div class="d-flex align-center justify-center gap-1">
                  <span class="text-body-2 text-disabled">{{ selectedVisitor.record_uid }}</span>
                  <IconBtn
                    size="x-small"
                    @click="copyAccessLink(selectedVisitor.id)"
                  >
                    <VIcon
                      icon="tabler-copy"
                      size="16"
                    />
                    <VTooltip
                      activator="parent"
                      location="top"
                    >
                      {{ t('visitorList.dialog.copyLink') }}
                    </VTooltip>
                  </IconBtn>
                </div>
              </div>
            </VCol>

            <VDivider
              vertical
              class="d-none d-md-block"
            />

            <!-- Right Column: Details -->
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
                      icon="tabler-user-check"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>{{ t('visitorList.dialog.host') }}</VListItemTitle>
                  <VListItemSubtitle>{{ selectedVisitor.host?.display_name || t('N/A') }}</VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <template #prepend>
                    <VIcon
                      icon="tabler-building-community"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>{{ t('visitorList.dialog.community') }}</VListItemTitle>
                  <VListItemSubtitle>{{ selectedVisitor.community?.name || selectedVisitor.community_id }}</VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <template #prepend>
                    <VIcon
                      icon="tabler-home"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>{{ t('visitorList.dialog.property') }}</VListItemTitle>
                  <VListItemSubtitle>{{ selectedVisitor.property?.name || selectedVisitor.property_id }}</VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <template #prepend>
                    <VIcon
                      icon="tabler-category"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>{{ t('visitorList.dialog.type') }}</VListItemTitle>
                  <VListItemSubtitle>{{ translateVisitorType(selectedVisitor.visitor_type) }}</VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <template #prepend>
                    <VIcon
                      icon="tabler-calendar"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>{{ t('visitorList.dialog.validUntil') }}</VListItemTitle>
                  <VListItemSubtitle>{{ formatDate(selectedVisitor.validity_end) }}</VListItemSubtitle>
                </VListItem>

                <VListItem>
                  <template #prepend>
                    <VIcon
                      icon="tabler-login"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>{{ t('visitorList.dialog.entries') }}</VListItemTitle>
                  <VListItemSubtitle>{{ formatEntries(selectedVisitor) }}</VListItemSubtitle>
                </VListItem>

                <VListItem v-if="selectedVisitor.notes">
                  <template #prepend>
                    <VIcon
                      icon="tabler-notes"
                      size="20"
                      class="me-2"
                    />
                  </template>
                  <VListItemTitle>{{ t('visitorList.dialog.notes') }}</VListItemTitle>
                  <VListItemSubtitle>{{ selectedVisitor.notes }}</VListItemSubtitle>
                </VListItem>
              </VList>
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
            {{ t('visitorList.dialog.close') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Delete Confirmation Dialog -->
    <VDialog
      v-model="isDeleteDialogVisible"
      max-width="500"
    >
      <VCard>
        <VCardText class="text-center px-10 py-6">
          <VIcon
            icon="tabler-trash"
            color="error"
            size="56"
            class="my-4"
          />

          <h6 class="text-h6 mb-4">
            {{ t('visitorList.deleteDialog.title') }}
          </h6>

          <p class="text-body-1 mb-6">
            {{ t('visitorList.deleteDialog.message', { name: selectedVisitor?.visitor_name }) }}
          </p>

          <div class="d-flex gap-4 justify-center">
            <VBtn
              color="secondary"
              variant="tonal"
              @click="isDeleteDialogVisible = false"
            >
              {{ t('visitorList.deleteDialog.cancel') }}
            </VBtn>

            <VBtn
              color="error"
              variant="elevated"
              :loading="isDeleting"
              @click="deleteVisitor"
            >
              {{ t('visitorList.deleteDialog.confirm') }}
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Bulk Delete Confirmation Dialog -->
    <VDialog
      v-model="isBulkDeleteDialogVisible"
      max-width="500"
    >
      <VCard>
        <VCardText class="text-center px-10 py-6">
          <VIcon
            icon="tabler-trash"
            color="error"
            size="56"
            class="my-4"
          />

          <h6 class="text-h6 mb-4">
            {{ t('visitorList.bulkDeleteDialog.title') }}
          </h6>

          <p class="text-body-1 mb-4">
            {{ t('visitorList.bulkDeleteDialog.message', { count: selectedRows.length, entity: selectedRows.length === 1 ? t('entry') : t('entries') }) }}
          </p>

          <VAlert
            color="warning"
            variant="tonal"
            class="mb-6 text-start"
          >
            <div class="text-body-2">
              {{ t('visitorList.bulkDeleteDialog.warning', { count: selectedRows.length, entity: selectedRows.length === 1 ? t('entry') : t('entries') }) }}
            </div>
          </VAlert>

          <div class="d-flex gap-4 justify-center">
            <VBtn
              color="secondary"
              variant="tonal"
              @click="isBulkDeleteDialogVisible = false"
            >
              {{ t('visitorList.bulkDeleteDialog.cancel') }}
            </VBtn>

            <VBtn
              color="error"
              variant="elevated"
              :loading="isDeleting"
              @click="bulkDeleteVisitors"
            >
              {{ t('visitorList.bulkDeleteDialog.confirm') }}
            </VBtn>
          </div>
        </VCardText>
      </VCard>
    </VDialog>

    <!-- Snackbar -->
    <VSnackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="top end"
      :timeout="4000"
    >
      {{ snackbar.message }}
    </VSnackbar>
  </section>
</template>
