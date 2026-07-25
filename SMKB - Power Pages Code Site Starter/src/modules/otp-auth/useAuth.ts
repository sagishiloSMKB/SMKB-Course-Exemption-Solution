import { ref, computed, readonly } from 'vue'
import { SESSION_STORAGE_KEY } from '../../config/solution'
import { safeJsonParse } from '../../utils/safeJson'

export interface AuthUser {
  userId: string
  email: string
  firstName: string
  lastName: string
  /** Solution-defined status string (e.g. 'Pending' | 'Active' | 'Archived'). */
  status: string
  authToken: string
  authTokenExpiresAt: string
}

function loadFromStorage(): AuthUser | null {
  const stored = safeJsonParse<AuthUser | null>(sessionStorage.getItem(SESSION_STORAGE_KEY), null)
  if (!stored) return null
  if (stored.authTokenExpiresAt && Date.now() >= new Date(stored.authTokenExpiresAt).getTime()) {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
  const user: AuthUser = {
    userId:             stored.userId,
    email:              stored.email,
    firstName:          stored.firstName,
    lastName:           stored.lastName,
    status:             stored.status,
    authToken:          stored.authToken,
    authTokenExpiresAt: stored.authTokenExpiresAt,
  }
  if (!user.userId?.trim()) {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
    return null
  }
  return user
}

const _user = ref<AuthUser | null>(loadFromStorage())
const isAuthenticated = computed(() => _user.value !== null)

function login(u: AuthUser): void {
  _user.value = u
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(u))
}

function logout(): void {
  _user.value = null
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
}

function getAuthToken(): string | null {
  const u = _user.value
  if (!u?.authToken) return null
  if (u.authTokenExpiresAt && Date.now() >= new Date(u.authTokenExpiresAt).getTime()) return null
  return u.authToken
}

/**
 * Module-level singleton auth state for the OTP auth module, persisted in
 * sessionStorage (key derives from SOLUTION.prefix) with expiry checks on
 * load and on every getAuthToken() call.
 */
export function useAuth() {
  return { user: readonly(_user), isAuthenticated, login, logout, getAuthToken }
}
