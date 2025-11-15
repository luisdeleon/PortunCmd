import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/supabase'
import type { Rule } from '@/plugins/casl/ability'

type UserAbilityRule = Rule

type Profile = Tables<'profile'>
type ProfileRole = Tables<'profile_role'>
type Role = Tables<'role'>

interface RoleScope {
  scopeType: 'global' | 'dealer' | 'community' | 'property'
  scopeDealerId?: string | null
  scopeCommunityIds?: string[]
  scopePropertyIds?: string[]
}

interface Permission {
  name: string
  resource: string
  action: string
}

interface UserData {
  id: string
  email: string
  fullName?: string
  username?: string
  avatar?: string
  role: string
  abilityRules: UserAbilityRule[]
  scope?: RoleScope
}

interface LoginResponse {
  accessToken: string
  userData: UserData
  userAbilityRules: UserAbilityRule[]
}

// Generate CASL ability rules from permissions with scope conditions
function generateAbilityRules(
  roleName: string,
  permissions: Permission[],
  scope: RoleScope
): UserAbilityRule[] {
  const rules: UserAbilityRule[] = []

  // Super Admin with global scope gets unrestricted access
  if (roleName === 'Super Admin' && scope.scopeType === 'global') {
    return [{ action: 'manage', subject: 'all' }]
  }

  // Convert permissions to CASL rules with scope conditions
  permissions.forEach(permission => {
    const conditions: any = {}

    // Apply scope restrictions based on resource and scope type
    if (scope.scopeType === 'dealer') {
      // Dealers can only access their own communities
      if (permission.resource === 'community') {
        // Will be filtered by RLS, but we can add client-side hints
        conditions.dealer_id = scope.scopeDealerId
      }
    }
    else if (scope.scopeType === 'community') {
      // Administrators/Guards restricted to specific communities
      if (permission.resource === 'community' || permission.resource === 'property' || permission.resource === 'resident') {
        if (scope.scopeCommunityIds && scope.scopeCommunityIds.length > 0) {
          conditions.community_id = { $in: scope.scopeCommunityIds }
        }
      }
    }
    else if (scope.scopeType === 'property') {
      // Residents restricted to specific properties
      if (permission.resource === 'property') {
        if (scope.scopePropertyIds && scope.scopePropertyIds.length > 0) {
          conditions.id = { $in: scope.scopePropertyIds }
        }
      }
      if (permission.resource === 'community') {
        if (scope.scopeCommunityIds && scope.scopeCommunityIds.length > 0) {
          conditions.id = { $in: scope.scopeCommunityIds }
        }
      }
    }

    rules.push({
      action: permission.action as any,
      subject: permission.resource as any,
      ...(Object.keys(conditions).length > 0 ? { conditions } : {}),
    })
  })

  // Fallback if no permissions found
  if (rules.length === 0) {
    return [{ action: 'read', subject: 'AclDemo' }]
  }

  return rules
}

export const useAuth = () => {
  const login = async (email: string, password: string): Promise<LoginResponse> => {
    // Validate inputs
    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // If Supabase returns an error, throw it immediately
    if (authError) {
      console.error('Supabase auth error:', authError)
      throw new Error(authError.message)
    }

    // Ensure we have valid auth data
    if (!authData?.user || !authData?.session) {
      console.error('Invalid auth data:', authData)
      throw new Error('Invalid login credentials')
    }

    // Fetch user profile
    let profile: Profile | null = null
    const { data: profileData, error: profileError } = await supabase
      .from('profile')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      // If profile doesn't exist, create a basic one
      if (profileError.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('profile')
          .insert({
            id: authData.user.id,
            email: authData.user.email || email,
            enabled: true,
          })
          .select()
          .single()

        if (createError || !newProfile) {
          throw new Error('Failed to create user profile')
        }
        
        profile = newProfile
      }
      else {
        throw new Error('Failed to fetch user profile')
      }
    }
    else {
      profile = profileData
    }

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Check if user is enabled
    if (!profile.enabled) {
      throw new Error('Your account has been disabled. Please contact support.')
    }

    // Fetch user roles with scope information
    let roles: string[] = []
    let primaryRoleData: any = null
    let roleScope: RoleScope = { scopeType: 'global' }

    try {
      const { data: profileRoles, error: rolesError } = await supabase
        .from('profile_role')
        .select(`
          role_id,
          scope_type,
          scope_dealer_id,
          scope_community_ids,
          scope_property_ids,
          role:role_id (
            id,
            role_name,
            enabled
          )
        `)
        .eq('profile_id', authData.user.id)

      if (rolesError) {
        console.warn('Failed to fetch user roles:', rolesError)
      }
      else if (profileRoles && profileRoles.length > 0) {
        // Get enabled roles
        const enabledRoles = profileRoles.filter((pr: any) => pr.role && pr.role.enabled)
        roles = enabledRoles.map((pr: any) => pr.role.role_name).filter(Boolean)

        // Determine primary role (admin takes precedence, otherwise first role)
        primaryRoleData = enabledRoles.find((pr: any) =>
          pr.role.role_name?.toLowerCase().includes('admin')
        ) || enabledRoles[0]

        // Extract scope from primary role
        if (primaryRoleData) {
          roleScope = {
            scopeType: primaryRoleData.scope_type || 'global',
            scopeDealerId: primaryRoleData.scope_dealer_id,
            scopeCommunityIds: primaryRoleData.scope_community_ids || [],
            scopePropertyIds: primaryRoleData.scope_property_ids || [],
          }
        }
      }
    }
    catch (error) {
      console.warn('Error fetching roles:', error)
    }

    // Determine primary role name
    const primaryRole = primaryRoleData?.role?.role_name || roles[0] || 'Resident'
    const primaryRoleId = primaryRoleData?.role?.id

    // Fetch permissions for the primary role
    let permissions: Permission[] = []
    if (primaryRoleId) {
      try {
        const { data: rolePermissions, error: permError } = await (supabase as any)
          .from('role_permissions')
          .select(`
            permission:permission_id (
              name,
              resource,
              action
            )
          `)
          .eq('role_id', primaryRoleId)

        if (permError) {
          console.warn('Failed to fetch permissions:', permError)
        }
        else if (rolePermissions) {
          permissions = rolePermissions
            .map((rp: any) => rp.permission)
            .filter(Boolean)
        }
      }
      catch (error) {
        console.warn('Error fetching permissions:', error)
      }
    }

    // Generate ability rules from permissions with scope
    const abilityRules = generateAbilityRules(primaryRole, permissions, roleScope)

    // Build user data with scope
    const userData: UserData = {
      id: profile.id,
      email: profile.email,
      fullName: profile.display_name || undefined,
      username: profile.email.split('@')[0],
      avatar: undefined, // You can add avatar URL from profile if needed
      role: primaryRole,
      abilityRules,
      scope: roleScope,
    }

    // Store session token as accessToken
    const accessToken = authData.session.access_token

    return {
      accessToken,
      userData,
      userAbilityRules: abilityRules,
    }
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(error.message)
    }
  }

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password?reset=true`,
      })

      // Only throw error if Supabase actually returns an error
      // Note: Supabase will return success even if email doesn't exist (for security)
      if (error) {
        console.error('Supabase reset password error:', error)
        throw new Error(error.message)
      }
    } catch (err: any) {
      // If there's a network error or other issue, throw it
      console.error('Reset password error:', err)
      throw err
    }
  }

  const getSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      throw new Error(error.message)
    }
    return session
  }

  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) {
      throw new Error(error.message)
    }
    return user
  }

  return {
    login,
    logout,
    resetPassword,
    getSession,
    getCurrentUser,
  }
}

