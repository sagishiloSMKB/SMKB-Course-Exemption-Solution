import { invokeFlow } from '../../services/cloudFlow'
import { OTP_FLOWS } from './otpFlows'

export interface PortalConfig {
  supportPhone: string
  supportEmail: string
  /** Cloudflare Turnstile public site key. Empty = Turnstile disabled (no widget shown). */
  turnstileSiteKey: string
}

const EMPTY_CONFIG: PortalConfig = { supportPhone: '', supportEmail: '', turnstileSiteKey: '' }

let _cached: PortalConfig | null = null

/**
 * Public (anonymous) portal config — support contact details and the Turnstile
 * site key. Cached for the session; failures fall back to an empty config so
 * login still works (just without a captcha or support info).
 */
export async function getPortalConfig(): Promise<PortalConfig> {
  if (_cached) return _cached
  if (!OTP_FLOWS.getPortalConfig) return EMPTY_CONFIG
  try {
    const data = await invokeFlow<Partial<PortalConfig>>(OTP_FLOWS.getPortalConfig, {})
    const config: PortalConfig = {
      supportPhone: typeof data?.supportPhone === 'string' ? data.supportPhone : '',
      supportEmail: typeof data?.supportEmail === 'string' ? data.supportEmail : '',
      turnstileSiteKey: typeof data?.turnstileSiteKey === 'string' ? data.turnstileSiteKey : '',
    }
    _cached = config
    return config
  } catch {
    return EMPTY_CONFIG
  }
}
