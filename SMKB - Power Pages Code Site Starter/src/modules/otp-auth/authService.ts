import { invokeFlow, FlowError } from '../../services/cloudFlow'
import { OTP_FLOWS } from './otpFlows'

/**
 * Normalize an Israeli phone number: strip non-digits and convert a 972
 * country prefix to a leading 0. IL-specific — adapt for other locales.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits.startsWith('972') ? '0' + digits.slice(3) : digits
}

export interface OtpChannel {
  type: 'sms' | 'email_college' | 'email_personal'
  maskedValue: string
}

export interface CreateOtpResult {
  channels: OtpChannel[]
  errorCode: string | null
}

export interface CheckOtpResult {
  userId: string
  firstName: string
  lastName: string
  email: string
  status: string
  authToken: string
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

export async function createOtp(phone: string, turnstileToken = ''): Promise<CreateOtpResult> {
  phone = normalizePhone(phone)
  // DEV mock — active while no flow GUID is registered (see otpFlows.ts).
  if (import.meta.env.DEV && !OTP_FLOWS.createOtp) {
    return {
      channels: [
        { type: 'sms', maskedValue: '050****567' },
        { type: 'email_personal', maskedValue: 'de****@example.com' },
      ],
      errorCode: null,
    }
  }
  try {
    // The flow responds HTTP 200; invokeFlow throws FlowError when the body carries an errorCode.
    // `turnstileToken` maps to the create-OTP trigger field titled "turnstileToken" (Power Pages maps by title).
    const data = await invokeFlow<{ channels?: unknown }>(
      OTP_FLOWS.createOtp,
      { phone, origin: window.location.origin, turnstileToken },
    )
    if (!isValidOtpChannels(data?.channels)) return { channels: [], errorCode: 'OTP_SEND_FAILED' }
    return { channels: data.channels as OtpChannel[], errorCode: null }
  } catch (err) {
    // Business error → FlowError.code; transport failure also arrives as FlowError('ERROR').
    const code = err instanceof FlowError ? err.code : 'OTP_SEND_FAILED'
    return { channels: [], errorCode: code }
  }
}

/**
 * Invalidate a session token server-side. Fire-and-forget: the caller must not
 * await a result or care about failure, because the absolute token expiry is the
 * backstop. Without this, logout only clears sessionStorage and a copied token
 * keeps working until it expires on its own.
 *
 * The flow answers with the same body whatever happened (unknown token, already
 * expired, just revoked), so nothing here can be used to probe token validity.
 */
export function revokeSession(authToken: string): void {
  void revokeSessionAwaitable(authToken)
}

/**
 * The awaitable form. Resolves when the flow answers, or after `timeoutMs`, whichever
 * comes first - it never rejects and never blocks a logout indefinitely.
 *
 * Why this exists: logout is normally followed straight away by a navigation, and a
 * request in flight through `window.shell.ajaxSafePost` has no `keepalive`, so the
 * navigation can abort it and leave the token valid server-side - the exact failure
 * revocation exists to prevent. A `fetch(..., { keepalive: true })` beacon would survive
 * teardown, but it would also mean an ESLint exemption to the flows-only rule inside the
 * one file most likely to accumulate more of them. Awaiting a bounded promise before
 * navigating costs a few hundred milliseconds in a click handler and keeps the
 * architectural invariant intact, so `useAuth.logoutAndRevoke()` does that instead.
 */
export function revokeSessionAwaitable(authToken: string, timeoutMs = 1500): Promise<void> {
  if (!authToken || !OTP_FLOWS.revokeSession) return Promise.resolve()
  let done: (() => void) | undefined
  const timer = new Promise<void>((resolve) => {
    done = resolve
    setTimeout(resolve, timeoutMs)
  })
  try {
    void invokeFlow(OTP_FLOWS.revokeSession, { authToken })
      .catch(() => {
        /* Swallowed on purpose - the absolute expiry is the backstop. */
      })
      .finally(() => done?.())
  } catch {
    done?.()
  }
  return timer
}


export async function checkOtp(phone: string, otp: string): Promise<CheckOtpResult> {
  phone = normalizePhone(phone)
  const EMPTY = {
    userId: '', firstName: '', lastName: '', email: '',
    status: '', authToken: '', authTokenExpiresAt: '',
  }

  // DEV mock — any phone works, the OTP is 123456.
  if (import.meta.env.DEV && !OTP_FLOWS.checkOtp) {
    if (otp === '123456') {
      return {
        userId: 'mock-user-1', firstName: 'Dev', lastName: 'User',
        email: 'dev@example.com', status: 'Active',
        authToken: 'mock-token-dev-1',
        authTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        errorCode: null, attemptsRemaining: null,
      }
    }
    // INVALID_CODE, not WRONG_OTP: the hardened flow returns one generic code for
    // wrong / expired / no-pending-code so the response cannot be used to test whether
    // a number is registered. The mock mirrors the real contract.
    return { ...EMPTY, errorCode: 'INVALID_CODE', attemptsRemaining: 2 }
  }

  try {
    // The flow responds HTTP 200; invokeFlow throws FlowError when the body carries an errorCode.
    const data = await invokeFlow<Record<string, unknown>>(OTP_FLOWS.checkOtp, { phone, otp })
    const userId = typeof data?.userId === 'string' ? data.userId.trim() : ''
    if (!userId) return { ...EMPTY, errorCode: 'ERROR', attemptsRemaining: null }
    return {
      userId,
      firstName:          typeof data.firstName          === 'string' ? data.firstName          : '',
      lastName:           typeof data.lastName           === 'string' ? data.lastName           : '',
      email:              typeof data.email              === 'string' ? data.email              : '',
      status:             typeof data.status             === 'string' ? data.status             : '',
      authToken:          typeof data.authToken          === 'string' ? data.authToken          : '',
      authTokenExpiresAt: typeof data.authTokenExpiresAt === 'string' ? data.authTokenExpiresAt : '',
      errorCode: null, attemptsRemaining: null,
    }
  } catch (err) {
    // Business error (INVALID_CODE/LOCKED/…) → FlowError; INVALID_CODE carries attemptsRemaining in data.
    if (err instanceof FlowError) {
      const d = err.data as Record<string, unknown> | undefined
      return {
        ...EMPTY,
        errorCode: err.code,
        attemptsRemaining: typeof d?.attemptsRemaining === 'number' ? d.attemptsRemaining : null,
      }
    }
    return { ...EMPTY, errorCode: 'ERROR', attemptsRemaining: null }
  }
}
