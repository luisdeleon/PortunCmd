<script setup lang="ts">
import { supabase } from '@/lib/supabase'
import { useI18n } from 'vue-i18n'

definePage({
  meta: {
    public: false,
    action: 'manage',
    subject: 'all',
  },
})

// 👉 i18n
const { t } = useI18n()

// 👉 Store
const searchQuery = ref('')

// Data table options
const itemsPerPage = ref(10)
const page = ref(1)
const sortBy = ref()
const orderBy = ref()

// Update data table options
const updateOptions = (options: any) => {
  sortBy.value = options.sortBy[0]?.key
  orderBy.value = options.sortBy[0]?.order
}

// Headers
const headers = computed(() => [
  { title: t('communityAudit.table.communityId'), key: 'community_id' },
  { title: t('communityAudit.table.communityName'), key: 'community_name' },
  { title: t('communityAudit.table.deletedAt'), key: 'deleted_at' },
  { title: t('communityAudit.table.deletedBy'), key: 'deleted_by_user' },
  { title: t('communityAudit.table.recordsDeleted'), key: 'records_deleted', sortable: false },
  { title: t('communityAudit.table.actions'), key: 'actions', sortable: false },
])

// 👉 Fetching audit logs from Supabase
const auditLogs = ref<any[]>([])
const totalAuditLogs = ref(0)
const isLoading = ref(false)

const fetchAuditLogs = async () => {
  try {
    isLoading.value = true

    let query = supabase
      .from('community_deletion_audit')
      .select(`
        id,
        community_id,
        community_name,
        deleted_at,
        deleted_by,
        deleted_data,
        deleted_by_user:profile!community_deletion_audit_deleted_by_profile_fkey(id, display_name, email)
      `, { count: 'exact' })

    // Apply search filter
    if (searchQuery.value) {
      query = query.or(`community_id.ilike.%${searchQuery.value}%,community_name.ilike.%${searchQuery.value}%`)
    }

    // Apply sorting
    if (sortBy.value) {
      query = query.order(sortBy.value, { ascending: orderBy.value !== 'desc' })
    } else {
      query = query.order('deleted_at', { ascending: false })
    }

    // Apply pagination
    const from = (page.value - 1) * itemsPerPage.value
    const to = from + itemsPerPage.value - 1

    if (itemsPerPage.value !== -1) {
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching audit logs from Supabase:', error)
      return
    }

    // Transform data
    auditLogs.value = (data || []).map(log => ({
      ...log,
      deleted_by_user: log.deleted_by_user || null,
      records_deleted: getTotalRecordsDeleted(log.deleted_data),
    }))
    totalAuditLogs.value = count || 0
  } catch (err) {
    console.error('Error in fetchAuditLogs:', err)
  } finally {
    isLoading.value = false
  }
}

// Calculate total records deleted from deleted_data
const getTotalRecordsDeleted = (deletedData: any) => {
  if (!deletedData?.counts) return 0
  const counts = deletedData.counts
  return (counts.visitor_records || 0) +
         (counts.devices || 0) +
         (counts.properties || 0) +
         (counts.managers || 0) +
         (counts.property_owners || 0) +
         (counts.notification_users || 0) +
         (counts.profile_roles_deleted || 0)
}

// Format date
const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString()
}

// Fetch audit logs on mount
onMounted(() => {
  fetchAuditLogs()
})

// Watch for filter changes
watch([searchQuery, page, itemsPerPage, sortBy, orderBy], () => {
  fetchAuditLogs()
})

// 👉 View details dialog
const isViewDialogVisible = ref(false)
const selectedAudit = ref<any>(null)

const openViewDialog = (audit: any) => {
  selectedAudit.value = audit
  isViewDialogVisible.value = true
}

const closeViewDialog = () => {
  isViewDialogVisible.value = false
  selectedAudit.value = null
}
</script>

<template>
  <section>
    <VCard>
      <VCardItem class="pb-4">
        <VCardTitle>{{ t('communityAudit.title') }}</VCardTitle>
        <template #append>
          <VChip
            color="primary"
            variant="tonal"
            size="small"
          >
            {{ t('communityAudit.superAdminOnly') }}
          </VChip>
        </template>
      </VCardItem>

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

        <div class="app-user-search-filter d-flex align-center flex-wrap gap-4">
          <!-- 👉 Search  -->
          <div style="inline-size: 15.625rem;">
            <AppTextField
              v-model="searchQuery"
              :placeholder="t('communityAudit.search.placeholder')"
              clearable
              clear-icon="tabler-x"
            />
          </div>

          <!-- 👉 Refresh button -->
          <VBtn
            variant="tonal"
            color="default"
            icon="tabler-refresh"
            @click="fetchAuditLogs"
          />
        </div>
      </VCardText>

      <VDivider />

      <!-- SECTION datatable -->
      <VDataTableServer
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :items="auditLogs"
        item-value="id"
        :items-length="totalAuditLogs"
        :headers="headers"
        :loading="isLoading"
        class="text-no-wrap"
        @update:options="updateOptions"
      >
        <!-- Community ID -->
        <template #item.community_id="{ item }">
          <div class="text-body-1 text-high-emphasis font-weight-medium">
            {{ item.community_id }}
          </div>
        </template>

        <!-- Community Name -->
        <template #item.community_name="{ item }">
          <div class="text-body-1">
            {{ item.community_name || 'N/A' }}
          </div>
        </template>

        <!-- Deleted At -->
        <template #item.deleted_at="{ item }">
          <div class="text-body-2">
            {{ formatDate(item.deleted_at) }}
          </div>
        </template>

        <!-- Deleted By -->
        <template #item.deleted_by_user="{ item }">
          <div v-if="item.deleted_by_user" class="d-flex flex-column">
            <span class="text-body-1 font-weight-medium">
              {{ item.deleted_by_user.display_name || 'Unknown' }}
            </span>
            <span class="text-body-2 text-disabled">
              {{ item.deleted_by_user.email }}
            </span>
          </div>
          <div v-else class="text-body-2 text-disabled">
            {{ t('communityAudit.unknownUser') }}
          </div>
        </template>

        <!-- Records Deleted -->
        <template #item.records_deleted="{ item }">
          <VChip
            :color="item.records_deleted > 0 ? 'warning' : 'success'"
            size="small"
            label
          >
            {{ item.records_deleted }}
          </VChip>
        </template>

        <!-- Actions -->
        <template #item.actions="{ item }">
          <IconBtn
            size="small"
            @click="openViewDialog(item)"
          >
            <VIcon
              icon="tabler-eye"
              size="20"
            />
            <VTooltip
              activator="parent"
              location="top"
            >
              {{ t('communityAudit.actions.viewDetails') }}
            </VTooltip>
          </IconBtn>
        </template>

        <!-- pagination -->
        <template #bottom>
          <TablePagination
            v-model:page="page"
            :items-per-page="itemsPerPage"
            :total-items="totalAuditLogs"
          />
        </template>
      </VDataTableServer>
      <!-- SECTION -->
    </VCard>

    <!-- 👉 View Details Dialog -->
    <VDialog
      v-model="isViewDialogVisible"
      max-width="700"
    >
      <VCard>
        <VCardTitle class="text-h5 pa-6">
          <div class="d-flex align-center gap-2">
            <VIcon
              icon="tabler-history"
              size="24"
              color="primary"
            />
            {{ t('communityAudit.viewDialog.title') }}
          </div>
        </VCardTitle>

        <VDivider />

        <VCardText class="pa-6">
          <template v-if="selectedAudit">
            <!-- Community Details Section -->
            <div class="mb-6">
              <h6 class="text-h6 mb-3">
                {{ t('communityAudit.viewDialog.communityDetails') }}
              </h6>
              <VRow>
                <VCol cols="12" md="6">
                  <div class="d-flex flex-column gap-2">
                    <div>
                      <span class="text-body-2 text-disabled">{{ t('communityAudit.viewDialog.id') }}:</span>
                      <span class="text-body-1 ms-2 font-weight-medium">{{ selectedAudit.community_id }}</span>
                    </div>
                    <div>
                      <span class="text-body-2 text-disabled">{{ t('communityAudit.viewDialog.name') }}:</span>
                      <span class="text-body-1 ms-2">{{ selectedAudit.community_name || 'N/A' }}</span>
                    </div>
                    <div v-if="selectedAudit.deleted_data?.community?.address">
                      <span class="text-body-2 text-disabled">{{ t('communityAudit.viewDialog.address') }}:</span>
                      <span class="text-body-1 ms-2">{{ selectedAudit.deleted_data.community.address }}</span>
                    </div>
                  </div>
                </VCol>
                <VCol cols="12" md="6">
                  <div class="d-flex flex-column gap-2">
                    <div v-if="selectedAudit.deleted_data?.community?.status">
                      <span class="text-body-2 text-disabled">{{ t('communityAudit.viewDialog.status') }}:</span>
                      <VChip
                        size="small"
                        class="ms-2"
                        color="secondary"
                      >
                        {{ selectedAudit.deleted_data.community.status }}
                      </VChip>
                    </div>
                    <div v-if="selectedAudit.deleted_data?.community?.created_at">
                      <span class="text-body-2 text-disabled">{{ t('communityAudit.viewDialog.createdAt') }}:</span>
                      <span class="text-body-1 ms-2">{{ formatDate(selectedAudit.deleted_data.community.created_at) }}</span>
                    </div>
                  </div>
                </VCol>
              </VRow>
            </div>

            <VDivider class="mb-6" />

            <!-- Deletion Info Section -->
            <div class="mb-6">
              <h6 class="text-h6 mb-3">
                {{ t('communityAudit.viewDialog.deletionInfo') }}
              </h6>
              <div class="d-flex flex-column gap-2">
                <div>
                  <span class="text-body-2 text-disabled">{{ t('communityAudit.viewDialog.deletedAt') }}:</span>
                  <span class="text-body-1 ms-2">{{ formatDate(selectedAudit.deleted_at) }}</span>
                </div>
                <div>
                  <span class="text-body-2 text-disabled">{{ t('communityAudit.viewDialog.deletedBy') }}:</span>
                  <span v-if="selectedAudit.deleted_by_user" class="text-body-1 ms-2">
                    {{ selectedAudit.deleted_by_user.display_name }} ({{ selectedAudit.deleted_by_user.email }})
                  </span>
                  <span v-else class="text-body-1 ms-2 text-disabled">{{ t('communityAudit.unknownUser') }}</span>
                </div>
              </div>
            </div>

            <VDivider class="mb-6" />

            <!-- Cascade Counts Section -->
            <div>
              <h6 class="text-h6 mb-3">
                {{ t('communityAudit.viewDialog.cascadeCounts') }}
              </h6>
              <VRow>
                <VCol
                  v-for="(count, key) in selectedAudit.deleted_data?.counts"
                  :key="key"
                  cols="6"
                  md="4"
                >
                  <VCard
                    variant="tonal"
                    :color="count > 0 ? 'warning' : 'success'"
                    class="pa-3"
                  >
                    <div class="d-flex align-center justify-space-between">
                      <span class="text-body-2 text-capitalize">
                        {{ key.replace(/_/g, ' ') }}
                      </span>
                      <VChip
                        :color="count > 0 ? 'warning' : 'success'"
                        size="small"
                        label
                      >
                        {{ count }}
                      </VChip>
                    </div>
                  </VCard>
                </VCol>
              </VRow>
            </div>
          </template>
        </VCardText>

        <VDivider />

        <VCardActions class="pa-6">
          <VSpacer />
          <VBtn
            color="secondary"
            variant="tonal"
            @click="closeViewDialog"
          >
            {{ t('communityAudit.viewDialog.close') }}
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </section>
</template>
