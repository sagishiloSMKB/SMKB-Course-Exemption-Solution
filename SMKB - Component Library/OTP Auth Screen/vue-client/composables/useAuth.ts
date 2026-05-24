import { ref, computed, readonly } from 'vue'

// [ADAPT]: change SESSION_KEY to avoid collision with other SMKB apps on the same domain
const SESSION_KEY = 'smkb_auth_session'
const SESSION_TTL_MS = 30 * 60 * 1000

export interface AuthUser {
  /** Dataverse record ID of the authenticated user. */
  inviteeId: string
  /** Primary email used for display. */
  email: string
  firstName: string
  lastName: string
  /** Opaque session token generated server-side on OTP success. Include in all subsequent flow calls. */
  authToken: string
  /** ISO 8601 UTC — token expires 1 hour after OTP verification (enforced server-side in Dataverse). */
  authTokenExpiresAt: string
}

interface StoredSession extends AuthUser {
  loginAt: number
}

function loadFromStorage(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const stored = JSON.parse(raw) as StoredSession
    if (Date.now() - stored.loginAt > SESSION_TTL_MS) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    const { loginAt: _, ...user } = stored
    if (!user.inviteeId?.trim()) {
      sessionStorage.removeItem(SESSION_KEY)
      return null
    }
    return user
  } catch {
    return null
  }
}

const _user = ref<AuthUser | null>(loadFromStorage())
const isAuthenticated = computed(() => _user.value !== null)

function login(u: AuthUser) {
  _user.value = u
  const stored: StoredSession = { ...u, loginAt: Date.now() }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored))
}

function logout() {
  _user.value = null
  sessionStorage.removeItem(SESSION_KEY)
}

function getAuthToken(): string | null {
  const u = _user.value
  if (!u?.authToken) return null
  if (u.authTokenExpiresAt && Date.now() >= new Date(u.authTokenExpiresAt).getTime()) return null
  return u.authToken
}

export function useAuth() {
  return { user: readonly(_user), isAuthenticated, login, logout, getAuthToken }
}
