<script setup lang="ts">
import { useUserImport, type UserImportResult, type UserImportRow } from '@/composables/useUserImport'

const { t } = useI18n({ useScope: 'global' })

interface Props {
  isDialogVisible: boolean
}

interface Emit {
  (e: 'update:isDialogVisible', value: boolean): void
  (e: 'import-completed'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const { isImporting, parseCSV, checkDuplicates, importFromCSV, downloadTemplate, canCreateRole, getAllowedRoles, getCurrentUserRole } = useUserImport()

// Get allowed roles for current user
const allowedRoles = computed(() => getAllowedRoles())
const currentUserRole = computed(() => getCurrentUserRole())

// Checking duplicates state
const isCheckingDuplicates = ref(false)

// File upload
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)

// Preview state
const showPreview = ref(false)
const previewData = ref<UserImportRow[]>([])
const parseError = ref<string | null>(null)

// Import results
const importResult = ref<UserImportResult | null>(null)
const showResults = ref(false)

// Reset state when dialog opens/closes
watch(() => props.isDialogVisible, (newVal) => {
  if (newVal) {
    resetState()
  }
})

const resetState = () => {
  selectedFile.value = null
  showPreview.value = false
  previewData.value = []
  parseError.value = null
  importResult.value = null
  showResults.value = false
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const onFileSelected = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
    // Reset preview when new file is selected
    showPreview.value = false
    previewData.value = []
    parseError.value = null
  }
}

const onDrop = (event: DragEvent) => {
  isDragging.value = false

  if (event.dataTransfer && event.dataTransfer.files.length > 0) {
    selectedFile.value = event.dataTransfer.files[0]
    // Reset preview when new file is dropped
    showPreview.value = false
    previewData.value = []
    parseError.value = null
  }
}

const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

const onDragLeave = () => {
  isDragging.value = false
}

const removeFile = () => {
  selectedFile.value = null
  showPreview.value = false
  previewData.value = []
  parseError.value = null
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

// Preview the CSV data with duplicate checking
const previewCSV = async () => {
  if (!selectedFile.value) return

  try {
    parseError.value = null
    isCheckingDuplicates.value = true

    // Read file content
    const content = await selectedFile.value.text()

    // Parse CSV
    const parsed = parseCSV(content)

    // Check for duplicates and role violations
    const parsedWithStatus = await checkDuplicates(parsed)

    previewData.value = parsedWithStatus
    showPreview.value = true
  } catch (err: any) {
    parseError.value = err.message
    showPreview.value = false
    previewData.value = []
  } finally {
    isCheckingDuplicates.value = false
  }
}

// Count duplicates in preview data
const duplicateCount = computed(() => {
  return previewData.value.filter(u => u._isDuplicate).length
})

// Count importable items (non-duplicates and non-role-violations)
const importableCount = computed(() => {
  return previewData.value.filter(u => !u._isDuplicate && !u._isRoleViolation).length
})

// Check if there are any duplicates
const hasDuplicates = computed(() => duplicateCount.value > 0)

// Get duplicate reason text
const getDuplicateReasonText = (reason: string | undefined) => {
  switch (reason) {
    case 'email_exists':
      return t('importUserDialog.duplicates.emailExists')
    case 'duplicate_in_file':
      return t('importUserDialog.duplicates.duplicateInFile')
    default:
      return t('importUserDialog.duplicates.duplicate')
  }
}

// Cancel preview and go back to file selection
const cancelPreview = () => {
  showPreview.value = false
  previewData.value = []
  parseError.value = null
}

// Confirm and proceed with import
const confirmImport = async () => {
  if (!selectedFile.value) return

  try {
    // Read file content
    const content = await selectedFile.value.text()

    // Import users
    const result = await importFromCSV(content)

    importResult.value = result
    showResults.value = true
    showPreview.value = false

    // If successful, emit event to refresh the list
    if (result.success) {
      emit('import-completed')
    }
  } catch (err: any) {
    importResult.value = {
      success: false,
      totalRows: 0,
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
      errors: [{ row: 0, data: {}, error: err.message }],
    }
    showResults.value = true
    showPreview.value = false
  }
}

const closeDialog = () => {
  emit('update:isDialogVisible', false)
}

const downloadTemplateFile = () => {
  downloadTemplate()
}

// Check if a row should be skipped (duplicate or role violation)
const shouldSkipRow = (user: UserImportRow) => {
  return user._isDuplicate || user._isRoleViolation
}

// Get skip reason for a row
const getSkipReason = (user: UserImportRow) => {
  if (user._isDuplicate) {
    return getDuplicateReasonText(user._duplicateReason)
  }
  if (user._isRoleViolation) {
    return t('importUserDialog.errors.cannotCreateRole')
  }
  return ''
}

// Resolve role color - show error color if role is not allowed
const resolveRoleColor = (role: string) => {
  // If user can't create this role, show error color
  if (!canCreateRole(role)) {
    return 'error'
  }

  const roleLower = role.toLowerCase()
  if (roleLower === 'super admin') return 'error'
  if (roleLower === 'mega dealer') return 'purple'
  if (roleLower === 'dealer') return 'warning'
  if (roleLower === 'administrator') return 'primary'
  if (roleLower === 'guard') return 'info'
  if (roleLower === 'client') return 'secondary'
  if (roleLower === 'resident') return 'success'
  return 'secondary'
}

// Check if a role is not allowed for the current user
const isRoleNotAllowed = (role: string) => !canCreateRole(role)

// Count how many rows have role hierarchy violations
const roleViolationCount = computed(() => {
  return previewData.value.filter(user => !canCreateRole(user.role)).length
})

// Check if there are any role violations in the preview data
const hasRoleViolations = computed(() => roleViolationCount.value > 0)

// Data table headers for preview
const previewHeaders = computed(() => [
  { title: t('importUserDialog.table.status'), key: 'status', width: '120px' },
  { title: t('importUserDialog.table.email'), key: 'email', width: '250px' },
  { title: t('importUserDialog.table.displayName'), key: 'display_name', width: '180px' },
  { title: t('importUserDialog.table.password'), key: 'password', width: '100px' },
  { title: t('importUserDialog.table.role'), key: 'role', width: '150px' },
  { title: t('importUserDialog.table.communityId'), key: 'community_id', width: '130px' },
  { title: t('importUserDialog.table.propertyId'), key: 'property_id', width: '130px' },
])
</script>

<template>
  <VDialog
    :width="showPreview ? ($vuetify.display.smAndDown ? 'auto' : 1200) : ($vuetify.display.smAndDown ? 'auto' : 800)"
    :model-value="props.isDialogVisible"
    @update:model-value="closeDialog"
  >
    <!-- Dialog close btn -->
    <DialogCloseBtn @click="closeDialog" />

    <VCard class="pa-sm-10 pa-2">
      <VCardText>
        <!-- Title -->
        <div class="text-center mb-6">
          <VAvatar
            size="88"
            :color="showPreview ? 'success' : 'primary'"
            variant="tonal"
            class="mb-4"
          >
            <VIcon
              :icon="showPreview ? 'tabler-eye' : 'tabler-upload'"
              size="48"
            />
          </VAvatar>
          <h4 class="text-h4 mb-2">
            {{ showPreview ? t('importUserDialog.previewTitle') : t('importUserDialog.title') }}
          </h4>
          <p class="text-body-1 text-medium-emphasis">
            {{ showPreview ? t('importUserDialog.previewSubtitle') : t('importUserDialog.subtitle') }}
          </p>
        </div>

        <!-- Import Results -->
        <VAlert
          v-if="showResults && importResult"
          :color="importResult.success ? 'success' : 'warning'"
          variant="tonal"
          class="mb-6"
        >
          <VAlertTitle class="mb-2">
            {{ importResult.success ? t('importUserDialog.results.success') : t('importUserDialog.results.withErrors') }}
          </VAlertTitle>

          <div class="text-body-2">
            <div class="mb-2">
              <strong>{{ t('importUserDialog.results.totalRows') }}:</strong> {{ importResult.totalRows }}
            </div>
            <div class="mb-2">
              <strong>{{ t('importUserDialog.results.successfullyImported') }}:</strong> {{ importResult.successCount }}
            </div>
            <div
              v-if="importResult.skippedCount > 0"
              class="mb-2"
            >
              <strong>{{ t('importUserDialog.results.skipped') }}:</strong> {{ importResult.skippedCount }}
            </div>
            <div
              v-if="importResult.errorCount > 0"
              class="mb-2"
            >
              <strong>{{ t('importUserDialog.results.failed') }}:</strong> {{ importResult.errorCount }}
            </div>
          </div>

          <!-- Error Details -->
          <div
            v-if="importResult.errors.length > 0"
            class="mt-4"
          >
            <VExpansionPanels>
              <VExpansionPanel
                :title="t('importUserDialog.results.viewErrorDetails')"
                expand-icon="tabler-chevron-down"
              >
                <VExpansionPanelText>
                  <div
                    v-for="(error, index) in importResult.errors"
                    :key="index"
                    class="mb-2 pa-2"
                    style="background-color: rgba(var(--v-theme-error), 0.1); border-radius: 4px;"
                  >
                    <div class="text-caption">
                      <strong>{{ t('importUserDialog.results.row') }} {{ error.row }}:</strong> {{ error.error }}
                    </div>
                    <div
                      v-if="error.data"
                      class="text-caption text-medium-emphasis mt-1"
                    >
                      {{ t('importUserDialog.results.data') }}: {{ JSON.stringify(error.data) }}
                    </div>
                  </div>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </div>
        </VAlert>

        <!-- Parse Error Alert -->
        <VAlert
          v-if="parseError"
          color="error"
          variant="tonal"
          class="mb-6"
        >
          <VAlertTitle class="mb-2">
            {{ t('importUserDialog.errors.parseError') }}
          </VAlertTitle>
          <div class="text-body-2">
            {{ parseError }}
          </div>
        </VAlert>

        <!-- Preview Data Table -->
        <div v-if="showPreview && previewData.length > 0">
          <!-- Duplicates Warning -->
          <VAlert
            v-if="hasDuplicates"
            color="warning"
            variant="tonal"
            class="mb-4"
          >
            <VAlertTitle class="mb-2">
              <VIcon
                icon="tabler-alert-triangle"
                size="20"
                class="me-2"
              />
              {{ t('importUserDialog.duplicates.warning') }}
            </VAlertTitle>
            <div class="text-body-2">
              {{ t('importUserDialog.duplicates.message', { count: duplicateCount }) }}
            </div>
          </VAlert>

          <!-- Role Hierarchy Warning -->
          <VAlert
            v-if="hasRoleViolations"
            color="error"
            variant="tonal"
            class="mb-4"
          >
            <VAlertTitle class="mb-2">
              <VIcon
                icon="tabler-alert-triangle"
                size="20"
                class="me-2"
              />
              {{ t('importUserDialog.errors.roleHierarchyViolation') }}
            </VAlertTitle>
            <div class="text-body-2">
              {{ t('importUserDialog.errors.roleHierarchyMessage', { count: roleViolationCount, role: currentUserRole }) }}
            </div>
          </VAlert>

          <VCard
            variant="tonal"
            color="info"
            class="mb-4"
          >
            <VCardText>
              <div class="d-flex align-center gap-2">
                <VIcon
                  icon="tabler-info-circle"
                  size="20"
                />
                <div class="text-body-2">
                  <strong>{{ importableCount }}</strong> {{ importableCount === 1 ? t('common.user') : t('common.users') }} {{ t('importUserDialog.preview.willBeImported') }}.
                  <span v-if="hasDuplicates || hasRoleViolations" class="text-warning">
                    {{ t('importUserDialog.duplicates.skipped', { count: previewData.length - importableCount }) }}
                  </span>
                </div>
              </div>
            </VCardText>
          </VCard>

          <VCard class="mb-6">
            <VDataTable
              :headers="previewHeaders"
              :items="previewData"
              :items-per-page="10"
              class="text-no-wrap"
            >
              <!-- Status -->
              <template #item.status="{ item }">
                <VChip
                  v-if="shouldSkipRow(item)"
                  size="small"
                  :color="item._isRoleViolation ? 'error' : 'warning'"
                  variant="tonal"
                >
                  <VIcon
                    icon="tabler-copy-off"
                    size="14"
                    class="me-1"
                  />
                  {{ t('importUserDialog.duplicates.skipLabel') }}
                </VChip>
                <VChip
                  v-else
                  size="small"
                  color="success"
                  variant="tonal"
                >
                  <VIcon
                    icon="tabler-check"
                    size="14"
                    class="me-1"
                  />
                  {{ t('importUserDialog.duplicates.importLabel') }}
                </VChip>
              </template>

              <!-- Email -->
              <template #item.email="{ item }">
                <div
                  class="text-body-2 font-weight-medium"
                  :class="{ 'text-disabled': shouldSkipRow(item) }"
                >
                  {{ item.email }}
                  <VTooltip
                    v-if="shouldSkipRow(item)"
                    location="top"
                  >
                    <template #activator="{ props: tooltipProps }">
                      <VIcon
                        v-bind="tooltipProps"
                        icon="tabler-info-circle"
                        size="16"
                        :color="item._isRoleViolation ? 'error' : 'warning'"
                        class="ms-1"
                      />
                    </template>
                    <span>{{ getSkipReason(item) }}</span>
                  </VTooltip>
                </div>
              </template>

              <!-- Display Name -->
              <template #item.display_name="{ item }">
                <div
                  class="text-body-2"
                  :class="{ 'text-disabled': shouldSkipRow(item) }"
                >
                  {{ item.display_name }}
                </div>
              </template>

              <!-- Password (masked) -->
              <template #item.password="{ item }">
                <div
                  class="text-body-2 font-mono"
                  :class="{ 'text-disabled': shouldSkipRow(item) }"
                >
                  ••••••••
                </div>
              </template>

              <!-- Role -->
              <template #item.role="{ item }">
                <div class="d-flex align-center gap-1">
                  <VChip
                    size="small"
                    :color="shouldSkipRow(item) ? (item._isRoleViolation ? 'error' : 'secondary') : resolveRoleColor(item.role)"
                    variant="tonal"
                  >
                    <VIcon
                      v-if="item._isRoleViolation"
                      icon="tabler-alert-triangle"
                      size="14"
                      class="me-1"
                    />
                    {{ item.role }}
                  </VChip>
                </div>
              </template>

              <!-- Community ID -->
              <template #item.community_id="{ item }">
                <VChip
                  v-if="item.community_id"
                  size="small"
                  :color="shouldSkipRow(item) ? 'secondary' : 'primary'"
                  variant="tonal"
                >
                  {{ item.community_id }}
                </VChip>
                <span
                  v-else
                  class="text-disabled"
                >-</span>
              </template>

              <!-- Property ID -->
              <template #item.property_id="{ item }">
                <VChip
                  v-if="item.property_id"
                  size="small"
                  :color="shouldSkipRow(item) ? 'secondary' : 'success'"
                  variant="tonal"
                >
                  {{ item.property_id }}
                </VChip>
                <span
                  v-else
                  class="text-disabled"
                >-</span>
              </template>
            </VDataTable>
          </VCard>
        </div>

        <!-- File Upload Section (shown when not previewing) -->
        <div v-if="!showPreview && !showResults">
          <!-- Instructions -->
          <VCard
            variant="tonal"
            color="info"
            class="mb-6"
          >
            <VCardText>
              <div class="d-flex align-center gap-2 mb-2">
                <VIcon
                  icon="tabler-info-circle"
                  size="20"
                />
                <h6 class="text-h6">
                  {{ t('importUserDialog.instructions.title') }}
                </h6>
              </div>
              <ul class="text-body-2">
                <li>{{ t('importUserDialog.instructions.step1') }}</li>
                <li>{{ t('importUserDialog.instructions.step2') }}</li>
                <li>{{ t('importUserDialog.instructions.step3') }}</li>
                <li>{{ t('importUserDialog.instructions.step4') }}</li>
                <li>
                  {{ t('importUserDialog.instructions.step4Prefix') }}
                  <strong>{{ allowedRoles.join(', ') }}</strong>
                </li>
                <li>{{ t('importUserDialog.instructions.step5') }}</li>
              </ul>
            </VCardText>
          </VCard>

          <!-- Download Template Button -->
          <div class="mb-6 text-center">
            <VBtn
              color="secondary"
              variant="outlined"
              prepend-icon="tabler-download"
              @click="downloadTemplateFile"
            >
              {{ t('importUserDialog.buttons.downloadTemplate') }}
            </VBtn>
          </div>

          <!-- File Upload Area -->
          <div
            class="file-upload-area mb-6"
            :class="{ 'dragging': isDragging }"
            @drop.prevent="onDrop"
            @dragover.prevent="onDragOver"
            @dragleave="onDragLeave"
            @click="triggerFileInput"
          >
            <input
              ref="fileInput"
              type="file"
              accept=".csv"
              style="display: none"
              @change="onFileSelected"
            >

            <div
              v-if="!selectedFile"
              class="text-center pa-8"
            >
              <VIcon
                icon="tabler-cloud-upload"
                size="64"
                color="primary"
                class="mb-4"
              />
              <h6 class="text-h6 mb-2">
                {{ t('importUserDialog.upload.dropOrClick') }}
              </h6>
              <p class="text-body-2 text-medium-emphasis">
                {{ t('importUserDialog.upload.supportedFormat') }}
              </p>
            </div>

            <div
              v-else
              class="text-center pa-8"
            >
              <VIcon
                icon="tabler-file-text"
                size="64"
                color="success"
                class="mb-4"
              />
              <h6 class="text-h6 mb-2">
                {{ selectedFile.name }}
              </h6>
              <p class="text-body-2 text-medium-emphasis mb-4">
                {{ (selectedFile.size / 1024).toFixed(2) }} KB
              </p>
              <VBtn
                color="error"
                variant="outlined"
                size="small"
                prepend-icon="tabler-x"
                @click.stop="removeFile"
              >
                {{ t('importUserDialog.buttons.removeFile') }}
              </VBtn>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <VRow>
          <VCol
            cols="12"
            sm="6"
          >
            <VBtn
              color="secondary"
              variant="outlined"
              :disabled="isImporting"
              prepend-icon="tabler-x"
              size="large"
              block
              @click="showPreview ? cancelPreview() : closeDialog()"
            >
              {{ showPreview ? t('importUserDialog.buttons.back') : (showResults ? t('importUserDialog.buttons.close') : t('importUserDialog.buttons.cancel')) }}
            </VBtn>
          </VCol>
          <VCol
            cols="12"
            sm="6"
          >
            <!-- Preview Button (when file is selected but not previewing) -->
            <VBtn
              v-if="!showPreview && !showResults"
              color="primary"
              :disabled="!selectedFile"
              prepend-icon="tabler-eye"
              size="large"
              block
              @click="previewCSV"
            >
              {{ t('importUserDialog.buttons.previewData') }}
            </VBtn>

            <!-- Confirm Import Button (when previewing) -->
            <VBtn
              v-if="showPreview"
              color="success"
              :loading="isImporting"
              :disabled="isImporting || importableCount === 0"
              prepend-icon="tabler-check"
              size="large"
              block
              @click="confirmImport"
            >
              {{ isImporting ? t('importUserDialog.buttons.importing') : t('importUserDialog.buttons.confirmImport') }}
            </VBtn>

            <!-- Close Button (when showing results) -->
            <VBtn
              v-if="showResults"
              color="primary"
              prepend-icon="tabler-check"
              size="large"
              block
              @click="closeDialog"
            >
              {{ t('importUserDialog.buttons.done') }}
            </VBtn>
          </VCol>
        </VRow>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style scoped>
.file-upload-area {
  border: 2px dashed rgba(var(--v-theme-primary), 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: rgba(var(--v-theme-surface), 0.5);
}

.file-upload-area:hover {
  border-color: rgba(var(--v-theme-primary), 0.6);
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.file-upload-area.dragging {
  border-color: rgba(var(--v-theme-primary), 1);
  background-color: rgba(var(--v-theme-primary), 0.1);
  transform: scale(1.02);
}
</style>
