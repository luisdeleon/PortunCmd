import { supabase } from '@/lib/supabase'

export interface UserImportRow {
  email: string
  display_name: string
  password: string
  role: string
  community_id?: string
  property_id?: string
  _isDuplicate?: boolean
  _duplicateReason?: string
  _isRoleViolation?: boolean
  _isInvalidCommunity?: boolean
  _isInvalidProperty?: boolean
  _isUnauthorizedCommunity?: boolean
  _rowNumber?: number
}

export interface UserImportResult {
  success: boolean
  totalRows: number
  successCount: number
  errorCount: number
  skippedCount: number
  errors: Array<{ row: number; data: any; error: string }>
}

// Role name to UUID mapping (from database)
const ROLE_MAP: Record<string, string> = {
  'Super Admin': '1962f3d8-5262-4439-b16c-75737319d66a',
  'Mega Dealer': 'b383124f-fdeb-4d01-a832-b111e3ef62bc',
  'Dealer': '1eda8477-f77c-4a98-a4b8-fa9554388171',
  'Administrator': '0ca403f1-b484-4d7e-8a33-7e43b2f4ab6c',
  'Guard': '1ef97e95-bb81-4573-a068-69fcd22e2a80',
  'Client': 'client', // TODO: Add Client role UUID when available
  'Resident': 'f66505ff-6b8b-4484-9257-d2b8332c3f3c',
}

// Role hierarchy - lower number = higher rank (more privileges)
const ROLE_HIERARCHY: Record<string, number> = {
  'Super Admin': 1,
  'Mega Dealer': 2,
  'Dealer': 3,
  'Administrator': 4,
  'Guard': 5,
  'Client': 5,
  'Resident': 6,
}

export const useUserImport = () => {
  const isImporting = ref(false)

  // Get current user's role from cookie (useCookie auto-parses the JSON)
  const userData = useCookie<any>('userData')

  const getCurrentUserRole = (): string => {
    return userData.value?.role || 'Resident'
  }

  const getCurrentUserRoleRank = (): number => {
    const role = getCurrentUserRole()
    return ROLE_HIERARCHY[role] || 999
  }

  /**
   * Check if current user can create a user with the specified role
   * Returns true if allowed, false if the target role is higher than current user
   */
  const canCreateRole = (targetRole: string): boolean => {
    const currentRank = getCurrentUserRoleRank()
    const targetRank = ROLE_HIERARCHY[targetRole] || 999

    // Can only create users with equal or lower rank (higher number)
    return targetRank >= currentRank
  }

  /**
   * Get list of roles the current user is allowed to import
   */
  const getAllowedRoles = (): string[] => {
    const currentRank = getCurrentUserRoleRank()
    return Object.entries(ROLE_HIERARCHY)
      .filter(([_, rank]) => rank >= currentRank)
      .map(([role]) => role)
  }

  /**
   * Parse CSV file content
   */
  const parseCSV = (content: string): UserImportRow[] => {
    const lines = content.split('\n').filter(line => line.trim())

    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row')
    }

    // Parse header
    const header = lines[0].split(',').map(h => h.trim().toLowerCase())

    // Validate required columns
    const requiredColumns = ['email', 'display_name', 'password', 'role']
    const missingColumns = requiredColumns.filter(col => !header.includes(col))

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`)
    }

    // Parse data rows
    const users: UserImportRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])

      if (values.length !== header.length) {
        console.warn(`Row ${i + 1} has incorrect number of columns, skipping`)
        continue
      }

      const user: any = {}

      header.forEach((col, index) => {
        const value = values[index]?.trim()

        // Only set value if it's not empty
        if (value) {
          user[col] = value
        }
      })

      // Validate that required fields are present
      if (user.email && user.display_name && user.password && user.role) {
        users.push({
          email: user.email,
          display_name: user.display_name,
          password: user.password,
          role: user.role,
          community_id: user.community_id || undefined,
          property_id: user.property_id || undefined,
          _rowNumber: i + 1,
        })
      } else {
        console.warn(`Row ${i + 1} is missing required fields, skipping`)
      }
    }

    return users
  }

  /**
   * Check for duplicates against existing database records, role violations, and invalid IDs
   */
  const checkDuplicates = async (users: UserImportRow[]): Promise<UserImportRow[]> => {
    // Get all emails to check
    const emailsToCheck = users.map(u => u.email.toLowerCase())

    // Fetch existing users by email
    const { data: existingUsers } = await supabase
      .from('profile')
      .select('email')
      .in('email', emailsToCheck)

    const existingEmails = new Set(
      (existingUsers || []).map(u => u.email.toLowerCase())
    )

    // Get all unique community IDs from the CSV
    const communityIdsToCheck = [...new Set(users.map(u => u.community_id).filter(Boolean))] as string[]

    // Fetch existing communities
    let validCommunityIds = new Set<string>()
    if (communityIdsToCheck.length > 0) {
      const { data: existingCommunities } = await supabase
        .from('community')
        .select('id')
        .in('id', communityIdsToCheck)

      validCommunityIds = new Set((existingCommunities || []).map(c => c.id))
    }

    // Get current user's authorized communities (for Mega Dealer, Dealer, Administrator)
    let authorizedCommunityIds = new Set<string>()
    const currentRole = getCurrentUserRole()
    const isSuperAdmin = currentRole === 'Super Admin'

    if (!isSuperAdmin) {
      // Get current user's profile_role to check their scope_community_ids
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData?.session?.user?.id) {
        const { data: profileRole } = await supabase
          .from('profile_role')
          .select('scope_type, scope_community_ids')
          .eq('profile_id', sessionData.session.user.id)
          .single()

        if (profileRole) {
          // If global scope, user can access all communities
          if (profileRole.scope_type === 'global') {
            // Mark all valid communities as authorized
            authorizedCommunityIds = new Set(validCommunityIds)
          } else if (profileRole.scope_community_ids && profileRole.scope_community_ids.length > 0) {
            // User can only access their assigned communities
            authorizedCommunityIds = new Set(profileRole.scope_community_ids)
          }
        }
      }
    } else {
      // Super Admin can access all communities
      authorizedCommunityIds = new Set(validCommunityIds)
    }

    // Get all unique property IDs from the CSV (both as-is and with community prefix)
    const propertyIdsToCheck = [...new Set(users.map(u => u.property_id).filter(Boolean))] as string[]

    // Also generate prefixed versions for property IDs
    const allPropertyIdsToCheck = new Set<string>()
    propertyIdsToCheck.forEach(pid => {
      allPropertyIdsToCheck.add(pid)
      // Also add prefixed versions with each community
      communityIdsToCheck.forEach(cid => {
        allPropertyIdsToCheck.add(`${cid}-${pid}`)
      })
    })

    // Fetch existing properties
    let validPropertyIds = new Set<string>()
    if (allPropertyIdsToCheck.size > 0) {
      const { data: existingProperties } = await supabase
        .from('property')
        .select('id')
        .in('id', [...allPropertyIdsToCheck])

      validPropertyIds = new Set((existingProperties || []).map(p => p.id))
    }

    // Check for duplicates within the CSV file itself
    const seenInFile = new Map<string, number>() // email -> first row number

    // Mark duplicates, role violations, and invalid IDs
    return users.map(user => {
      const emailKey = user.email.toLowerCase()
      let isDuplicate = false
      let duplicateReason = ''
      const isRoleViolation = !canCreateRole(user.role)

      // Check if email already exists in database
      if (existingEmails.has(emailKey)) {
        isDuplicate = true
        duplicateReason = 'email_exists'
      }
      // Check for duplicate within the CSV file
      else if (seenInFile.has(emailKey)) {
        isDuplicate = true
        duplicateReason = 'duplicate_in_file'
      } else {
        // Mark as seen in file
        seenInFile.set(emailKey, user._rowNumber || 0)
      }

      // Check if community ID is valid (exists in database)
      const isInvalidCommunity = user.community_id ? !validCommunityIds.has(user.community_id) : false

      // Check if user is authorized to create users in this community
      // Only check if community is valid and user is not Super Admin
      const isUnauthorizedCommunity = user.community_id && !isInvalidCommunity
        ? !authorizedCommunityIds.has(user.community_id)
        : false

      // Check if property ID is valid (try both as-is and with community prefix)
      let isInvalidProperty = false
      if (user.property_id) {
        const propertyIdAsIs = validPropertyIds.has(user.property_id)
        const propertyIdWithPrefix = user.community_id
          ? validPropertyIds.has(`${user.community_id}-${user.property_id}`)
          : false
        isInvalidProperty = !propertyIdAsIs && !propertyIdWithPrefix
      }

      return {
        ...user,
        _isDuplicate: isDuplicate,
        _duplicateReason: duplicateReason || undefined,
        _isRoleViolation: isRoleViolation,
        _isInvalidCommunity: isInvalidCommunity,
        _isInvalidProperty: isInvalidProperty,
        _isUnauthorizedCommunity: isUnauthorizedCommunity,
      }
    })
  }

  /**
   * Parse a single CSV line handling quoted values
   */
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())

    return result
  }

  /**
   * Get role ID from role name
   */
  const getRoleId = async (roleName: string): Promise<string | null> => {
    // First check our static map
    const normalizedName = roleName.trim()
    if (ROLE_MAP[normalizedName]) {
      return ROLE_MAP[normalizedName]
    }

    // If not in map, try to find in database
    const { data, error } = await supabase
      .from('role')
      .select('id')
      .ilike('role_name', normalizedName)
      .single()

    if (error || !data) {
      return null
    }

    return data.id
  }

  /**
   * Import users from CSV content (skips duplicates and role violations)
   */
  const importFromCSV = async (csvContent: string): Promise<UserImportResult> => {
    try {
      isImporting.value = true

      // Parse CSV
      const users = parseCSV(csvContent)

      if (users.length === 0) {
        throw new Error('No valid users found in CSV file')
      }

      // Check for duplicates and role violations
      const usersWithStatus = await checkDuplicates(users)

      const result: UserImportResult = {
        success: false,
        totalRows: users.length,
        successCount: 0,
        errorCount: 0,
        skippedCount: 0,
        errors: [],
      }

      // Get current session for Edge Function authorization
      const { data: sessionData } = await supabase.auth.getSession()
      if (!sessionData.session) {
        throw new Error('Not authenticated')
      }

      // Import each user (skip duplicates and role violations)
      for (let i = 0; i < usersWithStatus.length; i++) {
        const user = usersWithStatus[i]

        // Skip duplicates and role violations
        if (user._isDuplicate || user._isRoleViolation) {
          result.skippedCount++
          continue
        }

        try {
          // Get role ID
          const roleId = await getRoleId(user.role)
          if (!roleId) {
            throw new Error(`Invalid role: ${user.role}`)
          }

          // Call the Edge Function to create user (handles Auth + Profile creation)
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionData.session.access_token}`,
            },
            body: JSON.stringify({
              email: user.email,
              password: user.password,
              display_name: user.display_name,
              enabled: true,
              language: 'en',
              def_community_id: user.community_id || null,
              def_property_id: user.property_id || null,
              communities: user.community_id ? [user.community_id] : [],
              properties: user.property_id ? [user.property_id] : [],
              roles: [roleId],
            }),
          })

          const responseData = await response.json()

          if (!response.ok) {
            throw new Error(responseData.error || 'Failed to create user')
          }

          result.successCount++
        } catch (err: any) {
          result.errorCount++
          result.errors.push({
            row: user._rowNumber || (i + 2),
            data: user,
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
   * Generate CSV template content
   */
  const getTemplateContent = (): string => {
    const header = 'email,display_name,password,role,community_id,property_id'
    const example1 = 'admin@example.com,John Admin,Password123!,Administrator,COMM1,'
    const example2 = 'guard@example.com,Jane Guard,Password123!,Guard,COMM1,'
    const example3 = 'resident@example.com,Bob Resident,Password123!,Resident,COMM1,PROP1'

    return `${header}\n${example1}\n${example2}\n${example3}`
  }

  /**
   * Download CSV template
   */
  const downloadTemplate = () => {
    const content = getTemplateContent()
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'user-import-template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return {
    isImporting,
    parseCSV,
    checkDuplicates,
    importFromCSV,
    downloadTemplate,
    getTemplateContent,
    canCreateRole,
    getAllowedRoles,
    getCurrentUserRole,
  }
}
