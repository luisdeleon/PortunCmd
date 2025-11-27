export default [
  { heading: 'Management' },

  // Communities
  {
    title: 'Communities',
    icon: { icon: 'tabler-building-community' },
    children: [
      { title: 'List', to: 'apps-community-list' },
      // TODO: Add these pages
      // { title: 'Add', to: 'apps-community-add' },
    ],
  },

  // Properties
  {
    title: 'Properties',
    icon: { icon: 'tabler-home' },
    children: [
      { title: 'List', to: 'apps-property-list' },
      // TODO: Add these pages
      // { title: 'Add', to: 'apps-property-add' },
    ],
  },

  // Users - Hidden from Guard and Resident
  {
    title: 'Users',
    icon: { icon: 'tabler-users' },
    action: 'read',
    subject: 'users',
    children: [
      { title: 'List', to: 'apps-user-list', action: 'read', subject: 'users' },
      { title: 'Add', to: 'apps-user-add', action: 'read', subject: 'users' },
    ],
  },

  { heading: 'Visitor Access' },

  // Visitor Management - Core Feature
  {
    title: 'Visitors',
    icon: { icon: 'tabler-ticket' },
    children: [
      { title: 'Active Passes', to: 'apps-visitor-list' },
      { title: 'Create Pass', to: 'apps-visitor-add', action: 'create', subject: 'visitor_pass' },
      { title: 'Access Logs', to: 'apps-visitor-logs' },
      // { title: 'Scanner', to: 'apps-visitor-scanner' }, // For guards - TODO
    ],
  },

  {
    heading: 'Automation',
    action: 'read',
    subject: 'automation',
  },

  // Devices / IoT
  {
    title: 'Devices',
    icon: { icon: 'tabler-device-desktop' },
    action: 'read',
    subject: 'automation',
    children: [
      { title: 'List', to: 'apps-devices-list', action: 'read', subject: 'automation' },
      // { title: 'Add', to: 'apps-devices-add' },
      // { title: 'Gate Control', to: 'apps-devices-gate-control' },
    ],
  },

  {
    heading: 'Access Control',
    action: 'manage',
    subject: 'all',
  },

  // Roles & Permissions - Super Admin only
  {
    title: 'Roles',
    icon: { icon: 'tabler-shield-check' },
    to: 'apps-roles',
    action: 'manage',
    subject: 'all',
  },
  {
    title: 'Permissions',
    icon: { icon: 'tabler-lock' },
    to: 'apps-permissions',
    action: 'manage',
    subject: 'all',
  },

  // Hidden template items - Uncomment if needed later
  // { heading: 'Template Features' },
  // {
  //   title: 'Ecommerce',
  //   icon: { icon: 'tabler-shopping-cart' },
  //   children: [
  //     { title: 'Dashboard', to: 'apps-ecommerce-dashboard' },
  //     {
  //       title: 'Product',
  //       children: [
  //         { title: 'List', to: 'apps-ecommerce-product-list' },
  //         { title: 'Add', to: 'apps-ecommerce-product-add' },
  //         { title: 'Category', to: 'apps-ecommerce-product-category-list' },
  //       ],
  //     },
  //     {
  //       title: 'Order',
  //       children: [
  //         { title: 'List', to: 'apps-ecommerce-order-list' },
  //         { title: 'Details', to: { name: 'apps-ecommerce-order-details-id', params: { id: '9042' } } },
  //       ],
  //     },
  //     {
  //       title: 'Customer',
  //       children: [
  //         { title: 'List', to: 'apps-ecommerce-customer-list' },
  //         { title: 'Details', to: { name: 'apps-ecommerce-customer-details-id', params: { id: 478426 } } },
  //       ],
  //     },
  //     { title: 'Manage Review', to: 'apps-ecommerce-manage-review' },
  //     { title: 'Referrals', to: 'apps-ecommerce-referrals' },
  //     { title: 'Settings', to: 'apps-ecommerce-settings' },
  //   ],
  // },
  // {
  //   title: 'Academy',
  //   icon: { icon: 'tabler-school' },
  //   children: [
  //     { title: 'Dashboard', to: 'apps-academy-dashboard' },
  //     { title: 'My Course', to: 'apps-academy-my-course' },
  //     { title: 'Course Details', to: 'apps-academy-course-details' },
  //   ],
  // },
  // {
  //   title: 'Logistics',
  //   icon: { icon: 'tabler-truck' },
  //   children: [
  //     { title: 'Dashboard', to: 'apps-logistics-dashboard' },
  //     { title: 'Fleet', to: 'apps-logistics-fleet' },
  //   ],
  // },
  // { title: 'Email', icon: { icon: 'tabler-mail' }, to: 'apps-email' },
  // { title: 'Chat', icon: { icon: 'tabler-message-circle-2' }, to: 'apps-chat' },
  // { title: 'Calendar', icon: { icon: 'tabler-calendar' }, to: 'apps-calendar' },
  // { title: 'Kanban', icon: { icon: 'tabler-layout-kanban' }, to: 'apps-kanban' },
  // {
  //   title: 'Invoice',
  //   icon: { icon: 'tabler-file-invoice' },
  //   children: [
  //     { title: 'List', to: 'apps-invoice-list' },
  //     { title: 'Preview', to: { name: 'apps-invoice-preview-id', params: { id: '5036' } } },
  //     { title: 'Edit', to: { name: 'apps-invoice-edit-id', params: { id: '5036' } } },
  //     { title: 'Add', to: 'apps-invoice-add' },
  //   ],
  // },
  // {
  //   title: 'Pages',
  //   icon: { icon: 'tabler-file' },
  //   children: [
  //     { title: 'User Profile', to: { name: 'pages-user-profile-tab', params: { tab: 'profile' } } },
  //     { title: 'Account Settings', to: { name: 'pages-account-settings-tab', params: { tab: 'account' } } },
  //     { title: 'Pricing', to: 'pages-pricing' },
  //     { title: 'FAQ', to: 'pages-faq' },
  //     {
  //       title: 'Miscellaneous',
  //       children: [
  //         { title: 'Coming Soon', to: 'pages-misc-coming-soon', target: '_blank' },
  //         { title: 'Under Maintenance', to: 'pages-misc-under-maintenance', target: '_blank' },
  //         { title: 'Page Not Found - 404', to: { path: '/pages/misc/not-found' }, target: '_blank' },
  //         { title: 'Not Authorized - 401', to: { path: '/pages/misc/not-authorized' }, target: '_blank' },
  //       ],
  //     },
  //   ],
  // },
]
