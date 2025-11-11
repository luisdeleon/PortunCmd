import type { RouteNamedMap, _RouterTyped } from 'unplugin-vue-router'
import { canNavigate } from '@layouts/plugins/casl'
import { supabase } from '@/lib/supabase'

export const setupGuards = (router: _RouterTyped<RouteNamedMap & { [key: string]: any }>) => {
  // 👉 router.beforeEach
  // Docs: https://router.vuejs.org/guide/advanced/navigation-guards.html#global-before-guards
  router.beforeEach(to => {
    /*
     * If it's a public route, continue navigation. This kind of pages are allowed to visited by login & non-login users. Basically, without any restrictions.
     * Examples of public routes are, 404, under maintenance, etc.
     */
    if (to.meta.public) {
      return
    }

    /**
     * Check if user is logged in by checking cookies
     * For performance, we rely on cookies first. Session verification happens in background.
     */
    const userData = useCookie('userData').value
    const accessToken = useCookie('accessToken').value
    const hasCookies = !!(userData && accessToken)
    
    // Use cookies as primary indicator - session verification happens asynchronously
    const isLoggedIn = hasCookies
    
    // Verify session in background (non-blocking) if cookies exist
    if (hasCookies) {
      // Don't await - verify session asynchronously without blocking navigation
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error || !session) {
          // Session invalid - clear cookies
          useCookie('userData').value = null
          useCookie('accessToken').value = null
          useCookie('userAbilityRules').value = null
        }
      }).catch((error) => {
        console.error('Session verification error:', error)
        // On error, clear cookies
        useCookie('userData').value = null
        useCookie('accessToken').value = null
        useCookie('userAbilityRules').value = null
      })
    }

    /*
      If user is logged in and is trying to access login like page, redirect to home
      else allow visiting the page
    */
    if (to.meta.unauthenticatedOnly) {
      if (isLoggedIn) {
        return '/'
      } else {
        return
      }
    }

    // Only check navigation permissions if user is logged in
    // If not logged in, redirect to login (unless route is public)
    if (!isLoggedIn) {
      return {
        name: 'login',
        query: {
          ...to.query,
          to: to.fullPath !== '/' ? to.path : undefined,
        },
      }
    }

    // If logged in, check if user can navigate to this route
    // Only check if route has matched components and ability is available
    if (to.matched.length > 0) {
      try {
        if (!canNavigate(to)) {
          return { name: 'not-authorized' }
        }
      } catch (error) {
        // If ability check fails (e.g., ability not initialized), allow navigation
        console.warn('Ability check failed, allowing navigation:', error)
      }
    }

    // All checks passed, continue navigation (implicit return undefined)
  })
}
