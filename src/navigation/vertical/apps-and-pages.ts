export default [
  { heading: 'Apps & Pages' },
  // Hidden for now - Uncomment to restore
  // {
  //   title: 'Ecommerce',
  //   icon: { icon: 'tabler-shopping-cart' },
  //   children: [
  //     {
  //       title: 'Dashboard',
  //       to: 'apps-ecommerce-dashboard',
  //     },
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
  //     {
  //       title: 'Manage Review',
  //       to: 'apps-ecommerce-manage-review',
  //     },
  //     {
  //       title: 'Referrals',
  //       to: 'apps-ecommerce-referrals',
  //     },
  //     {
  //       title: 'Settings',
  //       to: 'apps-ecommerce-settings',
  //     },
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
  // {
  //   title: 'Email',
  //   icon: { icon: 'tabler-mail' },
  //   to: 'apps-email',
  // },
  // {
  //   title: 'Chat',
  //   icon: { icon: 'tabler-message-circle-2' },
  //   to: 'apps-chat',
  // },
  // {
  //   title: 'Calendar',
  //   icon: { icon: 'tabler-calendar' },
  //   to: 'apps-calendar',
  // },
  // {
  //   title: 'Kanban',
  //   icon: { icon: 'tabler-layout-kanban' },
  //   to: 'apps-kanban',
  // },
  // {
  //   title: 'Invoice',
  //   icon: { icon: 'tabler-file-invoice' },
  //
  //   children: [
  //     { title: 'List', to: 'apps-invoice-list' },
  //     { title: 'Preview', to: { name: 'apps-invoice-preview-id', params: { id: '5036' } } },
  //     { title: 'Edit', to: { name: 'apps-invoice-edit-id', params: { id: '5036' } } },
  //     { title: 'Add', to: 'apps-invoice-add' },
  //   ],
  // },
  {
    title: 'Community',
    icon: { icon: 'tabler-building-community' },
    children: [
      { title: 'List', to: 'apps-community-list' },
    ],
  },
  {
    title: 'Property',
    icon: { icon: 'tabler-home' },
    children: [
      { title: 'List', to: 'apps-property-list' },
    ],
  },
  {
    title: 'User',
    icon: { icon: 'tabler-user' },
    children: [
      { title: 'List', to: 'apps-user-list' },
    ],
  },
  {
    title: 'Roles',
    icon: { icon: 'tabler-lock' },
    children: [
      { title: 'List', to: 'apps-roles' },
    ],
  },

  // Hidden for now - Uncomment to restore
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
  // {
  //   title: 'Authentication',
  //   icon: { icon: 'tabler-shield-lock' },
  //   children: [
  //     {
  //       title: 'Login',
  //       children: [
  //         { title: 'Login v1', to: 'pages-authentication-login-v1', target: '_blank' },
  //         { title: 'Login v2', to: 'pages-authentication-login-v2', target: '_blank' },
  //       ],
  //     },
  //     {
  //       title: 'Register',
  //       children: [
  //         { title: 'Register v1', to: 'pages-authentication-register-v1', target: '_blank' },
  //         { title: 'Register v2', to: 'pages-authentication-register-v2', target: '_blank' },
  //         { title: 'Register Multi-Steps', to: 'pages-authentication-register-multi-steps', target: '_blank' },
  //       ],
  //     },
  //     {
  //       title: 'Verify Email',
  //       children: [
  //         { title: 'Verify Email v1', to: 'pages-authentication-verify-email-v1', target: '_blank' },
  //         { title: 'Verify Email v2', to: 'pages-authentication-verify-email-v2', target: '_blank' },
  //       ],
  //     },
  //     {
  //       title: 'Forgot Password',
  //       children: [
  //         { title: 'Forgot Password v1', to: 'pages-authentication-forgot-password-v1', target: '_blank' },
  //         { title: 'Forgot Password v2', to: 'pages-authentication-forgot-password-v2', target: '_blank' },
  //       ],
  //     },
  //     {
  //       title: 'Reset Password',
  //       children: [
  //         { title: 'Reset Password v1', to: 'pages-authentication-reset-password-v1', target: '_blank' },
  //         { title: 'Reset Password v2', to: 'pages-authentication-reset-password-v2', target: '_blank' },
  //       ],
  //     },
  //     {
  //       title: 'Two Steps',
  //       children: [
  //         { title: 'Two Steps v1', to: 'pages-authentication-two-steps-v1', target: '_blank' },
  //         { title: 'Two Steps v2', to: 'pages-authentication-two-steps-v2', target: '_blank' },
  //       ],
  //     },
  //   ],
  // },
  // {
  //   title: 'Wizard Examples',
  //   icon: { icon: 'tabler-dots' },
  //   children: [
  //     { title: 'Checkout', to: { name: 'wizard-examples-checkout' } },
  //     { title: 'Property Listing', to: { name: 'wizard-examples-property-listing' } },
  //     { title: 'Create Deal', to: { name: 'wizard-examples-create-deal' } },
  //   ],
  // },
  // {
  //   title: 'Dialog Examples',
  //   icon: { icon: 'tabler-square' },
  //   to: 'pages-dialog-examples',
  // },
]
