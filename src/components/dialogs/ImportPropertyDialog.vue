<script setup lang="ts">
import { usePropertyImport, type ImportResult, type PropertyImportRow } from '@/composables/usePropertyImport'

interface Props {
  isDialogVisible: boolean
}

interface Emit {
  (e: 'update:isDialogVisible', value: boolean): void
  (e: 'import-completed'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const { isImporting, parseCSV, importFromCSV, downloadTemplate } = usePropertyImport()

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

// Preview the CSV data
const previewCSV = async () => {
  if (!selectedFile.value) return

  try {
    parseError.value = null

    // Read file content
    const content = await selectedFile.value.text()

    // Parse CSV
    const parsed = parseCSV(content)

    previewData.value = parsed
    showPreview.value = true
  } catch (err: any) {
    parseError.value = err.message
    showPreview.value = false
    previewData.value = []
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
const previewHeaders = [
  { title: 'Property ID', key: 'id', width: '150px' },
  { title: 'Name', key: 'name', width: '200px' },
  { title: 'Address', key: 'address', width: '300px' },
  { title: 'Community ID', key: 'community_id', width: '150px' },
]
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
            {{ showPreview ? 'Preview Import Data' : 'Import Properties' }}
          </h4>
          <p class="text-body-1 text-medium-emphasis">
            {{ showPreview ? 'Review the data before importing' : 'Upload a CSV file to bulk import properties' }}
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
            {{ importResult.success ? 'Import Completed Successfully' : 'Import Completed with Errors' }}
          </VAlertTitle>

          <div class="text-body-2">
            <div class="mb-2">
              <strong>Total rows:</strong> {{ importResult.totalRows }}
            </div>
            <div class="mb-2">
              <strong>Successfully imported:</strong> {{ importResult.successCount }}
            </div>
            <div
              v-if="importResult.errorCount > 0"
              class="mb-2"
            >
              <strong>Failed:</strong> {{ importResult.errorCount }}
            </div>
          </div>

          <!-- Error Details -->
          <div
            v-if="importResult.errors.length > 0"
            class="mt-4"
          >
            <VExpansionPanels>
              <VExpansionPanel
                title="View Error Details"
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
                      <strong>Row {{ error.row }}:</strong> {{ error.error }}
                    </div>
                    <div
                      v-if="error.data"
                      class="text-caption text-medium-emphasis mt-1"
                    >
                      Data: {{ JSON.stringify(error.data) }}
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
            Failed to Parse CSV
          </VAlertTitle>
          <div class="text-body-2">
            {{ parseError }}
          </div>
        </VAlert>

        <!-- Preview Data Table -->
        <div v-if="showPreview && previewData.length > 0">
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
                  <strong>{{ previewData.length }}</strong> {{ previewData.length === 1 ? 'property' : 'properties' }} will be imported.
                  Review the data below and click <strong>"Confirm Import"</strong> to proceed.
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
              <!-- Property ID -->
              <template #item.id="{ item }">
                <div class="text-body-2">
                  <VChip
                    v-if="item.id"
                    size="small"
                    color="primary"
                    variant="tonal"
                  >
                    {{ item.id }}
                  </VChip>
                  <VChip
                    v-else
                    size="small"
                    color="secondary"
                    variant="tonal"
                  >
                    Auto-generated
                  </VChip>
                </div>
              </template>

              <!-- Name -->
              <template #item.name="{ item }">
                <div class="text-body-2 font-weight-medium">
                  {{ item.name }}
                </div>
              </template>

              <!-- Address -->
              <template #item.address="{ item }">
                <div class="text-body-2">
                  {{ item.address }}
                </div>
              </template>

              <!-- Community ID -->
              <template #item.community_id="{ item }">
                <div class="text-body-2">
                  <VChip
                    size="small"
                    color="success"
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
                  Instructions
                </h6>
              </div>
              <ul class="text-body-2">
                <li>Download the CSV template to see the required format</li>
                <li>Fill in the property details (ID is optional)</li>
                <li>Required columns: name, address, community_id</li>
                <li>Save the file and upload it below</li>
                <li>Existing properties (by ID) will be updated, new ones will be created</li>
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
              Download CSV Template
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
                Drop CSV file here or click to browse
              </h6>
              <p class="text-body-2 text-medium-emphasis">
                Supported format: .csv
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
                Remove File
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
              {{ showPreview ? 'Back' : (showResults ? 'Close' : 'Cancel') }}
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
              Preview Data
            </VBtn>

            <!-- Confirm Import Button (when previewing) -->
            <VBtn
              v-if="showPreview"
              color="success"
              :loading="isImporting"
              :disabled="isImporting || previewData.length === 0"
              prepend-icon="tabler-check"
              size="large"
              block
              @click="confirmImport"
            >
              {{ isImporting ? 'Importing...' : 'Confirm Import' }}
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
              Done
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
