// Per-solution knobs for the OTP auth module. Adjust after running
// /ppcs-enable-otp-auth; the defaults work for a simple "login → home" app.

export interface OtpAuthConfig {
  /** Route path of the OTP login view. */
  loginPath: string
  /** Route path of the locked-out view (blocked statuses land here). */
  lockedOutPath: string
  /** Where an authenticated user lands (post-login and when visiting public paths). */
  homePath: string
  /**
   * User statuses (CheckOtpResult.status) that may not enter the app —
   * they are routed to lockedOutPath instead.
   */
  blockedStatuses: string[]
  /**
   * Optional post-login routing hook: return a route path to send the user
   * somewhere status-specific (e.g. an onboarding wizard for status 'Pending'),
   * or null to use the default (blockedStatuses → lockedOutPath, else homePath).
   */
  onLoginRedirect?: (status: string) => string | null
  /**
   * Optional per-navigation hook (runs in the router guard for authenticated
   * users after the blocked-status check): return a route path to force a
   * redirect (e.g. keep a not-yet-onboarded user inside a registration wizard),
   * or null to allow the navigation.
   */
  onNavigate?: (status: string, toPath: string) => string | null
}

export const OTP_AUTH_CONFIG: OtpAuthConfig = {
  loginPath: '/login',
  lockedOutPath: '/locked-out',
  homePath: '/',
  blockedStatuses: ['Archived'],
}
