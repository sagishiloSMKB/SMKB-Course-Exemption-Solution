// jsdom (vitest.config.ts glob) because this composable holds a Vue `ref`.
//
// Kept deliberately in step with the Code Site starter's src/utils/sessionCache.spec.ts — same
// semantics, different idiom. If you change one, change both.
import { describe, it, expect, vi } from 'vitest'
import { useSessionCache } from './useSessionCache'

describe('useSessionCache', () => {
  it('fetches once and serves the cached value afterwards', async () => {
    const fetcher = vi.fn().mockResolvedValue(['Tel Aviv', 'Haifa'])
    const cache = useSessionCache(fetcher)

    expect(await cache.ensureLoaded()).toEqual(['Tel Aviv', 'Haifa'])
    expect(await cache.ensureLoaded()).toEqual(['Tel Aviv', 'Haifa'])
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('exposes the value on `data` for templates to read directly', async () => {
    const cache = useSessionCache(() => Promise.resolve('v'))
    expect(cache.data.value).toBeUndefined()
    await cache.ensureLoaded()
    expect(cache.data.value).toBe('v')
  })

  it('de-duplicates concurrent callers into one in-flight fetch', async () => {
    let resolveLoad!: (v: number) => void
    const fetcher = vi.fn(() => new Promise<number>((r) => { resolveLoad = r }))
    const cache = useSessionCache(fetcher)

    const p1 = cache.ensureLoaded()
    const p2 = cache.ensureLoaded()
    resolveLoad(7)

    expect(await p1).toBe(7)
    expect(await p2).toBe(7)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('retries after a failed fetch (failures are not cached)', async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('flow down'))
      .mockResolvedValueOnce('ok')
    const cache = useSessionCache(fetcher)

    await expect(cache.ensureLoaded()).rejects.toThrow('flow down')
    expect(await cache.ensureLoaded()).toBe('ok')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('invalidate() drops the value so the next call refetches', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
    const cache = useSessionCache(fetcher)

    expect(await cache.ensureLoaded()).toBe('first')
    cache.invalidate()
    expect(cache.data.value).toBeUndefined()
    expect(await cache.ensureLoaded()).toBe('second')
  })

  // The write-then-read race, and the reason invalidate() carries a generation counter.
  // A fetch starts -> a write happens -> invalidate() runs -> the PRE-WRITE promise resolves.
  // Without the counter that stale promise repopulates the cache, so every later read returns
  // pre-write data for the rest of the session — a list that never shows the row the user just
  // created, which a page refresh "fixes".
  it('invalidate() cancels the commit of a fetch already in flight', async () => {
    let resolveFirst!: (v: string) => void
    const fetcher = vi.fn()
      .mockImplementationOnce(() => new Promise<string>((r) => { resolveFirst = r }))
      .mockResolvedValueOnce('post-write')
    const cache = useSessionCache(fetcher)

    const inflight = cache.ensureLoaded()
    cache.invalidate()
    resolveFirst('pre-write')
    await expect(inflight).resolves.toBe('pre-write')  // its own caller still gets its value

    expect(cache.data.value).toBeUndefined()           // ...but it was NOT committed
    expect(await cache.ensureLoaded()).toBe('post-write')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
