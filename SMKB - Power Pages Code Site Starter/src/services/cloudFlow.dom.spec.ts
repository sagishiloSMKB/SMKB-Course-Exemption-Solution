// `.dom.spec.ts` -> jsdom (vitest.config.ts). invokeFlow reads `window.shell` and falls back to
// `fetch`, neither of which exists in the node environment, so this file could not have been
// written at all before the environment split.
//
// What it pins is the ERROR CONTRACT (docs/FLOW-ERROR-CONTRACT.md): every failure a caller can
// see must arrive as a FlowError, because `invokeAuthFlow` classifies with
// `e instanceof FlowError`. Anything that escapes as a bare Error or SyntaxError is invisible to
// that check — which is exactly the bug the empty-200 test below covers.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { invokeFlow, FlowError, unwrapFlowResult } from './cloudFlow'

vi.mock('./csrf', () => ({ getCsrfToken: () => Promise.resolve('csrf-token') }))

const GUID = '11111111-2222-3333-4444-555555555555'

/** Minimal Response stand-in — only the members invokeFlow touches. */
function fakeResponse(init: { status?: number; ok?: boolean; body?: string }) {
  const status = init.status ?? 200
  return {
    ok: init.ok ?? (status >= 200 && status < 300),
    status,
    statusText: 'stub',
    text: () => Promise.resolve(init.body ?? ''),
  }
}

describe('invokeFlow (fetch fallback — local dev path)', () => {
  beforeEach(() => {
    // No portal shell: forces the fetch branch, which is also the branch with the JSON handling.
    delete (window as unknown as Record<string, unknown>).shell
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the parsed body of a 200 JSON response', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(fakeResponse({ body: '{"approvalId":"A-1"}' }))))
    await expect(invokeFlow<{ approvalId: string }>(GUID, { x: 1 })).resolves.toEqual({ approvalId: 'A-1' })
  })

  // THE regression test for this pass. A fire-and-forget flow (no "Return value(s) to Power
  // Pages" action) answers 200 with an EMPTY body. `res.json()` then threw a bare SyntaxError:
  // not a FlowError, so invokeAuthFlow's instanceof check never matched, and the documented
  // contract was broken by the SUCCESS path.
  it('resolves undefined for a 200 with an empty body (fire-and-forget)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(fakeResponse({ body: '' }))))
    await expect(invokeFlow(GUID)).resolves.toBeUndefined()
  })

  it('resolves undefined for a 200 whose body is only whitespace', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(fakeResponse({ body: '  \n ' }))))
    await expect(invokeFlow(GUID)).resolves.toBeUndefined()
  })

  it('resolves undefined for a 202 Accepted', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(fakeResponse({ status: 202, body: 'ignored' }))))
    await expect(invokeFlow(GUID)).resolves.toBeUndefined()
  })

  it('throws FlowError("ERROR") — never a SyntaxError — for a 200 with a non-JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(fakeResponse({ body: '<html>login</html>' }))))
    const err = await invokeFlow(GUID).catch((e) => e)
    expect(err).toBeInstanceOf(FlowError)
    expect((err as FlowError).code).toBe('ERROR')
    expect((err as FlowError).data).toContain('<html>')
  })

  it('turns a 200 body carrying errorCode into a FlowError with that code and the full body', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve(fakeResponse({ body: '{"errorCode":"LOCKED","attemptsRemaining":0}' }))))
    const err = await invokeFlow(GUID).catch((e) => e)
    expect(err).toBeInstanceOf(FlowError)
    expect((err as FlowError).code).toBe('LOCKED')
    expect((err as FlowError).data).toEqual({ errorCode: 'LOCKED', attemptsRemaining: 0 })
  })

  it('throws FlowError("ERROR") for a non-2xx transport failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve(fakeResponse({ status: 403, ok: false, body: '{"ErrorCode":"00000006"}' }))))
    const err = await invokeFlow(GUID).catch((e) => e)
    expect(err).toBeInstanceOf(FlowError)
    expect((err as FlowError).code).toBe('ERROR')
  })
})

describe('invokeFlow (portal shell path)', () => {
  afterEach(() => {
    delete (window as unknown as Record<string, unknown>).shell
    vi.restoreAllMocks()
  })

  it('unwraps a shell success through the same errorCode contract', async () => {
    const done = (res: unknown) => ({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      done(fn: (r: unknown) => void) { fn(res); return this },
      fail() { return this },
    })
    ;(window as unknown as Record<string, unknown>).shell = {
      ajaxSafePost: () => done({ ok: true }),
    }
    await expect(invokeFlow<{ ok: boolean }>(GUID)).resolves.toEqual({ ok: true })
  })

  it('rejects with FlowError("ERROR") when the shell request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(window as unknown as Record<string, unknown>).shell = {
      ajaxSafePost: () => ({
        done() { return this },
        fail(fn: (xhr: unknown, status: string, error: string) => void) { fn(null, 'error', 'boom'); return this },
      }),
    }
    const err = await invokeFlow(GUID).catch((e) => e)
    expect(err).toBeInstanceOf(FlowError)
    expect((err as FlowError).code).toBe('ERROR')
  })
})

describe('unwrapFlowResult', () => {
  it('treats an empty-string errorCode as success (a flow that always emits the field)', () => {
    expect(unwrapFlowResult<{ errorCode: string }>({ errorCode: '' })).toEqual({ errorCode: '' })
  })
  it('maps null to undefined rather than returning null', () => {
    expect(unwrapFlowResult(null)).toBeUndefined()
  })
})
