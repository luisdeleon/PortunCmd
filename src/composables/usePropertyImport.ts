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
   * Generate random uppercase characters
   */
  const generateRandomChars = (length: number): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Ensure community ID is exactly 4 characters (pad with random if shorter)
   */
  const normalizeCommunityId = (communityId: string): string => {
    const normalized = communityId.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (normalized.length >= 4) {
      return normalized.slice(0, 4)
    }
    // Pad with random characters to reach 4
    return normalized + generateRandomChars(4 - normalized.length)
  }

  /**
   * Ensure property code is exactly 3 characters (pad or truncate as needed)
   */
  const normalizePropertyCode = (code: string): string => {
    const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (normalized.length === 3) {
      return normalized
    }
    if (normalized.length > 3) {
      // Truncate to 3 characters
      return normalized.slice(0, 3)
    }
    // Pad with random characters to reach 3
    return normalized + generateRandomChars(3 - normalized.length)
  }

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
   * Generate property ID: CommunityID (4 chars) - PropertyCode (min 3 chars)
   */
  const generatePropertyId = (communityId: string, propertyName: string): string => {
    if (!communityId) return ''

    const normalizedCommunity = normalizeCommunityId(communityId)
    let code = generateCodeFromName(propertyName)

    // If no code generated from name, create random 3-char code
    if (!code) {
      code = generateRandomChars(3)
    }

    // Ensure code is at least 3 characters
    code = normalizePropertyCode(code)

    return `${normalizedCommunity}-${code}`
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

        // Normalize community_id to 4 uppercase characters
        property.community_id = normalizeCommunityId(property.community_id)

        // If user provided an ID, normalize it
        if (property.id) {
          let normalizedId = property.id.toUpperCase().replace(/[^A-Z0-9-]/g, '')
          const communityPrefix = `${property.community_id}-`

          // Check if ID already has community prefix
          if (normalizedId.startsWith(communityPrefix)) {
            // Extract the property code part and ensure it's at least 3 chars
            const codePart = normalizedId.slice(communityPrefix.length)
            property.id = `${communityPrefix}${normalizePropertyCode(codePart)}`
          } else if (normalizedId.includes('-')) {
            // Has a different prefix, replace with correct community prefix
            const codePart = normalizedId.split('-').pop() || ''
            property.id = `${communityPrefix}${normalizePropertyCode(codePart)}`
          } else {
            // No prefix, add community prefix and ensure code is at least 3 chars
            property.id = `${communityPrefix}${normalizePropertyCode(normalizedId)}`
          }
        }

        properties.push(property)
      } else {
        console.warn(`Row ${i + 1} is missing required fields, skipping`)
      }
    }

    return properties
  }

  /**
   * Generate a unique property ID by appending random chars if base ID exists
   */
  const generateUniquePropertyId = (
    communityId: string,
    baseCode: string,
    existingIds: Set<string>,
    usedInBatch: Set<string>
  ): string => {
    const normalizedCommunity = normalizeCommunityId(communityId)
    let code = normalizePropertyCode(baseCode)
    let fullId = `${normalizedCommunity}-${code}`

    // If ID is available, use it
    if (!existingIds.has(fullId) && !usedInBatch.has(fullId)) {
      return fullId
    }

    // ID exists, try with different random suffixes (up to 10 attempts)
    for (let i = 0; i < 10; i++) {
      code = generateRandomChars(3)
      fullId = `${normalizedCommunity}-${code}`
      if (!existingIds.has(fullId) && !usedInBatch.has(fullId)) {
        return fullId
      }
    }

    // Fallback: use longer random code
    code = generateRandomChars(4)
    return `${normalizedCommunity}-${code}`
  }

  /**
   * Check for duplicates against existing database records
   */
  const checkDuplicates = async (properties: PropertyImportRow[]): Promise<PropertyImportRow[]> => {
    // Fetch all existing property IDs for the communities we're importing to
    const communityIds = [...new Set(properties.map(p => p.community_id))]

    // Fetch all existing properties in these communities
    const { data: existingProperties } = await supabase
      .from('property')
      .select('id, name, community_id')
      .in('community_id', communityIds)

    const existingByIds = new Set((existingProperties || []).map(p => p.id))
    const existingNameCommunity = new Set(
      (existingProperties || []).map(p => `${p.name.toLowerCase()}|${p.community_id}`)
    )

    // Track IDs used within this batch to avoid collisions
    const usedInBatch = new Set<string>()
    const seenInFile = new Map<string, number>() // name+community -> first row number

    // Process each property and generate unique IDs
    const results: PropertyImportRow[] = []

    for (const property of properties) {
      const nameCommunityKey = `${property.name.toLowerCase()}|${property.community_id}`

      // Check if name+community already exists in database
      if (existingNameCommunity.has(nameCommunityKey)) {
        results.push({
          ...property,
          _isDuplicate: true,
          _duplicateReason: 'name_community_exists',
        })
        continue
      }

      // Check for duplicate within the CSV file by name+community
      if (seenInFile.has(nameCommunityKey)) {
        results.push({
          ...property,
          _isDuplicate: true,
          _duplicateReason: 'duplicate_in_file',
        })
        continue
      }

      // Generate or validate the property ID
      let finalId: string

      if (property.id) {
        // User provided an ID - check if it's available
        if (existingByIds.has(property.id) || usedInBatch.has(property.id)) {
          // ID taken, generate a new unique one based on the provided code
          const codePart = property.id.includes('-')
            ? property.id.split('-').pop() || ''
            : property.id
          finalId = generateUniquePropertyId(property.community_id, codePart, existingByIds, usedInBatch)
        } else {
          finalId = property.id
        }
      } else {
        // No ID provided - generate from name
        const baseCode = generateCodeFromName(property.name) || generateRandomChars(3)
        finalId = generateUniquePropertyId(property.community_id, baseCode, existingByIds, usedInBatch)
      }

      // Mark as seen
      seenInFile.set(nameCommunityKey, property._rowNumber || 0)
      usedInBatch.add(finalId)

      results.push({
        ...property,
        _generatedId: finalId,
      })
    }

    return results
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
