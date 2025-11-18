import type { RouteNamedMap, _RouterTyped } from 'unplugin-vue-router'
import { canNavigate } from '@layouts/plugins/casl'
import { supabase } from '@/lib/supabase'

export const setupGuards = (router: _RouterTyped<RouteNamedMap & { [key: string]: any }>) => {
  // 👉 router.beforeEach
  // Docs: https://router.vuejs.org/guide/advanced/navigation-guards.html#global-before-guards
  router.beforeEach(async (to) => {
    /*
     * If it's a public route, continue navigation. This kind of pages are allowed to visited by login & non-login users. Basically, without any restrictions.
     * Examples of public routes are, 404, under maintenance, etc.
     */
    if (to.meta.public) {
      return
    }

    /**
     * Check if user is logged in by verifying both cookies AND Supabase session
     * This prevents issues where cookies exist but session has expired
     */
    const userData = useCookie('userData').value
    const accessToken = useCookie('accessToken').value
    const hasCookies = !!(userData && accessToken)

    let isLoggedIn = false

    // If cookies exist, verify the Supabase session is still valid
    if (hasCookies) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          // Session invalid - clear cookies immediately
          console.warn('Session expired or invalid, clearing cookies')
          useCookie('userData').value = null
          useCookie('accessToken').value = null
          useCookie('userAbilityRules').value = null
          isLoggedIn = false
        } else {
          // Session is valid
          isLoggedIn = true
        }
      } catch (error) {
        console.error('Session verification error:', error)
        // On error, clear cookies and treat as logged out
        useCookie('userData').value = null
        useCookie('accessToken').value = null
        useCookie('userAbilityRules').value = null
        isLoggedIn = false
      }
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
        // If ability check fails (e.g., ability not initialized), redirect to login for security
        console.error('Ability check failed, redirecting to login:', error)
        // Clear potentially corrupted cookies
        useCookie('userData').value = null
        useCookie('accessToken').value = null
        useCookie('userAbilityRules').value = null
        return {
          name: 'login',
          query: {
            ...to.query,
            to: to.fullPath !== '/' ? to.path : undefined,
          },
        }
      }
    }

    // All checks passed, continue navigation (implicit return undefined)
  })
}
