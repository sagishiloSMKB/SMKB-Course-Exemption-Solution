// Generic Cloudflare Turnstile (captcha) composable - NOT an auth artifact.
// It lives here rather than inside src/modules/otp-auth/ because it is completely
// standalone: its only imports are `vue` and SOLUTION, and render(el, sitekey) takes the
// site key as a plain argument, so it has zero coupling to the OTP/session machinery.
// Any public form (contact, registration, feedback) can use it - see /ppcs-add-turnstile,
// which also covers the SERVER half, where the security actually lives.
import { ref, onUnmounted } from 'vue'
import { SOLUTION } from '../config/solution'

// Cloudflare Turnstile — explicit-render bootstrap.
// The widget protects the public OTP-send form: it produces a single-use token that the
// create-OTP flow verifies server-side (Cloudflare siteverify) before sending any SMS.
// When no site key is configured the widget is never rendered and login works as before.
//
// CSP note: requires challenges.cloudflare.com in script-src, frame-src and connect-src —
// /ppcs-enable-otp-auth adds those to both CSP site settings.

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface TurnstileRenderOptions {
  sitekey: string
  callback?: (token: string) => void
  'expired-callback'?: () => void
  // error-callback receives a Cloudflare error code string as its first argument.
  'error-callback'?: (errorCode?: string) => void
  'timeout-callback'?: () => void
  // Fired when the browser/client is incompatible with Turnstile (no challenge can run).
  'unsupported-callback'?: () => void
  theme?: 'auto' | 'light' | 'dark'
  language?: string
  size?: 'normal' | 'compact' | 'flexible'
  retry?: 'auto' | 'never'
  'retry-interval'?: number
  'refresh-expired'?: 'auto' | 'manual' | 'never'
}

interface TurnstileApi {
  render: (el: string | HTMLElement, opts: TurnstileRenderOptions) => string
  reset: (id?: string) => void
  remove: (id: string) => void
  getResponse: (id?: string) => string | undefined
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<void> | null = null

/** Inject the Turnstile script once and resolve when the API object is ready. */
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    // With render=explicit the API may attach a tick after `load` — poll briefly for readiness.
    const waitForApi = () => {
      let tries = 0
      const tick = () => {
        if (window.turnstile) return resolve()
        if (tries++ > 100) return reject(new Error('Turnstile API not ready'))
        setTimeout(tick, 50)
      }
      tick()
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]')
    if (existing) {
      waitForApi()
      return
    }

    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.setAttribute('data-turnstile', '')
    s.onload = waitForApi
    s.onerror = () => reject(new Error('Failed to load Turnstile script'))
    document.head.appendChild(s)
  })

  return scriptPromise
}

export function useTurnstile() {
  /** Current single-use token, or '' when unsolved / expired / errored. */
  const token = ref('')
  /** True once a render has been attempted and the script/API is available. */
  const ready = ref(false)
  /** True if the script or widget failed to initialise / run. */
  const failed = ref(false)
  /** Last Cloudflare error code (or 'unsupported' / 'script') — for diagnostics. */
  const lastError = ref('')

  let widgetId: string | null = null

  /** Render (or re-render) the widget into `el`. No-op without a site key. */
  async function render(el: HTMLElement | null, sitekey: string) {
    if (!sitekey || !el) return
    try {
      await loadScript()
    } catch {
      failed.value = true
      lastError.value = 'script'
      return
    }
    if (!window.turnstile) {
      failed.value = true
      lastError.value = 'script'
      return
    }
    // Remove any previous instance before binding to the (possibly new) element.
    if (widgetId !== null) {
      try { window.turnstile.remove(widgetId) } catch { /* already gone */ }
      widgetId = null
    }
    token.value = ''
    failed.value = false
    lastError.value = ''
    widgetId = window.turnstile.render(el, {
      sitekey,
      theme: 'light',
      language: SOLUTION.defaultLanguage,  // render the widget's own text in the app language
      size: 'flexible',       // adapt to the login-card / mobile width (Cloudflare's responsive option)
      retry: 'auto',          // auto-recover from transient network blips (default; explicit for intent)
      'refresh-expired': 'auto',
      // Success — also clears any prior transient failure so an auto-retry recovery removes the error.
      callback: (t: string) => { token.value = t; failed.value = false },
      'expired-callback': () => { token.value = '' },
      // error-callback can fire multiple times for one issue — the handler is idempotent.
      'error-callback': (code?: string) => { token.value = ''; failed.value = true; lastError.value = code ?? '' },
      // Browser/client can't run Turnstile at all — surface it as a failure too.
      'unsupported-callback': () => { token.value = ''; failed.value = true; lastError.value = 'unsupported' },
      // Interactive challenge timed out — clear the stale token and re-challenge.
      'timeout-callback': () => { token.value = ''; reset() },
    })
    ready.value = true
  }

  /** Clear and re-challenge to obtain a fresh token (tokens are single-use). */
  function reset() {
    token.value = ''
    failed.value = false
    if (window.turnstile && widgetId !== null) {
      try { window.turnstile.reset(widgetId) } catch { /* noop */ }
    }
  }

  function remove() {
    if (window.turnstile && widgetId !== null) {
      try { window.turnstile.remove(widgetId) } catch { /* noop */ }
    }
    widgetId = null
    token.value = ''
    ready.value = false
  }

  onUnmounted(remove)

  return { token, ready, failed, lastError, render, reset, remove }
}
