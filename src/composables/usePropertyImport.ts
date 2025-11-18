import { supabase } from '@/lib/supabase'

export interface PropertyImportRow {
  id?: string
  name: string
  address: string
  community_id: string
}

export interface ImportResult {
  success: boolean
  totalRows: number
  successCount: number
  errorCount: number
  errors: Array<{ row: number; data: any; error: string }>
}

export const usePropertyImport = () => {
  const isImporting = ref(false)

  /**
   * Parse CSV file content
   */
  const parseCSV = (content: string): PropertyImportRow[] => {
    const lines = content.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row')
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim())

    // Validate required columns
    const requiredColumns = ['name', 'address', 'community_id']
    const missingColumns = requiredColumns.filter(col => !header.includes(col))

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
    }

    // Parse data rows
    const properties: PropertyImportRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())

      if (values.length !== header.length) {
        console.warn(`Row ${i + 1} has incorrect number of columns, skipping`)
        continue
      }

      const property: any = {}

      header.forEach((col, index) => {
        const value = values[index]

        // Only set value if it's not empty
        if (value) {
          property[col] = value
        }
      })

      // Validate that required fields are present
      if (property.name && property.address && property.community_id) {
        properties.push(property)
      } else {
        console.warn(`Row ${i + 1} is missing required fields, skipping`)
      }
    }

    return properties
  }

  /**
   * Import properties from CSV content
   */
  const importFromCSV = async (csvContent: string): Promise<ImportResult> => {
    try {
      isImporting.value = true

      // Parse CSV
      const properties = parseCSV(csvContent)

      if (properties.length === 0) {
        throw new Error('No valid properties found in CSV file')
      }

      const result: ImportResult = {
        success: false,
        totalRows: properties.length,
        successCount: 0,
        errorCount: 0,
        errors: [],
      }

      // Import each property
      for (let i = 0; i < properties.length; i++) {
        const property = properties[i]

        try {
          // Generate ID if not provided
          const propertyId = property.id || crypto.randomUUID()

          // Check if property already exists
          const { data: existing, error: checkError } = await supabase
            .from('property')
            .select('id')
            .eq('id', propertyId)
            .single()

          if (checkError && checkError.code !== 'PGRST116') {
            throw checkError
          }

          if (existing) {
            // Update existing property
            const { error: updateError } = await supabase
              .from('property')
              .update({
                name: property.name,
                address: property.address,
                community_id: property.community_id,
              })
              .eq('id', propertyId)

            if (updateError) throw updateError
          } else {
            // Insert new property
            const { error: insertError } = await supabase
              .from('property')
              .insert({
                id: propertyId,
                name: property.name,
                address: property.address,
                community_id: property.community_id,
              })

            if (insertError) throw insertError
          }

          result.successCount++
        } catch (err: any) {
          result.errorCount++
          result.errors.push({
            row: i + 2, // +2 because of header and 0-index
            data: property,
            error: err.message || 'Unknown error',
          })
        }
      }

      result.success = result.errorCount === 0

      return result
    } catch (err: any) {
      throw new Error(`Import failed: ${err.message}`)
    } finally {
      isImporting.value = false
    }
  }

  /**
   * Download CSV template
   */
  const downloadTemplate = () => {
    const link = document.createElement('a')
    link.href = '/templates/property-import-template.csv'
    link.download = 'property-import-template.csv'
    link.click()
  }

  return {
    isImporting,
    parseCSV,
    importFromCSV,
    downloadTemplate,
  }
}
