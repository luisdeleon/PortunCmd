import { supabase } from '@/lib/supabase'

export interface PropertyImportRow {
  id?: string
  name: string
  address: string
  community_id: string
  _isDuplicate?: boolean
  _duplicateReason?: string
  _rowNumber?: number
  _generatedId?: string
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
   * Generate a 3-character code from property name (same logic as AddEditPropertyDialog)
   */
  const generateCodeFromName = (name: string | null | undefined): string => {
    if (!name || !name.trim()) return ''

    // Remove special characters, accents, and normalize
    const cleanName = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Keep only letters, numbers and spaces
      .trim()

    // Check if it starts with numbers (like "101", "25A")
    const numberMatch = cleanName.match(/^(\d+)/)
    if (numberMatch) {
      // Pad number to 3 digits or take first 3 chars if longer
      const num = numberMatch[1]
      if (num.length >= 3) return num.slice(0, 3)
      return num.padStart(3, '0')
    }

    const words = cleanName.split(/\s+/).filter(w => w.length > 0)

    if (words.length === 0) return ''

    let letters = ''

    if (words.length === 1) {
      // Single word: take first 3 characters
      letters = words[0].slice(0, 3)
    } else if (words.length === 2) {
      // Two words: take first 2 chars from first, first 1 from second
      letters = words[0].slice(0, 2) + words[1].slice(0, 1)
    } else {
      // Three or more words: take first character from each of first 3 words
      letters = words.slice(0, 3).map(w => w[0]).join('')
    }

    // Pad with additional letters if less than 3
    while (letters.length < 3) {
      for (const word of words) {
        if (letters.length >= 3) break
        for (let i = 0; i < word.length && letters.length < 3; i++) {
          if (!letters.includes(word[i]) || letters.length < 3) {
            letters += word[i]
          }
        }
      }
      if (letters.length < 3) letters += 'X'
    }

    return letters.slice(0, 3)
  }

  /**
   * Generate property ID: CommunityID-PropertyCode
   */
  const generatePropertyId = (communityId: string, propertyName: string): string => {
    const code = generateCodeFromName(propertyName)
    if (!communityId || !code) return ''
    return `${communityId.toUpperCase()}-${code}`
  }

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

        // Ensure community_id is uppercase
        property.community_id = property.community_id.toUpperCase()

        // If user provided an ID, normalize it (uppercase, add community prefix if missing)
        if (property.id) {
          let normalizedId = property.id.toUpperCase()
          const communityPrefix = `${property.community_id}-`

          // Add community prefix if not present
          if (!normalizedId.startsWith(communityPrefix)) {
            normalizedId = `${communityPrefix}${normalizedId}`
          }
          property.id = normalizedId
        }

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
    // Generate IDs for properties that don't have one (for preview and duplicate checking)
    const propertiesWithGeneratedIds = properties.map(p => ({
      ...p,
      _generatedId: p.id || generatePropertyId(p.community_id, p.name),
    }))

    // Get all property IDs to check (both provided and generated)
    const allIdsToCheck = propertiesWithGeneratedIds
      .map(p => p.id || p._generatedId)
      .filter((id): id is string => !!id)

    // Fetch existing properties by ID
    let existingByIds: Set<string> = new Set()
    if (allIdsToCheck.length > 0) {
      const { data: existingById } = await supabase
        .from('property')
        .select('id')
        .in('id', allIdsToCheck)

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
    const seenIdsInFile = new Map<string, number>() // generated id -> first row number

    // Mark duplicates
    return propertiesWithGeneratedIds.map(property => {
      const nameCommunityKey = `${property.name.toLowerCase()}|${property.community_id}`
      const effectiveId = property.id || property._generatedId

      // Check if provided ID already exists in database
      if (property.id && existingByIds.has(property.id)) {
        return {
          ...property,
          _isDuplicate: true,
          _duplicateReason: 'id_exists',
        }
      }

      // Check if generated ID already exists in database (only if no ID was provided)
      if (!property.id && property._generatedId && existingByIds.has(property._generatedId)) {
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

      // Check for duplicate within the CSV file by name+community
      if (seenInFile.has(nameCommunityKey)) {
        return {
          ...property,
          _isDuplicate: true,
          _duplicateReason: 'duplicate_in_file',
        }
      }

      // Check for duplicate generated ID within the CSV file
      if (effectiveId && seenIdsInFile.has(effectiveId)) {
        return {
          ...property,
          _isDuplicate: true,
          _duplicateReason: 'duplicate_in_file',
        }
      }

      // Mark as seen in file
      seenInFile.set(nameCommunityKey, property._rowNumber || 0)
      if (effectiveId) {
        seenIdsInFile.set(effectiveId, property._rowNumber || 0)
      }

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
          // Use the generated ID or provided ID
          const propertyId = property.id || property._generatedId || crypto.randomUUID()

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
