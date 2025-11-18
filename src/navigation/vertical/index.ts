import appsAndPages from './apps-and-pages'
// Hidden for now - Uncomment to restore
// import charts from './charts'
// import dashboard from './dashboard'
// import forms from './forms'
// import others from './others'
// import uiElements from './ui-elements'
import type { VerticalNavItems } from '@layouts/types'

// Only showing Apps & Pages section with Community, User, and Roles & Permissions
export default [...appsAndPages] as VerticalNavItems
