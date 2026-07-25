import { invokeFlow, FlowError, SessionExpiredError } from '../../services/cloudFlow'
import { useAuth } from './useAuth'

/**
 * Like invokeFlow but guards authenticated endpoints with the OTP session token.
 * If the token is missing or expired, logs the user out, fires the global
 * 'smkb:session-expired' event (caught by App.vue's listener → redirect to
 * login), and throws SessionExpiredError so the calling view stops execution.
 *
 * Note: this checks token presence client-side; pass the token to the flow
 * (e.g. `{ authToken: getAuthToken(), ...params }` inside your service) so the
 * flow re-validates it server-side — table permissions are NOT enforced in flows.
 */
export async function invokeAuthFlow<T = void>(
  flowGuid: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const { getAuthToken, logout } = useAuth()
  if (!getAuthToken()) {
    logout()
    window.dispatchEvent(new CustomEvent('smkb:session-expired'))
    throw new SessionExpiredError()
  }
  try {
    return await invokeFlow<T>(flowGuid, params)
  } catch (e) {
    // Server-side token rejection (invalid/expired) → treat like a client-side expiry.
    if (e instanceof FlowError && (e.code === 'UNAUTHORIZED' || e.code === 'SESSION_EXPIRED')) {
      logout()
      window.dispatchEvent(new CustomEvent('smkb:session-expired'))
      throw new SessionExpiredError()
    }
    throw e
  }
}
