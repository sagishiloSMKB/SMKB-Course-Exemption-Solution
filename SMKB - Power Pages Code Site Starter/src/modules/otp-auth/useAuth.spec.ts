// Runs under jsdom (vitest.config.ts -> environmentMatchGlobs). Not a detail: this module reads
// `sessionStorage` and arms `window` listeners at MODULE scope, so under the previous node-only
// test environment importing it threw before a single assertion ran. The idle timer, the
// absolute-expiry timer and the revoke path were UNTESTABLE, not merely untested — which is how
// the session-token bug that this file's first test covers reached a real deployment.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The revoke goes over the network. Stub the whole service so nothing here needs a flow, and so
// the tests can assert WHICH revoke path a logout took.
// Explicit signatures, not `vi.fn()` + a spread forward: an implementation-less `vi.fn()` is typed
// with an EMPTY argument tuple, so `(...a: unknown[]) => mock(...a)` fails to compile (TS2556) -
// and `npm run build` type-checks src/**, specs included.
const revokeSession = vi.fn<(token: string) => void>()
const revokeSessionAwaitable = vi.fn<(token: string, timeoutMs?: number) => Promise<void>>(
  () => Promise.resolve(),
)
vi.mock('./authService', () => ({
  revokeSession: (token: string) => revokeSession(token),
  revokeSessionAwaitable: (token: string, timeoutMs?: number) => revokeSessionAwaitable(token, timeoutMs),
}))

// Imported, not hardcoded: the key derives from SOLUTION.prefix, so a literal here would go
// stale the moment a solution fills in its own prefix and the test would assert about a key the
// app never writes.
import { SESSION_STORAGE_KEY as SESSION_KEY } from '../../config/solution'

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    userId: 'u-1',
    email: 'someone@smkb.ac.il',
    firstName: 'A',
    lastName: 'B',
    status: 'Active',
    authToken: 'tok-abc',
    authTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

/**
 * `useAuth` holds module-level singleton state, so every test needs a fresh module instance.
 * `resetModules()` + a dynamic import gives one; without it, test order decides the outcome.
 */
async function freshAuth() {
  vi.resetModules()
  const mod = await import('./useAuth')
  return mod.useAuth()
}

describe('useAuth', () => {
  beforeEach(() => {
    sessionStorage.clear()
    revokeSession.mockClear()
    revokeSessionAwaitable.mockClear()
    vi.useRealTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  // THE regression test. The retired vue-client wrote the session under one shape and read it
  // under another, so login() succeeded, isAuthenticated went true, and getAuthToken() returned
  // null — every authenticated flow call then failed with SESSION_EXPIRED on a session that had
  // just been created. One assertion would have caught it.
  it('login() makes getAuthToken() return the token it was given', async () => {
    const auth = await freshAuth()
    expect(auth.getAuthToken()).toBeNull()
    auth.login(makeUser() as never)
    expect(auth.isAuthenticated.value).toBe(true)
    expect(auth.getAuthToken()).toBe('tok-abc')
  })

  it('login() persists the session so a page reload restores it', async () => {
    const auth = await freshAuth()
    auth.login(makeUser() as never)
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '{}').authToken).toBe('tok-abc')

    // A reload = a fresh module instance reading the same storage.
    const reloaded = await freshAuth()
    expect(reloaded.isAuthenticated.value).toBe(true)
    expect(reloaded.getAuthToken()).toBe('tok-abc')
  })

  it('drops a stored session whose token has already expired', async () => {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify(makeUser({ authTokenExpiresAt: new Date(Date.now() - 1000).toISOString() })),
    )
    const auth = await freshAuth()
    expect(auth.isAuthenticated.value).toBe(false)
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('drops a stored session with no userId (a half-written record)', async () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(makeUser({ userId: '   ' })))
    const auth = await freshAuth()
    expect(auth.isAuthenticated.value).toBe(false)
  })

  it('getAuthToken() returns null once the absolute expiry passes, even while signed in', async () => {
    const auth = await freshAuth()
    auth.login(makeUser({ authTokenExpiresAt: new Date(Date.now() + 50).toISOString() }) as never)
    expect(auth.getAuthToken()).toBe('tok-abc')
    await new Promise((r) => setTimeout(r, 80))
    expect(auth.getAuthToken()).toBeNull()
  })

  // The gap this pass closed: isAuthenticated is `_user !== null`, so without a timer firing AT
  // the expiry instant it stayed true and the router guard kept letting the user navigate — the
  // two answers disagreed until the next flow call.
  it('signs the user out when the absolute expiry elapses, and fires smkb:session-expired', async () => {
    vi.useFakeTimers()
    const auth = await freshAuth()
    const onExpired = vi.fn()
    window.addEventListener('smkb:session-expired', onExpired)

    auth.login(makeUser({ authTokenExpiresAt: new Date(Date.now() + 5000).toISOString() }) as never)
    expect(auth.isAuthenticated.value).toBe(true)

    vi.advanceTimersByTime(5001)
    expect(auth.isAuthenticated.value).toBe(false)
    expect(onExpired).toHaveBeenCalledTimes(1)
    window.removeEventListener('smkb:session-expired', onExpired)
  })

  it('signs the user out after the 15-minute idle timeout', async () => {
    vi.useFakeTimers()
    const auth = await freshAuth()
    // Expiry far enough out that the IDLE timer is unambiguously the one that fires.
    auth.login(makeUser({ authTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }) as never)

    vi.advanceTimersByTime(15 * 60 * 1000 - 1000)
    expect(auth.isAuthenticated.value).toBe(true)
    vi.advanceTimersByTime(2000)
    expect(auth.isAuthenticated.value).toBe(false)
  })

  it('does not fire immediately for an absurdly distant expiry (the setTimeout int32 trap)', async () => {
    vi.useFakeTimers()
    const auth = await freshAuth()
    // > 2^31-1 ms (~24.8 days). An uncapped delay coerces to a negative int32 and fires AT ONCE,
    // so a corrupt expiry would sign the user out instantly instead of never.
    const farFuture = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString()
    auth.login(makeUser({ authTokenExpiresAt: farFuture }) as never)
    vi.advanceTimersByTime(1000)
    expect(auth.isAuthenticated.value).toBe(true)
  })

  it('logout() revokes fire-and-forget and clears local state', async () => {
    const auth = await freshAuth()
    auth.login(makeUser() as never)
    auth.logout()
    expect(revokeSession).toHaveBeenCalledWith('tok-abc')
    expect(auth.isAuthenticated.value).toBe(false)
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  // The navigation-safe path: the revoke must be AWAITED and must run BEFORE the token is
  // dropped, or a router.push() can abort it and leave the token valid server-side.
  it('logoutAndRevoke() awaits the bounded revoke before clearing state', async () => {
    let resolveRevoke: (() => void) | undefined
    let tokenAtRevoke: unknown
    revokeSessionAwaitable.mockImplementation((token: string) => {
      tokenAtRevoke = token
      return new Promise<void>((r) => { resolveRevoke = r })
    })

    const auth = await freshAuth()
    auth.login(makeUser() as never)

    const pending = auth.logoutAndRevoke()
    // Still signed in: the revoke has not settled yet.
    expect(auth.isAuthenticated.value).toBe(true)
    expect(tokenAtRevoke).toBe('tok-abc')

    resolveRevoke?.()
    await pending
    expect(auth.isAuthenticated.value).toBe(false)
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('logoutAndRevoke() is a no-op-safe call when nobody is signed in', async () => {
    const auth = await freshAuth()
    await expect(auth.logoutAndRevoke()).resolves.toBeUndefined()
    expect(revokeSessionAwaitable).not.toHaveBeenCalled()
  })
})
