# Navigation Menu Guide - PortunCmd

**Last Updated:** 2025-11-21
**Status:** Design & Implementation Roadmap

## Table of Contents
1. [Overview](#overview)
2. [Current Navigation State](#current-navigation-state)
3. [Recommended Navigation Structure](#recommended-navigation-structure)
4. [Role-Based Navigation](#role-based-navigation)
5. [Implementation Todos](#implementation-todos)
6. [Design Principles](#design-principles)
7. [Technical Implementation](#technical-implementation)

---

## Overview

This document provides comprehensive guidance for implementing a complete, role-based navigation menu system for PortunCmd. The navigation structure is designed to support:

- **Multi-tenant architecture** - Different views for different user types
- **Progressive disclosure** - Only show what users need to see
- **Intuitive organization** - Logical grouping of features
- **Scalability** - Easy to add new features
- **Role-based access control** - Different menus for different roles

---

## Current Navigation State

### What Exists Now

```
Apps & Pages
├── Community
│   └── List
├── Property
│   └── List
├── User
│   └── List
└── Roles
    └── List
```

### What's Missing

- Dashboard/Home page
- Visitor Management section
- Access Control section
- Automation/IoT section
- Reports & Analytics
- Notifications
- Settings/Configuration
- User Profile/Account

---

## Recommended Navigation Structure

### Full Navigation Menu (All Features)

This is the complete navigation structure showing all features that should be implemented. Role-based visibility is detailed in the next section.

```
📊 Dashboard
   ├── Overview (analytics.vue)
   ├── Community Dashboard (for admins)
   └── Property Dashboard (for residents)

🏘️ Communities
   ├── List Communities
   ├── Add Community
   ├── Community Details
   └── Community Settings

🏠 Properties
   ├── List Properties
   ├── Add Property
   ├── Property Details
   └── Import Properties

👥 Users & Access
   ├── Users
   │   ├── List Users
   │   ├── Add User
   │   ├── User Details
   │   └── Import Users
   ├── Roles & Permissions
   │   ├── Manage Roles
   │   └── Manage Permissions
   └── Access Control Demo

👤 Residents
   ├── List Residents
   ├── Resident Details
   └── Property Assignments

🎫 Visitor Management
   ├── Active Passes
   ├── Create Visitor Pass
   ├── Visitor History
   ├── QR Code Scanner (Guards)
   └── Visitor Types

📋 Access Logs
   ├── Entry/Exit Logs
   ├── Live Activity
   └── Access Reports

🤖 Automation & Devices
   ├── Device List
   ├── Add Device
   ├── Device Status
   └── Gate Control

📊 Reports & Analytics
   ├── Community Reports
   ├── Visitor Analytics
   ├── Property Occupancy
   ├── Access Patterns
   └── Export Data

🔔 Notifications
   ├── Notification Center
   ├── Announcements
   └── Notification Settings

⚙️ Settings
   ├── System Settings (Super Admin)
   ├── Community Settings (Admin)
   ├── Profile Settings
   └── Preferences

❓ Help & Support
   ├── Documentation
   ├── FAQs
   └── Support Tickets
```

---

## Role-Based Navigation

Different user roles see different navigation menus based on their permissions and scope.

### 1. Super Admin Navigation

**Full System Access - All Features Visible**

```
📊 Dashboard
   └── System Overview

🏘️ Communities
   ├── List Communities (all)
   ├── Add Community
   └── Community Settings

🏠 Properties
   ├── List Properties (all)
   ├── Add Property
   └── Import Properties

👥 Users & Access
   ├── Users
   │   ├── List Users (all)
   │   ├── Add User
   │   └── Import Users
   ├── Roles & Permissions
   │   ├── Manage Roles
   │   └── Manage Permissions
   └── Dealers
       ├── List Dealers
       ├── Add Dealer
       └── Dealer Assignments

🎫 Visitor Management
   ├── Active Passes (all communities)
   ├── Visitor History (all)
   └── Visitor Types

📋 Access Logs
   ├── Entry/Exit Logs (all)
   └── Access Reports

🤖 Automation & Devices
   ├── Device List (all)
   ├── Add Device
   └── Device Status

📊 Reports & Analytics
   ├── System Reports
   ├── Multi-Community Analytics
   ├── User Activity Reports
   └── Export Data

🔔 Notifications
   ├── System Announcements
   └── Notification Settings

⚙️ Settings
   ├── System Configuration
   ├── Integration Settings
   ├── Backup & Restore
   └── Profile Settings
```

---

### 2. Dealer Navigation

**Multi-Community Portfolio Management**

```
📊 Dashboard
   └── Portfolio Overview
       ├── All Communities Metrics
       ├── Administrator Performance
       └── Occupancy Statistics

🏘️ My Communities
   ├── List Communities (dealer scope)
   ├── Community Details
   └── Community Metrics

🏠 Properties
   └── List Properties (dealer scope, read-only)

👥 Team Management
   ├── My Administrators
   │   ├── List Administrators
   │   ├── Add Administrator
   │   └── Assign to Community
   └── Administrator Performance

📊 Reports & Analytics
   ├── Portfolio Reports
   ├── Occupancy Reports
   ├── Revenue Analytics (if applicable)
   └── Export Data

🔔 Notifications
   └── Announcements

⚙️ Settings
   ├── Profile Settings
   └── Preferences
```

---

### 3. Administrator Navigation

**Community-Specific Management**

```
📊 Dashboard
   └── Community Dashboard
       ├── My Communities Overview
       ├── Active Visitors
       └── Recent Activity

🏘️ My Communities
   ├── List Communities (assigned only)
   └── Community Settings

🏠 Properties
   ├── List Properties (assigned communities)
   ├── Add Property
   └── Property Details

👤 Residents
   ├── List Residents (my communities)
   ├── Add Resident
   └── Manage Property Assignments

🎫 Visitor Management
   ├── Active Passes (my communities)
   ├── Create Visitor Pass
   ├── Visitor History (my communities)
   └── Visitor Types

📋 Access Logs
   ├── Entry/Exit Logs (my communities)
   └── Access Reports (my communities)

🤖 Automation & Devices
   ├── Device List (my communities)
   ├── Add Device
   └── Gate Control

📊 Reports
   ├── Community Reports
   ├── Visitor Analytics
   └── Export Data

🔔 Notifications
   ├── Notification Center
   └── Announcements

⚙️ Settings
   ├── Community Settings
   ├── Profile Settings
   └── Preferences
```

---

### 4. Resident Navigation

**Personal Property Management**

```
📊 My Home
   └── Property Overview
       ├── My Property Details
       ├── Active Visitors
       └── Recent Visitors

🎫 Visitors
   ├── Create Visitor Pass
   ├── My Visitor Passes
   │   ├── Active Passes
   │   └── Expired Passes
   └── Visitor History

📋 Activity
   └── My Access Logs
       ├── Recent Entries
       └── Recent Exits

🏘️ Community
   ├── Community Info
   └── Announcements

🔔 Notifications
   ├── My Notifications
   └── Notification Settings

⚙️ My Account
   ├── Profile Settings
   ├── Property Details
   └── Preferences
```

---

### 5. Guard Navigation

**Access Control Operations**

```
📊 Gate Dashboard
   └── Current Shift Overview
       ├── Active Visitors
       ├── Expected Arrivals
       └── Recent Entries

🎫 Visitor Control
   ├── Scan QR Code
   ├── Active Passes (my communities)
   ├── Log Entry
   └── Log Exit

📋 Activity Logs
   ├── Today's Entries
   ├── Today's Exits
   └── Search Visitor

🤖 Gate Control
   ├── Open Gate (if authorized)
   └── Device Status

🔔 Notifications
   └── Alerts

⚙️ My Account
   └── Profile Settings
```

---

### 6. Client Navigation

**Limited Read-Only Access**

```
📊 Dashboard
   └── Overview

🏘️ Communities
   └── View Communities (limited scope)

🏠 Properties
   └── View Properties (limited scope)

📊 Reports
   └── View Reports (limited scope)

⚙️ My Account
   └── Profile Settings
```

---

## Implementation Todos

### Phase 1: Core Navigation Structure (Week 1)
**Priority: CRITICAL**

- [ ] **Todo 1.1**: Create role-based navigation configuration files
  - Create `src/navigation/vertical/super-admin.ts`
  - Create `src/navigation/vertical/dealer.ts`
  - Create `src/navigation/vertical/administrator.ts`
  - Create `src/navigation/vertical/resident.ts`
  - Create `src/navigation/vertical/guard.ts`
  - Create `src/navigation/vertical/client.ts`

- [ ] **Todo 1.2**: Update main navigation index
  - Modify `src/navigation/vertical/index.ts` to dynamically load navigation based on user role
  - Add role detection logic using current user's role from auth

- [ ] **Todo 1.3**: Create Dashboard pages
  - Create `src/pages/dashboards/overview.vue` (Super Admin)
  - Create `src/pages/dashboards/portfolio.vue` (Dealer)
  - Create `src/pages/dashboards/community.vue` (Administrator)
  - Create `src/pages/dashboards/property.vue` (Resident)
  - Create `src/pages/dashboards/gate.vue` (Guard)

- [ ] **Todo 1.4**: Add Dashboard to navigation
  - Add dashboard entries to each role's navigation file
  - Set appropriate icons (`tabler-layout-dashboard`)
  - Configure route meta for permissions

### Phase 2: Visitor Management (Week 2)
**Priority: HIGH**

- [ ] **Todo 2.1**: Create Visitor Management pages
  - Create `src/pages/apps/visitor/list/index.vue` (active passes list)
  - Create `src/pages/apps/visitor/create.vue` (create visitor pass)
  - Create `src/pages/apps/visitor/history/index.vue` (visitor history)
  - Create `src/pages/apps/visitor/types/index.vue` (manage visitor types)

- [ ] **Todo 2.2**: Create QR Code Scanner page
  - Create `src/pages/apps/visitor/scanner.vue` (for guards)
  - Integrate QR code scanning library
  - Add camera access functionality

- [ ] **Todo 2.3**: Add Visitor Management to navigation
  - Add to Super Admin, Administrator, Resident, and Guard navigation
  - Configure role-based visibility
  - Add appropriate icons (`tabler-ticket`)

- [ ] **Todo 2.4**: Create visitor pass generation logic
  - Implement QR code generation
  - Store QR codes in Supabase Storage
  - Link to `visitor_records_uid` table

### Phase 3: Access Logs (Week 3)
**Priority: HIGH**

- [ ] **Todo 3.1**: Create Access Logs pages
  - Create `src/pages/apps/access-logs/entry-exit.vue` (entry/exit logs)
  - Create `src/pages/apps/access-logs/live.vue` (live activity)
  - Create `src/pages/apps/access-logs/reports.vue` (access reports)

- [ ] **Todo 3.2**: Implement log filtering
  - Add date range filters
  - Add community/property filters
  - Add visitor name search
  - Add entry/exit type filter

- [ ] **Todo 3.3**: Add Access Logs to navigation
  - Add to Super Admin, Administrator, Resident, and Guard navigation
  - Configure scoped data access per role
  - Add appropriate icons (`tabler-report`)

### Phase 4: Automation & Devices (Week 4)
**Priority: MEDIUM**

- [ ] **Todo 4.1**: Create Automation Device pages
  - Create `src/pages/apps/automation/device/list/index.vue`
  - Create `src/pages/apps/automation/device/add.vue`
  - Create `src/pages/apps/automation/device/details/[id].vue`
  - Create `src/pages/apps/automation/device/status.vue`

- [ ] **Todo 4.2**: Implement device control
  - Add Shelly API integration
  - Create gate open/close functions
  - Add device status monitoring

- [ ] **Todo 4.3**: Add Gate Control interface
  - Create `src/pages/apps/automation/gate-control.vue`
  - Add manual gate control (for guards/admins)
  - Add automated gate control based on QR scan

- [ ] **Todo 4.4**: Add Automation to navigation
  - Add to Super Admin, Administrator, and Guard navigation
  - Add appropriate icons (`tabler-robot`)

### Phase 5: Reports & Analytics (Week 5)
**Priority: MEDIUM**

- [ ] **Todo 5.1**: Create Reports pages
  - Create `src/pages/apps/reports/community.vue`
  - Create `src/pages/apps/reports/visitor-analytics.vue`
  - Create `src/pages/apps/reports/occupancy.vue`
  - Create `src/pages/apps/reports/access-patterns.vue`

- [ ] **Todo 5.2**: Implement data export
  - Add CSV export functionality
  - Add PDF export functionality
  - Add Excel export functionality

- [ ] **Todo 5.3**: Add Charts and visualizations
  - Add Chart.js or ApexCharts components
  - Create visitor trend charts
  - Create occupancy charts
  - Create access pattern heatmaps

- [ ] **Todo 5.4**: Add Reports to navigation
  - Add to all role navigations with appropriate scope
  - Add appropriate icons (`tabler-chart-bar`)

### Phase 6: Residents Section (Week 6)
**Priority: MEDIUM**

- [ ] **Todo 6.1**: Create Residents pages (separate from Users)
  - Create `src/pages/apps/resident/list/index.vue`
  - Create `src/pages/apps/resident/details/[id].vue`
  - Create `src/pages/apps/resident/assignments.vue` (property assignments)

- [ ] **Todo 6.2**: Implement resident management
  - Add resident CRUD operations
  - Add property assignment UI
  - Add bulk import for residents

- [ ] **Todo 6.3**: Add Residents to navigation
  - Add to Super Admin and Administrator navigation
  - Configure community-scoped access
  - Add appropriate icons (`tabler-users`)

### Phase 7: Notifications (Week 7)
**Priority: LOW**

- [ ] **Todo 7.1**: Create Notifications pages
  - Create `src/pages/apps/notifications/center.vue`
  - Create `src/pages/apps/notifications/announcements.vue`
  - Create `src/pages/apps/notifications/settings.vue`

- [ ] **Todo 7.2**: Implement notification system
  - Add real-time notifications using Supabase Realtime
  - Add notification bell in header
  - Add unread count badge

- [ ] **Todo 7.3**: Add Notifications to navigation
  - Add to all role navigations
  - Add appropriate icons (`tabler-bell`)

### Phase 8: Settings & Configuration (Week 8)
**Priority: LOW**

- [ ] **Todo 8.1**: Create Settings pages
  - Create `src/pages/settings/system.vue` (Super Admin)
  - Create `src/pages/settings/community.vue` (Administrator)
  - Create `src/pages/settings/profile.vue` (All users)
  - Create `src/pages/settings/preferences.vue` (All users)

- [ ] **Todo 8.2**: Implement settings management
  - Add system configuration options
  - Add community-specific settings
  - Add user preferences

- [ ] **Todo 8.3**: Add Settings to navigation
  - Add to all role navigations with appropriate scope
  - Add appropriate icons (`tabler-settings`)

### Phase 9: Dealer Management (Week 9)
**Priority: LOW** (if dealer features are needed)

- [ ] **Todo 9.1**: Create Dealer pages
  - Create `src/pages/apps/dealer/list/index.vue`
  - Create `src/pages/apps/dealer/add.vue`
  - Create `src/pages/apps/dealer/details/[id].vue`

- [ ] **Todo 9.2**: Implement dealer-administrator assignment
  - Add UI for assigning administrators to dealers
  - Add UI for dealers to manage their administrators

- [ ] **Todo 9.3**: Add Dealer section to Super Admin navigation
  - Add under Users & Access section
  - Add appropriate icons (`tabler-briefcase`)

### Phase 10: Navigation Polish & UX (Week 10)
**Priority: LOW**

- [ ] **Todo 10.1**: Add navigation features
  - Add search in navigation menu
  - Add recently accessed pages
  - Add favorites/bookmarks

- [ ] **Todo 10.2**: Improve mobile navigation
  - Test navigation on mobile devices
  - Optimize navigation drawer behavior
  - Add touch gestures

- [ ] **Todo 10.3**: Add navigation animations
  - Add smooth transitions
  - Add loading states
  - Add skeleton screens

---

## Design Principles

### 1. Progressive Disclosure
- Show only what users need based on their role
- Avoid overwhelming users with too many options
- Use collapsible sections for complex menus

### 2. Consistency
- Use consistent icons across the application
- Use consistent naming conventions
- Follow established UI patterns from Vuetify template

### 3. Accessibility
- Ensure keyboard navigation works
- Add proper ARIA labels
- Support screen readers

### 4. Performance
- Lazy load navigation items
- Cache navigation configuration
- Minimize re-renders

### 5. Scalability
- Design for future feature additions
- Use modular navigation configuration
- Support dynamic menu items

---

## Technical Implementation

### Navigation Configuration Structure

Each role's navigation file should follow this structure:

```typescript
// src/navigation/vertical/administrator.ts
import type { VerticalNavItems } from '@layouts/types'

export default [
  { heading: 'Dashboard' },
  {
    title: 'Dashboard',
    icon: { icon: 'tabler-layout-dashboard' },
    to: 'dashboards-community',
  },

  { heading: 'Management' },
  {
    title: 'My Communities',
    icon: { icon: 'tabler-building-community' },
    children: [
      { title: 'List', to: 'apps-community-list' },
      { title: 'Settings', to: 'apps-community-settings' },
    ],
  },
  {
    title: 'Properties',
    icon: { icon: 'tabler-home' },
    children: [
      { title: 'List', to: 'apps-property-list' },
      { title: 'Add Property', to: 'apps-property-add' },
    ],
  },
  {
    title: 'Residents',
    icon: { icon: 'tabler-users' },
    children: [
      { title: 'List', to: 'apps-resident-list' },
      { title: 'Add Resident', to: 'apps-resident-add' },
    ],
  },

  { heading: 'Visitor Management' },
  {
    title: 'Visitors',
    icon: { icon: 'tabler-ticket' },
    children: [
      { title: 'Active Passes', to: 'apps-visitor-list' },
      { title: 'Create Pass', to: 'apps-visitor-create' },
      { title: 'History', to: 'apps-visitor-history' },
    ],
  },
  {
    title: 'Access Logs',
    icon: { icon: 'tabler-report' },
    children: [
      { title: 'Entry/Exit Logs', to: 'apps-access-logs-entry-exit' },
      { title: 'Reports', to: 'apps-access-logs-reports' },
    ],
  },

  { heading: 'Automation' },
  {
    title: 'Devices',
    icon: { icon: 'tabler-robot' },
    children: [
      { title: 'List Devices', to: 'apps-automation-device-list' },
      { title: 'Add Device', to: 'apps-automation-device-add' },
      { title: 'Gate Control', to: 'apps-automation-gate-control' },
    ],
  },

  { heading: 'Reports' },
  {
    title: 'Reports',
    icon: { icon: 'tabler-chart-bar' },
    children: [
      { title: 'Community Reports', to: 'apps-reports-community' },
      { title: 'Visitor Analytics', to: 'apps-reports-visitor-analytics' },
    ],
  },

  { heading: 'Settings' },
  {
    title: 'Settings',
    icon: { icon: 'tabler-settings' },
    children: [
      { title: 'Community Settings', to: 'settings-community' },
      { title: 'Profile', to: 'settings-profile' },
      { title: 'Preferences', to: 'settings-preferences' },
    ],
  },
] as VerticalNavItems
```

### Dynamic Navigation Loading

Update `src/navigation/vertical/index.ts`:

```typescript
import type { VerticalNavItems } from '@layouts/types'
import superAdminNav from './super-admin'
import dealerNav from './dealer'
import administratorNav from './administrator'
import residentNav from './resident'
import guardNav from './guard'
import clientNav from './client'

// Get current user role from auth
const getUserRole = (): string => {
  // This should get the role from your auth system
  const userData = JSON.parse(localStorage.getItem('userData') || '{}')
  return userData.role || 'client'
}

const getNavigationByRole = (role: string): VerticalNavItems => {
  const navigationMap: Record<string, VerticalNavItems> = {
    'Super Admin': superAdminNav,
    'Dealer': dealerNav,
    'Administrator': administratorNav,
    'Resident': residentNav,
    'Guard': guardNav,
    'Client': clientNav,
  }

  return navigationMap[role] || clientNav
}

export default getNavigationByRole(getUserRole())
```

### Route Meta Configuration

Each page should configure its route meta for permission checking:

```vue
<script setup lang="ts">
definePage({
  meta: {
    public: false,
    action: 'read',
    subject: 'Visitor',
    // Optional: restrict to specific roles
    roles: ['Super Admin', 'Administrator', 'Resident'],
  },
})
</script>
```

---

## Icon Reference

Use Tabler Icons for consistency:

| Section | Icon | Code |
|---------|------|------|
| Dashboard | 📊 | `tabler-layout-dashboard` |
| Communities | 🏘️ | `tabler-building-community` |
| Properties | 🏠 | `tabler-home` |
| Users | 👥 | `tabler-user` |
| Residents | 👤 | `tabler-users` |
| Visitors | 🎫 | `tabler-ticket` |
| Access Logs | 📋 | `tabler-report` |
| Automation | 🤖 | `tabler-robot` |
| Gate Control | 🚪 | `tabler-door` |
| Reports | 📊 | `tabler-chart-bar` |
| Analytics | 📈 | `tabler-chart-line` |
| Notifications | 🔔 | `tabler-bell` |
| Settings | ⚙️ | `tabler-settings` |
| Roles | 🔒 | `tabler-lock` |
| Permissions | 🔐 | `tabler-shield-lock` |
| Dealers | 💼 | `tabler-briefcase` |
| QR Scanner | 📷 | `tabler-qrcode` |
| Search | 🔍 | `tabler-search` |
| Help | ❓ | `tabler-help` |

---

## Next Steps

1. **Review this document** with stakeholders
2. **Prioritize features** based on business needs
3. **Start with Phase 1** (Core Navigation Structure)
4. **Implement incrementally** following the phase plan
5. **Test with real users** from each role
6. **Iterate based on feedback**

---

## Questions to Consider

Before implementing, clarify:

1. **Dealer Role**: Is the Dealer role actively used? Should it be prioritized?
2. **Guard Interface**: Do guards need a full web interface or mobile app?
3. **Resident Features**: What features do residents need most urgently?
4. **Reports**: What specific reports are most valuable?
5. **Notifications**: Are real-time notifications critical for Phase 1?

---

**Document Version:** 1.0
**Created By:** Claude Code
**Last Updated:** 2025-11-21
