// Runs under jsdom (src/modules/** glob): this chain dispatches a window event and reads
// sessionStorage.
//
// The contract being pinned: an authenticated call whose token is missing OR rejected
// server-side must (1) sign the user out, (2) fire `smkb:session-expired` so App.vue redirects,
// and (3) throw SessionExpiredError — not FlowError — so the calling view stops. Getting any one
// of the three wrong leaves the user on a page that looks signed in and cannot load anything.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FlowError, SessionExpiredError } from '../../services/cloudFlow'

const invokeFlow = vi.fn()
vi.mock('../../services/cloudFlow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/cloudFlow')>()
  return { ...actual, invokeFlow: (...a: unknown[]) => invokeFlow(...a) }
})
vi.mock('./authService', () => ({
  revokeSession: vi.fn(),
  revokeSessionAwaitable: vi.fn(() => Promise.resolve()),
}))

const GUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

async function fresh() {
  vi.resetModules()
  const [{ invokeAuthFlow }, { useAuth }] = await Promise.all([
    import('./invokeAuthFlow'),
    import('./useAuth'),
  ])
  return { invokeAuthFlow, auth: useAuth() }
}

function signIn(auth: { login: (u: never) => void }) {
  auth.login({
    userId: 'u-1', email: 'a@smkb.ac.il', firstName: 'A', lastName: 'B', status: 'Active',
    authToken: 'tok', authTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
  } as never)
}

describe('invokeAuthFlow', () => {
  beforeEach(() => {
    sessionStorage.clear()
    invokeFlow.mockReset()
  })

  it('passes through to invokeFlow when a valid token is held', async () => {
    const { invokeAuthFlow, auth } = await fresh()
    signIn(auth)
    invokeFlow.mockResolvedValue({ rows: 2 })
    await expect(invokeAuthFlow<{ rows: number }>(GUID, { q: 1 })).resolves.toEqual({ rows: 2 })
    expect(invokeFlow).toHaveBeenCalledWith(GUID, { q: 1 })
  })

  it('with no session: logs out, fires smkb:session-expired, throws SessionExpiredError, and never calls the flow', async () => {
    const { invokeAuthFlow } = await fresh()
    const onExpired = vi.fn()
    window.addEventListener('smkb:session-expired', onExpired)

    await expect(invokeAuthFlow(GUID)).rejects.toBeInstanceOf(SessionExpiredError)
    expect(onExpired).toHaveBeenCalledTimes(1)
    expect(invokeFlow).not.toHaveBeenCalled()
    window.removeEventListener('smkb:session-expired', onExpired)
  })

  it('maps a server-side UNAUTHORIZED to a logout + SessionExpiredError', async () => {
    const { invokeAuthFlow, auth } = await fresh()
    signIn(auth)
    const onExpired = vi.fn()
    window.addEventListener('smkb:session-expired', onExpired)
    invokeFlow.mockRejectedValue(new FlowError('UNAUTHORIZED'))

    await expect(invokeAuthFlow(GUID)).rejects.toBeInstanceOf(SessionExpiredError)
    expect(auth.isAuthenticated.value).toBe(false)
    expect(onExpired).toHaveBeenCalledTimes(1)
    window.removeEventListener('smkb:session-expired', onExpired)
  })

  it('maps a server-side SESSION_EXPIRED the same way', async () => {
    const { invokeAuthFlow, auth } = await fresh()
    signIn(auth)
    invokeFlow.mockRejectedValue(new FlowError('SESSION_EXPIRED'))
    await expect(invokeAuthFlow(GUID)).rejects.toBeInstanceOf(SessionExpiredError)
    expect(auth.isAuthenticated.value).toBe(false)
  })

  // A business error must NOT be mistaken for an expiry: signing the user out because a record
  // was not found would be a far worse bug than the error itself.
  it('re-throws an unrelated business FlowError unchanged, leaving the session intact', async () => {
    const { invokeAuthFlow, auth } = await fresh()
    signIn(auth)
    invokeFlow.mockRejectedValue(new FlowError('NOT_FOUND', { errorCode: 'NOT_FOUND' }))

    const err = await invokeAuthFlow(GUID).catch((e) => e)
    expect(err).toBeInstanceOf(FlowError)
    expect(err).not.toBeInstanceOf(SessionExpiredError)
    expect((err as FlowError).code).toBe('NOT_FOUND')
    expect(auth.isAuthenticated.value).toBe(true)
  })

  it('treats an expired-but-present token as no session at all', async () => {
    const { invokeAuthFlow, auth } = await fresh()
    auth.login({
      userId: 'u-1', email: 'a@smkb.ac.il', firstName: 'A', lastName: 'B', status: 'Active',
      authToken: 'tok', authTokenExpiresAt: new Date(Date.now() - 1000).toISOString(),
    } as never)
    await expect(invokeAuthFlow(GUID)).rejects.toBeInstanceOf(SessionExpiredError)
    expect(invokeFlow).not.toHaveBeenCalled()
  })
})
