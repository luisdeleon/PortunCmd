import { supabase } from '@/lib/supabase'
import type { Tables } from '@/types/supabase'
import type { Rule } from '@/plugins/casl/ability'

type UserAbilityRule = Rule

type Profile = Tables<'profile'>
type ProfileRole = Tables<'profile_role'>
type Role = Tables<'role'>

interface UserData {
  id: string
  email: string
  fullName?: string
  username?: string
  avatar?: string
  role: string
  abilityRules: UserAbilityRule[]
}

interface LoginResponse {
  accessToken: string
  userData: UserData
  userAbilityRules: UserAbilityRule[]
}

// Map role names to ability rules
function getAbilityRulesForRole(roleName: string): UserAbilityRule[] {
  const roleLower = roleName.toLowerCase()
  
  // Admin roles get full access
  if (roleLower.includes('admin') || roleLower === 'super admin') {
    return [
      {
        action: 'manage',
        subject: 'all',
      },
    ]
  }
  
  // Default rules for other roles (Guard, Resident, Dealer, Client)
  return [
    {
      action: 'read',
      subject: 'AclDemo',
    },
  ]
}

export const useAuth = () => {
  const login = async (email: string, password: string): Promise<LoginResponse> => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      throw new Error(authError.message)
    }

    if (!authData.user || !authData.session) {
      throw new Error('Login failed')
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

    // Fetch user roles
    let roles: string[] = []
    try {
      const { data: profileRoles, error: rolesError } = await supabase
        .from('profile_role')
        .select(`
          role_id,
          role:role_id (
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
        roles = profileRoles
          .filter((pr: any) => pr.role && pr.role.enabled)
          .map((pr: any) => pr.role.role_name)
          .filter(Boolean)
      }
    }
    catch (error) {
      console.warn('Error fetching roles:', error)
    }
    
    // Determine primary role (admin takes precedence, otherwise first role, default to 'Resident')
    const primaryRole = roles.find((r: string) => r?.toLowerCase().includes('admin')) || roles[0] || 'Resident'
    
    // Get ability rules based on role
    const abilityRules = getAbilityRulesForRole(primaryRole)

    // Build user data
    const userData: UserData = {
      id: profile.id,
      email: profile.email,
      fullName: profile.display_name || undefined,
      username: profile.email.split('@')[0],
      avatar: undefined, // You can add avatar URL from profile if needed
      role: primaryRole,
      abilityRules,
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/forgot-password?reset=true`,
    })

    if (error) {
      throw new Error(error.message)
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

