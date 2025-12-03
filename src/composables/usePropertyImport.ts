import { supabase } from '@/lib/supabase'

export interface PropertyImportRow {
  id?: string
  name: string
  address: string
  community_id: string
  _isDuplicate?: boolean
  _duplicateReason?: string
  _rowNumber?: number
}

export interface ImportResult {
  success: boolean
  totalRows: number
  successCount: number
  errorCount: number
  skippedCount: number
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
        property._rowNumber = i + 1 // Store row number for display
        properties.push(property)
      } else {
        console.warn(`Row ${i + 1} is missing required fields, skipping`)
      }
    }

    return properties
  }

  /**
   * Check for duplicates against existing database records
   */
  const checkDuplicates = async (properties: PropertyImportRow[]): Promise<PropertyImportRow[]> => {
    // Get all property IDs and names+community combinations to check
    const idsToCheck = properties.filter(p => p.id).map(p => p.id!)
    const nameCommunityPairs = properties.map(p => ({ name: p.name, community_id: p.community_id }))

    // Fetch existing properties by ID
    let existingByIds: Set<string> = new Set()
    if (idsToCheck.length > 0) {
      const { data: existingById } = await supabase
        .from('property')
        .select('id')
        .in('id', idsToCheck)

      if (existingById) {
        existingByIds = new Set(existingById.map(p => p.id))
      }
    }

    // Fetch existing properties by name+community combination
    const communityIds = [...new Set(properties.map(p => p.community_id))]
    const { data: existingByCommunity } = await supabase
      .from('property')
      .select('id, name, community_id')
      .in('community_id', communityIds)

    const existingNameCommunity = new Set(
      (existingByCommunity || []).map(p => `${p.name.toLowerCase()}|${p.community_id}`)
    )

    // Also check for duplicates within the CSV file itself
    const seenInFile = new Map<string, number>() // key -> first row number

    // Mark duplicates
    return properties.map(property => {
      const nameCommunityKey = `${property.name.toLowerCase()}|${property.community_id}`

      // Check if ID already exists in database
      if (property.id && existingByIds.has(property.id)) {
        return {
          ...property,
          _isDuplicate: true,
          _duplicateReason: 'id_exists',
        }
      }

      // Check if name+community already exists in database
      if (existingNameCommunity.has(nameCommunityKey)) {
        return {
          ...property,
          _isDuplicate: true,
          _duplicateReason: 'name_community_exists',
        }
      }

      // Check for duplicate within the CSV file
      if (seenInFile.has(nameCommunityKey)) {
        return {
          ...property,
          _isDuplicate: true,
          _duplicateReason: 'duplicate_in_file',
        }
      }

      // Mark as seen in file
      seenInFile.set(nameCommunityKey, property._rowNumber || 0)

      return property
    })
  }

  /**
   * Import properties from CSV content (skips duplicates)
   */
  const importFromCSV = async (csvContent: string): Promise<ImportResult> => {
    try {
      isImporting.value = true

      // Parse CSV
      const properties = parseCSV(csvContent)

      if (properties.length === 0) {
        throw new Error('No valid properties found in CSV file')
      }

      // Check for duplicates
      const propertiesWithDuplicates = await checkDuplicates(properties)

      const result: ImportResult = {
        success: false,
        totalRows: properties.length,
        successCount: 0,
        errorCount: 0,
        skippedCount: 0,
        errors: [],
      }

      // Import each property (skip duplicates)
      for (let i = 0; i < propertiesWithDuplicates.length; i++) {
        const property = propertiesWithDuplicates[i]

        // Skip duplicates
        if (property._isDuplicate) {
          result.skippedCount++
          continue
        }

        try {
          // Generate ID if not provided
          const propertyId = property.id || crypto.randomUUID()

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

          result.successCount++
        } catch (err: any) {
          result.errorCount++
          result.errors.push({
            row: property._rowNumber || (i + 2),
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
    checkDuplicates,
    importFromCSV,
    downloadTemplate,
  }
}
