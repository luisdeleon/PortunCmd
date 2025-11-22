import appsAndPages from './apps-and-pages'
// Hidden for now - Uncomment to restore template dashboards
// import dashboard from './dashboard'
// import charts from './charts'
// import forms from './forms'
// import others from './others'
// import uiElements from './ui-elements'
import type { VerticalNavItems } from '@layouts/types'

// Main navigation with singular Dashboard
export default [
  {
    title: 'Dashboard',
    icon: { icon: 'tabler-layout-dashboard' },
    to: 'dashboard',
  },
  ...appsAndPages,
] as VerticalNavItems
