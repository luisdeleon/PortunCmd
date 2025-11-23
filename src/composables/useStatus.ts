import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase/database.types'

type UserStatus = Database['public']['Tables']['profile']['Row']['status']
type CommunityStatus = Database['public']['Tables']['community']['Row']['status']
type PropertyStatus = Database['public']['Tables']['property']['Row']['status']

export const useStatus = () => {
  /**
   * Change user status
   */
  const changeUserStatus = async (
    userId: string,
    newStatus: UserStatus,
    reason?: string,
  ) => {
    const { data: userData } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc('change_user_status', {
      p_user_id: userId,
      p_new_status: newStatus as string,
      p_changed_by: userData.user?.id as string,
      p_reason: reason || null,
    })

    if (error) throw error
    return data
  }

  /**
   * Change community status
   */
  const changeCommunityStatus = async (
    communityId: string,
    newStatus: CommunityStatus,
    options?: {
      reason?: string
      reopeningDate?: string
      completionDate?: string
    },
  ) => {
    const { data: userData } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc('change_community_status', {
      p_community_id: communityId,
      p_new_status: newStatus as string,
      p_changed_by: userData.user?.id as string,
      p_reason: options?.reason || null,
      p_reopening_date: options?.reopeningDate || null,
      p_completion_date: options?.completionDate || null,
    })

    if (error) throw error
    return data
  }

  /**
   * Change property status
   */
  const changePropertyStatus = async (
    propertyId: string,
    newStatus: PropertyStatus,
    reason?: string,
  ) => {
    const { data: userData } = await supabase.auth.getUser()

    const { data, error } = await supabase.rpc('change_property_status', {
      p_property_id: propertyId,
      p_new_status: newStatus as string,
      p_changed_by: userData.user?.id as string,
      p_reason: reason || null,
    })

    if (error) throw error
    return data
  }

  /**
   * Get status color for Vuetify theme
   */
  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      // User Statuses
      'active': 'success',              // Green - Active/Operational
      'pending': 'warning',              // Yellow - Awaiting Action
      'suspended': 'error',              // Red - Critical/Blocked
      'inactive': 'blue-grey',           // Blue-Grey - Not Active
      'archived': 'blue-grey-darken-2',  // Dark Blue-Grey - Archived/Historical

      // Community Statuses
      'under-construction': 'info',      // Blue - In Progress
      'pre-launch': 'amber-darken-1',    // Dark Amber - Coming Soon
      'full-capacity': 'deep-orange',    // Deep Orange - At Limit
      'seasonal-closure': 'purple',      // Purple - Temporary Closed

      // Property Statuses
      'vacant': 'cyan',                  // Cyan - Available/Empty
      'access-restricted': 'orange-darken-3', // Dark Orange - Limited Access
      'maintenance': 'orange',           // Orange - Under Maintenance
      'emergency-lockdown': 'red-darken-3',   // Dark Red - Emergency
      'guest-mode': 'indigo',            // Indigo - Guest/Temporary
      'out-of-service': 'brown',         // Brown - Not Functioning
      'deactivated': 'grey-darken-1',    // Medium Grey - Deactivated
    }

    return colorMap[status] || 'grey'
  }

  /**
   * Get status icon
   */
  const getStatusIcon = (status: string): string => {
    const iconMap: Record<string, string> = {
      'active': 'tabler-check',
      'pending': 'tabler-clock',
      'suspended': 'tabler-ban',
      'inactive': 'tabler-moon',
      'archived': 'tabler-archive',
      'vacant': 'tabler-door',
      'under-construction': 'tabler-building',
      'pre-launch': 'tabler-rocket',
      'full-capacity': 'tabler-building-warehouse',
      'maintenance': 'tabler-tool',
      'seasonal-closure': 'tabler-snowflake',
      'emergency-lockdown': 'tabler-alert-triangle',
      'access-restricted': 'tabler-lock',
      'guest-mode': 'tabler-users',
      'out-of-service': 'tabler-x',
      'deactivated': 'tabler-circle-off',
    }

    return iconMap[status] || 'tabler-circle'
  }

  /**
   * Format status for display
   * For multilingual support, use i18n instead: t(`status.${entityType}.${status}`)
   */
  const formatStatus = (status: string): string => {
    return status
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * Get status statistics
   */
  const getStatusStatistics = async (entityType: 'user' | 'community' | 'property') => {
    const { data, error } = await supabase.rpc('get_status_statistics', {
      p_entity_type: entityType,
    })

    if (error) throw error
    return data
  }

  /**
   * Get status history for an entity
   */
  const getStatusHistory = async (entityType: string, entityId: string) => {
    const { data, error } = await supabase
      .from('status_history')
      .select(`
        *,
        changed_by_profile:profile!status_history_changed_by_fkey(
          id,
          email,
          display_name
        )
      `)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('changed_at', { ascending: false })

    if (error) throw error
    return data
  }

  return {
    changeUserStatus,
    changeCommunityStatus,
    changePropertyStatus,
    getStatusColor,
    getStatusIcon,
    formatStatus,
    getStatusStatistics,
    getStatusHistory,
  }
}
