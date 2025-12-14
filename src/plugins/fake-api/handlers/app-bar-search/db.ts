import type { SearchResults } from '@db/app-bar-search/types'

interface DB {
  searchItems: SearchResults[]
}

export const db: DB = {
  searchItems: [
    {
      title: 'Portun',
      category: 'portun',
      children: [
        {
          url: { name: 'dashboard' },
          icon: 'tabler-layout-dashboard',
          title: 'Dashboard',
        },
        {
          url: { name: 'apps-community-list' },
          icon: 'tabler-building-community',
          title: 'Communities',
        },
        {
          url: { name: 'apps-property-list' },
          icon: 'tabler-home',
          title: 'Properties',
        },
        {
          url: { name: 'apps-user-list' },
          icon: 'tabler-users',
          title: 'Users',
          action: 'read',
          subject: 'users',
        },
        {
          url: { name: 'apps-user-add' },
          icon: 'tabler-user-plus',
          title: 'Add User',
          action: 'read',
          subject: 'users',
        },
        {
          url: { name: 'apps-visitor-list' },
          icon: 'tabler-ticket',
          title: 'Active Passes',
        },
        {
          url: { name: 'apps-visitor-add' },
          icon: 'tabler-plus',
          title: 'Create Pass',
          action: 'create',
          subject: 'visitor_pass',
        },
        {
          url: { name: 'apps-visitor-logs' },
          icon: 'tabler-list-check',
          title: 'Access Logs',
        },
        {
          url: { name: 'apps-devices-list' },
          icon: 'tabler-device-desktop',
          title: 'Devices',
          action: 'read',
          subject: 'automation',
        },
        {
          url: { name: 'apps-roles' },
          icon: 'tabler-shield-check',
          title: 'Roles',
          action: 'manage',
          subject: 'all',
        },
        {
          url: { name: 'apps-permissions' },
          icon: 'tabler-lock',
          title: 'Permissions',
          action: 'manage',
          subject: 'all',
        },
        {
          url: { name: 'apps-audit-deletion' },
          icon: 'tabler-history',
          title: 'System Audit',
          action: 'manage',
          subject: 'all',
        },
        {
          url: { name: 'pages-account-settings-tab', params: { tab: 'account' } },
          icon: 'tabler-settings',
          title: 'Account Settings',
        },
        {
          url: { name: 'pages-account-settings-tab', params: { tab: 'security' } },
          icon: 'tabler-lock-open',
          title: 'Security Settings',
        },
      ],
    },
  ],
}
