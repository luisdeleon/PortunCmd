import apps from './apps'
// Hidden for now - Uncomment to restore
// import charts from './charts'
// import dashboard from './dashboard'
// import forms from './forms'
// import misc from './misc'
// import pages from './pages'
// import tables from './tables'
// import uiElements from './ui-elements'
import type { HorizontalNavItems } from '@layouts/types'

// Only showing Apps section with Community, User, and Roles & Permissions
export default [...apps] as HorizontalNavItems
