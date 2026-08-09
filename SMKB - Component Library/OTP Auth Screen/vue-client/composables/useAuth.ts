import { ref, computed, readonly } from 'vue'

import { revokeSession } from '../services/authService'

// [ADAPT]: change SESSION_KEY to avoid collision with other SMKB apps on the same domain
const SESSION_KEY = 'smkb_auth_session'

/**
 * Three limits act on a session, and they are NOT the same thing:
 *   SESSION_TTL_MS   - this client's own absolute cap since login (30 min).
 *   authTokenExpiresAt - the server's row expiry (1 hour), the real authority.
 *   IDLE_TIMEOUT_MS  - inactivity, so an abandoned tab on a shared machine dies early.
 * The strictest one wins. Every flow re-validates the server expiry regardless.
 */
const SESSION_TTL_MS = 30 * 60 * 1000
const IDLE_TIMEOUT_MS = 15 * 60 * 1000
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const
/** Ignore repeat activity inside this window so a mousemove storm is not a timer storm. */
const ACTIVITY_THROTTLE_MS = 30 * 1000

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

let idleTimer: ReturnType<typeof setTimeout> | null = null
let lastActivityAt = 0

function onActivity(): void {
  const now = Date.now()
  if (now - lastActivityAt < ACTIVITY_THROTTLE_MS) return
  lastActivityAt = now
  armIdleTimer()
}

function onVisibility(): void {
  // Returning to a backgrounded tab counts as activity; leaving does not.
  if (document.visibilityState === 'visible') onActivity()
}

function armIdleTimer(): void {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
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

function login(u: AuthUser) {
  _user.value = u
  const stored: StoredSession = { ...u, loginAt: Date.now() }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored))
  startIdleWatch()
}

function logout() {
  // Revoke server-side FIRST, while the token is still in hand. Fire-and-forget -
  // the absolute expiry is the backstop. Without this, logout clears only local
  // state and a copied token keeps working until it expires on its own.
  const token = _user.value?.authToken
  if (token) revokeSession(token)
  stopIdleWatch()
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

// A page reload restores the session from storage without going through login(),
// so arm the idle watch here too - otherwise a refresh would silently disable the
// inactivity timeout for the rest of the session.
if (_user.value) startIdleWatch()
