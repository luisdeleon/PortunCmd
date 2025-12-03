<script setup lang="ts">
import { usePropertyImport, type ImportResult, type PropertyImportRow } from '@/composables/usePropertyImport'

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

const { isImporting, parseCSV, checkDuplicates, importFromCSV, downloadTemplate } = usePropertyImport()

// Checking duplicates state
const isCheckingDuplicates = ref(false)

// File upload
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)

// Preview state
const showPreview = ref(false)
const previewData = ref<PropertyImportRow[]>([])
const parseError = ref<string | null>(null)

// Import results
const importResult = ref<ImportResult | null>(null)
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

    // Check for duplicates
    const parsedWithDuplicates = await checkDuplicates(parsed)

    previewData.value = parsedWithDuplicates
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
  return previewData.value.filter(p => p._isDuplicate).length
})

// Count importable items (non-duplicates)
const importableCount = computed(() => {
  return previewData.value.filter(p => !p._isDuplicate).length
})

// Check if there are any duplicates
const hasDuplicates = computed(() => duplicateCount.value > 0)

// Get duplicate reason text
const getDuplicateReasonText = (reason: string | undefined) => {
  switch (reason) {
    case 'id_exists':
      return t('importPropertyDialog.duplicates.idExists')
    case 'name_community_exists':
      return t('importPropertyDialog.duplicates.nameCommunityExists')
    case 'duplicate_in_file':
      return t('importPropertyDialog.duplicates.duplicateInFile')
    default:
      return t('importPropertyDialog.duplicates.duplicate')
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

    // Import properties
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

// Data table headers for preview
const previewHeaders = computed(() => [
  { title: t('importPropertyDialog.table.status'), key: 'status', width: '120px' },
  { title: t('importPropertyDialog.table.propertyId'), key: 'id', width: '150px' },
  { title: t('importPropertyDialog.table.name'), key: 'name', width: '200px' },
  { title: t('importPropertyDialog.table.address'), key: 'address', width: '300px' },
  { title: t('importPropertyDialog.table.communityId'), key: 'community_id', width: '150px' },
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
            {{ showPreview ? t('importPropertyDialog.previewTitle') : t('importPropertyDialog.title') }}
          </h4>
          <p class="text-body-1 text-medium-emphasis">
            {{ showPreview ? t('importPropertyDialog.previewSubtitle') : t('importPropertyDialog.subtitle') }}
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
            {{ importResult.success ? t('importPropertyDialog.results.success') : t('importPropertyDialog.results.withErrors') }}
          </VAlertTitle>

          <div class="text-body-2">
            <div class="mb-2">
              <strong>{{ t('importPropertyDialog.results.totalRows') }}:</strong> {{ importResult.totalRows }}
            </div>
            <div class="mb-2">
              <strong>{{ t('importPropertyDialog.results.successfullyImported') }}:</strong> {{ importResult.successCount }}
            </div>
            <div
              v-if="importResult.errorCount > 0"
              class="mb-2"
            >
              <strong>{{ t('importPropertyDialog.results.failed') }}:</strong> {{ importResult.errorCount }}
            </div>
            <div
              v-if="importResult.skippedCount > 0"
              class="mb-2"
            >
              <strong>{{ t('importPropertyDialog.results.skipped') }}:</strong> {{ importResult.skippedCount }}
            </div>
          </div>

          <!-- Error Details -->
          <div
            v-if="importResult.errors.length > 0"
            class="mt-4"
          >
            <VExpansionPanels>
              <VExpansionPanel
                :title="t('importPropertyDialog.results.viewErrorDetails')"
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
                      <strong>{{ t('importPropertyDialog.results.row') }} {{ error.row }}:</strong> {{ error.error }}
                    </div>
                    <div
                      v-if="error.data"
                      class="text-caption text-medium-emphasis mt-1"
                    >
                      {{ t('importPropertyDialog.results.data') }}: {{ JSON.stringify(error.data) }}
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
            {{ t('importPropertyDialog.errors.parseError') }}
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
              {{ t('importPropertyDialog.duplicates.warning') }}
            </VAlertTitle>
            <div class="text-body-2">
              {{ t('importPropertyDialog.duplicates.message', { count: duplicateCount }) }}
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
                  <strong>{{ importableCount }}</strong> {{ importableCount === 1 ? t('common.property') : t('common.properties') }} {{ t('importPropertyDialog.preview.willBeImported') }}.
                  <span v-if="hasDuplicates" class="text-warning">
                    {{ t('importPropertyDialog.duplicates.skipped', { count: duplicateCount }) }}
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
                  v-if="item._isDuplicate"
                  size="small"
                  color="warning"
                  variant="tonal"
                >
                  <VIcon
                    icon="tabler-copy-off"
                    size="14"
                    class="me-1"
                  />
                  {{ t('importPropertyDialog.duplicates.skipLabel') }}
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
                  {{ t('importPropertyDialog.duplicates.importLabel') }}
                </VChip>
              </template>

              <!-- Property ID -->
              <template #item.id="{ item }">
                <div
                  class="text-body-2"
                  :class="{ 'text-disabled': item._isDuplicate }"
                >
                  <VChip
                    v-if="item.id"
                    size="small"
                    :color="item._isDuplicate ? 'secondary' : 'primary'"
                    variant="tonal"
                  >
                    {{ item.id }}
                  </VChip>
                  <VChip
                    v-else-if="item._generatedId"
                    size="small"
                    :color="item._isDuplicate ? 'secondary' : 'info'"
                    variant="tonal"
                  >
                    <VIcon
                      icon="tabler-sparkles"
                      size="12"
                      class="me-1"
                    />
                    {{ item._generatedId }}
                  </VChip>
                  <VChip
                    v-else
                    size="small"
                    color="secondary"
                    variant="tonal"
                  >
                    {{ t('importPropertyDialog.table.autoGenerated') }}
                  </VChip>
                </div>
              </template>

              <!-- Name -->
              <template #item.name="{ item }">
                <div
                  class="text-body-2 font-weight-medium"
                  :class="{ 'text-disabled': item._isDuplicate }"
                >
                  {{ item.name }}
                  <VTooltip
                    v-if="item._isDuplicate"
                    location="top"
                  >
                    <template #activator="{ props: tooltipProps }">
                      <VIcon
                        v-bind="tooltipProps"
                        icon="tabler-info-circle"
                        size="16"
                        color="warning"
                        class="ms-1"
                      />
                    </template>
                    <span>{{ getDuplicateReasonText(item._duplicateReason) }}</span>
                  </VTooltip>
                </div>
              </template>

              <!-- Address -->
              <template #item.address="{ item }">
                <div
                  class="text-body-2"
                  :class="{ 'text-disabled': item._isDuplicate }"
                >
                  {{ item.address }}
                </div>
              </template>

              <!-- Community ID -->
              <template #item.community_id="{ item }">
                <div class="text-body-2">
                  <VChip
                    size="small"
                    :color="item._isDuplicate ? 'secondary' : 'success'"
                    variant="tonal"
                  >
                    {{ item.community_id }}
                  </VChip>
                </div>
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
                  {{ t('importPropertyDialog.instructions.title') }}
                </h6>
              </div>
              <ul class="text-body-2">
                <li>{{ t('importPropertyDialog.instructions.step1') }}</li>
                <li>{{ t('importPropertyDialog.instructions.step2') }}</li>
                <li>{{ t('importPropertyDialog.instructions.step3') }}</li>
                <li>{{ t('importPropertyDialog.instructions.step4') }}</li>
                <li>{{ t('importPropertyDialog.instructions.step5') }}</li>
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
              {{ t('importPropertyDialog.buttons.downloadTemplate') }}
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
                {{ t('importPropertyDialog.upload.dropOrClick') }}
              </h6>
              <p class="text-body-2 text-medium-emphasis">
                {{ t('importPropertyDialog.upload.supportedFormat') }}
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
                {{ t('importPropertyDialog.buttons.removeFile') }}
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
              {{ showPreview ? t('importPropertyDialog.buttons.back') : (showResults ? t('importPropertyDialog.buttons.close') : t('importPropertyDialog.buttons.cancel')) }}
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
              {{ t('importPropertyDialog.buttons.previewData') }}
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
              {{ isImporting ? t('importPropertyDialog.buttons.importing') : t('importPropertyDialog.buttons.confirmImport') }}
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
              {{ t('importPropertyDialog.buttons.done') }}
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
