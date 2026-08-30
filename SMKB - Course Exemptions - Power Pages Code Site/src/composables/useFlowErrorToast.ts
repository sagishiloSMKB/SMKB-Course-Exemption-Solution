import { useSmkbToast } from '@smkbacil/design-ui'
import { FlowError, SessionExpiredError } from '../services/cloudFlow'
import { flowErrorMessage } from '../services/flowErrors'

/**
 * Returns a `showFlowError(e)` handler for failed cloud-flow calls (saves/creates).
 * - Session expiry is ignored here — the global 'smkb:session-expired' listener
 *   (wired by the OTP auth module, if enabled) owns that redirect.
 * - Any other FlowError (or unknown error) is shown as a localized danger toast
 *   via services/flowErrors.ts.
 * Must be called from a component setup() so the underlying toast inject works.
 */
export function useFlowErrorToast() {
  const toast = useSmkbToast()
  return function showFlowError(e: unknown, fallback?: string): void {
    if (e instanceof SessionExpiredError) return
    const code = e instanceof FlowError ? e.code : undefined
    toast.error(flowErrorMessage(code, fallback))
  }
}
