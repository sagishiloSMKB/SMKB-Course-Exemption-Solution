import { describe, it, expect, vi } from 'vitest'
import { createSessionCache } from './sessionCache'

describe('createSessionCache', () => {
  it('runs the loader once and serves the cached value afterwards', async () => {
    const loader = vi.fn().mockResolvedValue(['a', 'b'])
    const cache = createSessionCache(loader)

    expect(await cache.get()).toEqual(['a', 'b'])
    expect(await cache.get()).toEqual(['a', 'b'])
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('de-duplicates concurrent calls into a single in-flight load', async () => {
    let resolveLoad!: (v: number) => void
    const loader = vi.fn(() => new Promise<number>((resolve) => { resolveLoad = resolve }))
    const cache = createSessionCache(loader)

    const p1 = cache.get()
    const p2 = cache.get()
    resolveLoad(42)

    expect(await p1).toBe(42)
    expect(await p2).toBe(42)
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('retries after a failed load (failures are not cached)', async () => {
    const loader = vi.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce('ok')
    const cache = createSessionCache(loader)

    await expect(cache.get()).rejects.toThrow('network')
    expect(await cache.get()).toBe('ok')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('invalidate() clears the cache so the next get() reloads', async () => {
    const loader = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second')
    const cache = createSessionCache(loader)

    expect(await cache.get()).toBe('first')
    cache.invalidate()
    expect(await cache.get()).toBe('second')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  // THE write-then-read race, and the reason invalidate() carries a generation counter.
  //
  // Sequence: a read starts -> a write happens -> invalidate() runs -> the PRE-WRITE promise then
  // resolves. With only `cache = undefined` in invalidate(), that stale promise repopulated the
  // cache, so every later get() returned pre-write data for the rest of the session. The symptom
  // is a list that never shows the row the user just created, and a refresh "fixes" it — which is
  // how it survives a code review.
  it('invalidate() cancels the commit of a load already in flight', async () => {
    let resolveFirst!: (v: string) => void
    const loader = vi.fn()
      .mockImplementationOnce(() => new Promise<string>((r) => { resolveFirst = r }))
      .mockResolvedValueOnce('post-write')
    const cache = createSessionCache(loader)

    const inflight = cache.get()          // read starts
    cache.invalidate()                    // write lands, cache dropped
    resolveFirst('pre-write')             // the stale load finally answers
    await expect(inflight).resolves.toBe('pre-write')  // its own caller still gets its value

    // ...but it must NOT have become the cached value.
    expect(await cache.get()).toBe('post-write')
    expect(loader).toHaveBeenCalledTimes(2)
  })

  it('caches a loader that legitimately resolves null', async () => {
    // `if (cache !== null)` treated null as "never loaded", so a loader whose real answer is null
    // (an optional config row that does not exist) re-ran on every single call.
    const loader = vi.fn().mockResolvedValue(null)
    const cache = createSessionCache<null>(loader)

    expect(await cache.get()).toBeNull()
    expect(await cache.get()).toBeNull()
    expect(loader).toHaveBeenCalledTimes(1)
  })
})
