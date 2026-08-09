import { ref, computed, readonly } from 'vue'
import { SESSION_STORAGE_KEY } from '../../config/solution'
import { safeJsonParse } from '../../utils/safeJson'
import { revokeSession } from './authService'

/**
 * Inactivity timeout, on top of the token's absolute expiry.
 *
 * The absolute expiry caps how long a session can live; this caps how long an
 * *abandoned* one stays usable on a shared or unattended machine. Both are needed:
 * a 1-hour token left open on a library PC is a 1-hour window without this.
 */
const IDLE_TIMEOUT_MS = 15 * 60 * 1000
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const
/** Ignore repeat activity inside this window so a mousemove storm is not a timer storm. */
const ACTIVITY_THROTTLE_MS = 30 * 1000

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

let idleTimer: ReturnType<typeof setTimeout> | null = null
let lastActivityAt = 0

function onActivity(): void {
  const now = Date.now()
  if (now - lastActivityAt < ACTIVITY_THROTTLE_MS) return
  lastActivityAt = now
  armIdleTimer()
}

function onVisibility(): void {
  // Coming back to a backgrounded tab counts as activity; leaving does not.
  if (document.visibilityState === 'visible') onActivity()
}

function armIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    // Same path as an explicit logout, including the server-side revoke.
    logout()
    window.dispatchEvent(new CustomEvent('smkb:session-expired'))
  }, IDLE_TIMEOUT_MS)
}

function startIdleWatch(): void {
  stopIdleWatch()
  lastActivityAt = Date.now()
  for (const e of ACTIVITY_EVENTS) window.addEventListener(e, onActivity, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  armIdleTimer()
}

function stopIdleWatch(): void {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
  for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, onActivity)
  document.removeEventListener('visibilitychange', onVisibility)
}

function login(u: AuthUser): void {
  _user.value = u
  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(u))
  startIdleWatch()
}

function logout(): void {
  // Revoke server-side FIRST, while the token is still in hand. Fire-and-forget:
  // if it fails, the absolute expiry still applies. Without this the token stays
  // valid server-side after logout, so a copied one outlives the session.
  const token = _user.value?.authToken
  if (token) revokeSession(token)
  stopIdleWatch()
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

// A page reload restores the session from storage without going through login(),
// so arm the idle watch here too - otherwise refreshing the page would silently
// disable the inactivity timeout for the rest of the session.
if (_user.value) startIdleWatch()
