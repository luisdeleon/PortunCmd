import { nextTick } from 'vue'
import { supabase } from '@/lib/supabase'
import type { RouteLocationRaw } from 'vue-router'

// Types
export interface SearchItem {
  url: RouteLocationRaw
  icon: string
  title: string
  subtitle?: string
  action?: string
  subject?: string
}

export interface SearchResults {
  title: string
  category: string
  children: SearchItem[]
}

// Static navigation items (pages/features)
const navigationItems: SearchItem[] = [
  { url: { name: 'dashboard' }, icon: 'tabler-layout-dashboard', title: 'Dashboard' },
  { url: { name: 'apps-community-list' }, icon: 'tabler-building-community', title: 'Communities' },
  { url: { name: 'apps-property-list' }, icon: 'tabler-home', title: 'Properties' },
  { url: { name: 'apps-user-list' }, icon: 'tabler-users', title: 'Users', action: 'read', subject: 'users' },
  { url: { name: 'apps-user-add' }, icon: 'tabler-user-plus', title: 'Add User', action: 'read', subject: 'users' },
  { url: { name: 'apps-visitor-list' }, icon: 'tabler-ticket', title: 'Active Passes' },
  { url: { name: 'apps-visitor-add' }, icon: 'tabler-plus', title: 'Create Pass', action: 'create', subject: 'visitor_pass' },
  { url: { name: 'apps-visitor-logs' }, icon: 'tabler-list-check', title: 'Access Logs' },
  { url: { name: 'apps-devices-list' }, icon: 'tabler-device-desktop', title: 'Devices', action: 'read', subject: 'automation' },
  { url: { name: 'apps-roles' }, icon: 'tabler-shield-check', title: 'Roles', action: 'manage', subject: 'all' },
  { url: { name: 'apps-permissions' }, icon: 'tabler-lock', title: 'Permissions', action: 'manage', subject: 'all' },
  { url: { name: 'apps-audit-deletion' }, icon: 'tabler-history', title: 'System Audit', action: 'manage', subject: 'all' },
  { url: { name: 'pages-account-settings-tab', params: { tab: 'account' } }, icon: 'tabler-settings', title: 'Account Settings' },
  { url: { name: 'pages-account-settings-tab', params: { tab: 'security' } }, icon: 'tabler-lock-open', title: 'Security Settings' },
]

export const useGlobalSearch = () => {
  // Use regular ref for reactivity
  const results = ref<SearchResults[]>([])
  const isLoading = ref(false)

  // Get user data for scope filtering
  const userData = useCookie<any>('userData')
  const userScope = computed(() => userData.value?.scope || {})
  const isSuperAdmin = computed(() =>
    userData.value?.role === 'Super Admin' || userScope.value.scopeType === 'global',
  )

  // Search navigation items (local, no API)
  const searchNavigation = (query: string): SearchItem[] => {
    const queryLower = query.toLowerCase()

    return navigationItems.filter(item =>
      item.title.toLowerCase().includes(queryLower),
    ).slice(0, 5)
  }

  // Search visitors with scope filtering
  const searchVisitors = async (query: string): Promise<SearchItem[]> => {
    try {
      let dbQuery = supabase
        .from('visitor_records_uid')
        .select('id, visitor_name, record_uid, visitor_type')
        .or(`visitor_name.ilike.%${query}%,record_uid.ilike.%${query}%`)
        .limit(3)

      // Apply scope filtering
      if (!isSuperAdmin.value) {
        const scope = userScope.value

        if (scope.scopeType === 'property' && scope.scopePropertyIds?.length > 0) {
          dbQuery = dbQuery.in('property_id', scope.scopePropertyIds)
        }
        else if (scope.scopeType === 'community' && scope.scopeCommunityIds?.length > 0) {
          dbQuery = dbQuery.in('community_id', scope.scopeCommunityIds)
        }
      }

      const { data, error } = await dbQuery

      if (error) {
        console.error('Error searching visitors:', error)

        return []
      }

      return (data || []).map(visitor => ({
        url: { name: 'apps-visitor-list', query: { search: visitor.record_uid } },
        icon: 'tabler-ticket',
        title: visitor.visitor_name || 'Unknown Visitor',
        subtitle: `${visitor.visitor_type || 'Visitor'} - ${visitor.record_uid}`,
      }))
    }
    catch (e) {
      console.error('Error in searchVisitors:', e)

      return []
    }
  }

  // Search communities with scope filtering
  const searchCommunities = async (query: string): Promise<SearchItem[]> => {
    try {
      let dbQuery = supabase
        .from('community')
        .select('id, name, city')
        .ilike('name', `%${query}%`)
        .limit(3)

      // Apply scope filtering
      if (!isSuperAdmin.value) {
        const scope = userScope.value

        if (scope.scopeCommunityIds?.length > 0) {
          dbQuery = dbQuery.in('id', scope.scopeCommunityIds)
        }
        else if (scope.scopePropertyIds?.length > 0) {
          // Property-scoped users - get communities from their properties
          const { data: properties } = await supabase
            .from('property')
            .select('community_id')
            .in('id', scope.scopePropertyIds)

          const communityIds = [...new Set(properties?.map(p => p.community_id).filter(Boolean))]
          if (communityIds.length > 0) {
            dbQuery = dbQuery.in('id', communityIds)
          }
          else {
            return []
          }
        }
      }

      const { data, error } = await dbQuery

      if (error) {
        console.error('Error searching communities:', error)

        return []
      }

      return (data || []).map(community => ({
        url: { name: 'apps-community-list', query: { search: community.name } },
        icon: 'tabler-building-community',
        title: community.name || 'Unknown Community',
        subtitle: community.city || '',
      }))
    }
    catch (e) {
      console.error('Error in searchCommunities:', e)

      return []
    }
  }

  // Search properties with scope filtering
  const searchProperties = async (query: string): Promise<SearchItem[]> => {
    try {
      let dbQuery = supabase
        .from('property')
        .select('id, name, address, community:community_id(name)')
        .ilike('name', `%${query}%`)
        .limit(3)

      // Apply scope filtering
      if (!isSuperAdmin.value) {
        const scope = userScope.value

        if (scope.scopeType === 'property' && scope.scopePropertyIds?.length > 0) {
          dbQuery = dbQuery.in('id', scope.scopePropertyIds)
        }
        else if (scope.scopeType === 'community' && scope.scopeCommunityIds?.length > 0) {
          dbQuery = dbQuery.in('community_id', scope.scopeCommunityIds)
        }
      }

      const { data, error } = await dbQuery

      if (error) {
        console.error('Error searching properties:', error)

        return []
      }

      return (data || []).map((property: any) => ({
        url: { name: 'apps-property-list', query: { search: property.name } },
        icon: 'tabler-home',
        title: property.name || 'Unknown Property',
        subtitle: property.community?.name || property.address || '',
      }))
    }
    catch (e) {
      console.error('Error in searchProperties:', e)

      return []
    }
  }

  // Search users with scope filtering (requires permission)
  const searchUsers = async (query: string): Promise<SearchItem[]> => {
    try {
      // Use simpler query without nested relations to avoid ambiguous relationship error
      let dbQuery = supabase
        .from('profile')
        .select('id, display_name, email')
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(3)

      // Apply scope filtering for non-super admins
      if (!isSuperAdmin.value) {
        const scope = userScope.value

        // For community/property scoped users, filter by community
        if (scope.scopeCommunityIds?.length > 0) {
          // Get users who are community managers or property owners in these communities
          const { data: communityUsers } = await supabase
            .from('community_manager')
            .select('profile_id')
            .in('community_id', scope.scopeCommunityIds)

          const { data: propertyOwners } = await supabase
            .from('property_owner')
            .select('profile_id, property:property_id(community_id)')
            .in('property.community_id', scope.scopeCommunityIds)

          const userIds = [
            ...(communityUsers?.map(u => u.profile_id).filter(Boolean) || []),
            ...(propertyOwners?.map(u => u.profile_id).filter(Boolean) || []),
          ] as string[]

          if (userIds.length > 0) {
            dbQuery = dbQuery.in('id', [...new Set(userIds)])
          }
          else {
            return []
          }
        }
        else if (scope.scopePropertyIds?.length > 0) {
          // Property-scoped users can only see property owners
          const { data: propertyOwners } = await supabase
            .from('property_owner')
            .select('profile_id')
            .in('property_id', scope.scopePropertyIds)

          const userIds = (propertyOwners?.map(u => u.profile_id).filter(Boolean) || []) as string[]
          if (userIds.length > 0) {
            dbQuery = dbQuery.in('id', [...new Set(userIds)])
          }
          else {
            return []
          }
        }
      }

      const { data, error } = await dbQuery

      if (error) {
        console.error('Error searching users:', error)

        return []
      }

      return (data || []).map((user: any) => ({
        url: { name: 'apps-user-view-id', params: { id: user.id } },
        icon: 'tabler-user',
        title: user.display_name || user.email || 'Unknown User',
        subtitle: user.email || '',
        action: 'read',
        subject: 'users',
      }))
    }
    catch (e) {
      console.error('Error in searchUsers:', e)

      return []
    }
  }

  // Main search function
  const search = async (query: string): Promise<SearchResults[]> => {
    if (!query || query.length < 2) {
      await nextTick()
      results.value = []

      return []
    }

    isLoading.value = true

    try {
      // Search navigation items locally (always)
      const navResults = searchNavigation(query)

      // Search database entities in parallel
      const [visitors, communities, properties, users] = await Promise.all([
        searchVisitors(query),
        searchCommunities(query),
        searchProperties(query),
        searchUsers(query),
      ])

      // Build results array
      const searchResults: SearchResults[] = []

      if (navResults.length > 0) {
        searchResults.push({
          title: 'Navigation',
          category: 'navigation',
          children: navResults,
        })
      }

      if (visitors.length > 0) {
        searchResults.push({
          title: 'Visitors',
          category: 'visitors',
          children: visitors,
        })
      }

      if (communities.length > 0) {
        searchResults.push({
          title: 'Communities',
          category: 'communities',
          children: communities,
        })
      }

      if (properties.length > 0) {
        searchResults.push({
          title: 'Properties',
          category: 'properties',
          children: properties,
        })
      }

      if (users.length > 0) {
        searchResults.push({
          title: 'Users',
          category: 'users',
          children: users,
        })
      }

      // Use nextTick to avoid updating during render
      await nextTick()
      results.value = searchResults

      return searchResults
    }
    catch (e) {
      console.error('Error in global search:', e)
      await nextTick()
      results.value = []

      return []
    }
    finally {
      isLoading.value = false
    }
  }

  // Clear results
  const clearResults = async () => {
    await nextTick()
    results.value = []
  }

  return {
    results,
    isLoading,
    search,
    clearResults,
    searchNavigation,
  }
}
