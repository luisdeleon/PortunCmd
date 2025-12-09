import type { TurnstileValidationResponse } from '@/types/turnstile'
import { supabase } from '@/lib/supabase'

// Use onload callback instead of turnstile.ready() to avoid async/defer issues
const TURNSTILE_CALLBACK_NAME = '__onTurnstileLoad__'
const TURNSTILE_SCRIPT_URL = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=${TURNSTILE_CALLBACK_NAME}`

// Global promise to track script loading
let scriptLoadPromise: Promise<void> | null = null

/**
 * Load the Turnstile script with onload callback
 */
const loadTurnstileScript = (): Promise<void> => {
  // Return existing promise if already loading/loaded
  if (scriptLoadPromise) {
    return scriptLoadPromise
  }

  // Already loaded
  if (typeof window !== 'undefined' && window.turnstile) {
    scriptLoadPromise = Promise.resolve()
    return scriptLoadPromise
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    // Set up the global callback that Turnstile will call when ready
    ;(window as any)[TURNSTILE_CALLBACK_NAME] = () => {
      resolve()
    }

    // Check if script already exists
    const existingScript = document.querySelector(`script[src*="challenges.cloudflare.com/turnstile"]`)
    if (existingScript) {
      // Script exists, check if turnstile is ready
      if (window.turnstile) {
        resolve()
        return
      }
      // Wait for it to load
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Turnstile')))
      return
    }

    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT_URL
    script.async = true

    script.onerror = () => {
      scriptLoadPromise = null
      reject(new Error('Failed to load Turnstile script'))
    }

    document.head.appendChild(script)
  })

  return scriptLoadPromise
}

export const useTurnstile = () => {
  const token = ref<string | null>(null)
  const widgetId = ref<string | null>(null)
  const isLoaded = ref(false)
  const isVerified = ref(false)
  const isExpired = ref(false)
  const error = ref<string | null>(null)

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string

  /**
   * Render the Turnstile widget in a container
   */
  const render = async (containerId: string, options?: {
    theme?: 'light' | 'dark' | 'auto'
    size?: 'normal' | 'compact' | 'flexible'
    action?: string
    language?: string
  }) => {
    try {
      await loadTurnstileScript()
      isLoaded.value = true

      // Remove existing widget if any
      if (widgetId.value) {
        try {
          turnstile.remove(widgetId.value)
        }
        catch {
          // Widget might already be removed
        }
      }

      // Reset state
      token.value = null
      isVerified.value = false
      isExpired.value = false
      error.value = null

      // Render the widget directly (script is already loaded via onload callback)
      widgetId.value = turnstile.render(containerId, {
        sitekey: siteKey,
        theme: options?.theme ?? 'auto',
        size: options?.size ?? 'normal',
        action: options?.action,
        language: options?.language,
        callback: (responseToken: string) => {
          token.value = responseToken
          isVerified.value = true
          isExpired.value = false
          error.value = null
        },
        'expired-callback': () => {
          token.value = null
          isVerified.value = false
          isExpired.value = true
        },
        'error-callback': (errorCode: string) => {
          token.value = null
          isVerified.value = false
          error.value = errorCode
          console.error('Turnstile error:', errorCode)
        },
        'timeout-callback': () => {
          token.value = null
          isVerified.value = false
          isExpired.value = true
        },
      })
    }
    catch (err) {
      console.error('Failed to render Turnstile:', err)
      error.value = 'Failed to render security widget'
    }
  }

  /**
   * Reset the Turnstile widget
   */
  const reset = () => {
    if (widgetId.value) {
      try {
        turnstile.reset(widgetId.value)
      }
      catch {
        // Widget might not exist
      }
    }
    token.value = null
    isVerified.value = false
    isExpired.value = false
    error.value = null
  }

  /**
   * Remove the Turnstile widget from DOM
   */
  const remove = () => {
    if (widgetId.value) {
      try {
        turnstile.remove(widgetId.value)
      }
      catch {
        // Widget might not exist
      }
      widgetId.value = null
    }
    token.value = null
    isVerified.value = false
    isExpired.value = false
  }

  /**
   * Validate the Turnstile token server-side via Edge Function
   */
  const validate = async (): Promise<TurnstileValidationResponse> => {
    if (!token.value) {
      return {
        success: false,
        'error-codes': ['missing-input-response'],
      }
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('cloudflare-turnstile', {
        body: { token: token.value },
      })

      if (fnError) {
        console.error('Turnstile validation error:', fnError)
        return {
          success: false,
          'error-codes': ['internal-error'],
        }
      }

      return data as TurnstileValidationResponse
    }
    catch (err) {
      console.error('Turnstile validation failed:', err)
      return {
        success: false,
        'error-codes': ['internal-error'],
      }
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    remove()
  })

  return {
    // State
    token: readonly(token),
    isLoaded: readonly(isLoaded),
    isVerified: readonly(isVerified),
    isExpired: readonly(isExpired),
    error: readonly(error),
    siteKey,

    // Methods
    render,
    reset,
    remove,
    validate,
  }
}
