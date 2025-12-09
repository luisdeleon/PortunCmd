declare global {
  interface Window {
    turnstile: TurnstileAPI
  }
  const turnstile: TurnstileAPI
}

interface TurnstileAPI {
  render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId?: string) => void
  remove: (widgetId: string) => void
  getResponse: (widgetId?: string) => string | undefined
  isExpired: (widgetId?: string) => boolean
  ready: (callback: () => void) => void
  execute: (container?: string | HTMLElement, options?: TurnstileRenderOptions) => void
}

interface TurnstileRenderOptions {
  sitekey: string
  callback?: (token: string) => void
  'error-callback'?: (errorCode: string) => void
  'expired-callback'?: () => void
  'timeout-callback'?: () => void
  'before-interactive-callback'?: () => void
  'after-interactive-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact' | 'flexible'
  action?: string
  cData?: string
  tabindex?: number
  execution?: 'render' | 'execute'
  appearance?: 'always' | 'execute' | 'interaction-only'
  language?: string
  'refresh-expired'?: 'auto' | 'manual' | 'never'
  'retry'?: 'auto' | 'never'
  'retry-interval'?: number
}

interface TurnstileValidationResponse {
  success: boolean
  challenge_ts?: string
  hostname?: string
  'error-codes'?: string[]
  action?: string
  cdata?: string
}

export { TurnstileAPI, TurnstileRenderOptions, TurnstileValidationResponse }
