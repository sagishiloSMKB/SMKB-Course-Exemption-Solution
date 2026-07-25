import type { RouteLocationNormalized } from 'vue-router'
import { useAuth } from './useAuth'
import { OTP_AUTH_CONFIG } from './otpAuthConfig'

/**
 * Router guard for the OTP auth module. Install after enabling the module:
 *
 *   import { createOtpAuthGuard } from '../modules/otp-auth/guard'
 *   router.beforeEach(createOtpAuthGuard())
 *
 * Behavior:
 *   - Unauthenticated → loginPath (loginPath/lockedOutPath stay reachable)
 *   - Blocked status (OTP_AUTH_CONFIG.blockedStatuses) → lockedOutPath
 *   - Optional OTP_AUTH_CONFIG.onNavigate hook for solution-specific gating
 *     (e.g. force an onboarding wizard until the user's status is 'Active')
 *   - Authenticated users are kept away from loginPath / lockedOutPath → homePath
 */
export function createOtpAuthGuard() {
  const { loginPath, lockedOutPath, homePath, blockedStatuses, onNavigate } = OTP_AUTH_CONFIG
  const publicPaths = new Set([loginPath, lockedOutPath])

  return (to: RouteLocationNormalized) => {
    const { isAuthenticated, user } = useAuth()

    if (!isAuthenticated.value) {
      return publicPaths.has(to.path) ? true : loginPath
    }

    const status = user.value?.status ?? ''

    if (blockedStatuses.includes(status)) {
      return to.path === lockedOutPath ? true : lockedOutPath
    }

    const redirect = onNavigate?.(status, to.path)
    if (redirect && redirect !== to.path) return redirect

    // Authenticated and allowed — keep away from auth-only pages
    if (publicPaths.has(to.path)) return homePath

    return true
  }
}
