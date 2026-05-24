// [ADAPT]: ensure your config.ts exports FLOW_CREATE_OTP_URL and FLOW_CHECK_OTP_URL
// (read from window.__SMKB_FLOW_CREATE_OTP__ and window.__SMKB_FLOW_CHECK_OTP__ globals
//  injected by the Power Pages Liquid web template — see RECIPE.md step B)
import { config } from '../config'

export interface OtpChannel {
  type: 'sms' | 'email_college' | 'email_personal'
  maskedValue: string
}

export interface CreateOtpResult {
  channels: OtpChannel[]
  errorCode: string | null
}

export interface CheckOtpResult {
  inviteeId: string
  firstName: string
  lastName: string
  email: string
  /** Opaque session token generated server-side on OTP success. Include in all subsequent flow calls. */
  authToken: string
  /** ISO 8601 UTC — token expires 1 hour after OTP verification. */
  authTokenExpiresAt: string
  errorCode: string | null
  attemptsRemaining: number | null
}

const OTP_CHANNEL_TYPES = new Set<OtpChannel['type']>(['sms', 'email_college', 'email_personal'])

function isValidOtpChannels(raw: unknown): raw is OtpChannel[] {
  if (!Array.isArray(raw) || raw.length === 0) return false
  return raw.every(
    (c) =>
      c &&
      typeof c === 'object' &&
      OTP_CHANNEL_TYPES.has((c as OtpChannel).type) &&
      typeof (c as OtpChannel).maskedValue === 'string' &&
      (c as OtpChannel).maskedValue.length > 0,
  )
}

// [ADAPT]: rename contextId to your domain parameter (e.g. eventId, requestId) or remove it
// if your OTP flow does not require a context identifier.
export async function createOtp(email: string, contextId?: string): Promise<CreateOtpResult> {
  if (!config.FLOW_CREATE_OTP_URL) {
    if (import.meta.env.DEV) {
      return {
        channels: [
          { type: 'sms', maskedValue: '050****567' },
          { type: 'email_college', maskedValue: 'dev@smkb.ac.il' },
        ],
        errorCode: null,
      }
    }
    return { channels: [], errorCode: 'OTP_NOT_CONFIGURED' }
  }
  try {
    const res = await fetch(config.FLOW_CREATE_OTP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ...(contextId && { contextId }), origin: window.location.origin }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const bodyCode = (data as { code?: string }).code
      if (res.status === 429)
        return { channels: [], errorCode: bodyCode ?? 'RATE_LIMITED' }
      return { channels: [], errorCode: bodyCode ?? 'ERROR' }
    }
    const channels = (data as { channels?: unknown }).channels
    if (!isValidOtpChannels(channels)) return { channels: [], errorCode: 'OTP_SEND_FAILED' }
    return { channels, errorCode: null }
  } catch {
    return { channels: [], errorCode: 'OTP_SEND_FAILED' }
  }
}

// [ADAPT]: rename contextId to match createOtp above
export async function checkOtp(email: string, otp: string, contextId?: string): Promise<CheckOtpResult> {
  const EMPTY_TOKEN = { authToken: '', authTokenExpiresAt: '' }

  if (!config.FLOW_CHECK_OTP_URL) {
    if (!import.meta.env.DEV) throw new Error('FLOW_CHECK_OTP_URL is not configured')
    if (otp === '123456') {
      return {
        inviteeId: 'mock-user-1',
        firstName: 'משתמש',
        lastName: 'פיתוח',
        email,
        authToken: 'mock-token-dev-1',
        authTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        errorCode: null,
        attemptsRemaining: null,
      }
    }
    return { inviteeId: '', firstName: '', lastName: '', email: '', ...EMPTY_TOKEN, errorCode: 'WRONG_OTP', attemptsRemaining: 2 }
  }
  try {
    const res = await fetch(config.FLOW_CHECK_OTP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, ...(contextId && { contextId }) }),
    })
    const data = await res.json().catch(() => ({})) as Record<string, unknown>
    if (!res.ok) {
      return {
        inviteeId: '', firstName: '', lastName: '', email: '', ...EMPTY_TOKEN,
        errorCode: (data.code as string | undefined) ?? 'ERROR',
        attemptsRemaining: (data.attemptsRemaining as number | undefined) ?? null,
      }
    }
    const inviteeId = typeof data.inviteeId === 'string' ? data.inviteeId.trim() : ''
    if (!inviteeId) {
      return { inviteeId: '', firstName: '', lastName: '', email: '', ...EMPTY_TOKEN, errorCode: 'ERROR', attemptsRemaining: null }
    }
    const authToken = typeof data.authToken === 'string' ? data.authToken : ''
    const authTokenExpiresAt = typeof data.authTokenExpiresAt === 'string' ? data.authTokenExpiresAt : ''
    return {
      inviteeId,
      firstName: (data.firstName as string) ?? '',
      lastName:  (data.lastName  as string) ?? '',
      email:     (data.email     as string) ?? email,
      authToken,
      authTokenExpiresAt,
      errorCode: null,
      attemptsRemaining: null,
    }
  } catch {
    return { inviteeId: '', firstName: '', lastName: '', email: '', ...EMPTY_TOKEN, errorCode: 'ERROR', attemptsRemaining: null }
  }
}
