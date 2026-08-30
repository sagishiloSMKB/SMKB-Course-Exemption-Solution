import { invokeFlow } from '../../services/cloudFlow'
import { createSessionCache } from '../../utils/sessionCache'
import { OTP_FLOWS } from './otpFlows'

export interface PortalConfig {
  supportPhone: string
  supportEmail: string
  /** Cloudflare Turnstile public site key. Empty = Turnstile disabled (no widget shown). */
  turnstileSiteKey: string
}

const EMPTY_CONFIG: PortalConfig = { supportPhone: '', supportEmail: '', turnstileSiteKey: '' }

// Uses the kit's own createSessionCache rather than a hand-rolled `let _cached`. The hand-rolled
// version had no in-flight de-duplication, and both OtpLoginView and LockedOutView call this on
// mount: two concurrent callers each fired the flow, so a single login could cost two anonymous
// flow invocations. The cache is the module that already solved this - including the
// invalidate-during-inflight race.
const _cache = createSessionCache<PortalConfig>(async () => {
  if (!OTP_FLOWS.getPortalConfig) return EMPTY_CONFIG
  const data = await invokeFlow<Partial<PortalConfig>>(OTP_FLOWS.getPortalConfig, {})
  return {
    supportPhone: typeof data?.supportPhone === 'string' ? data.supportPhone : '',
    supportEmail: typeof data?.supportEmail === 'string' ? data.supportEmail : '',
    turnstileSiteKey: typeof data?.turnstileSiteKey === 'string' ? data.turnstileSiteKey : '',
  }
})

/**
 * Public (anonymous) portal config - support contact details and the Turnstile site key.
 * De-duplicated and cached for the session; a failure falls back to an empty config (and is NOT
 * cached, so the next caller retries) so login still works, just without a captcha or support
 * details.
 */
export async function getPortalConfig(): Promise<PortalConfig> {
  try {
    return await _cache.get()
  } catch {
    return EMPTY_CONFIG
  }
}

/** Drop the cached config - for a test, or after an admin changes the portal settings. */
export function invalidatePortalConfig(): void {
  _cache.invalidate()
}
