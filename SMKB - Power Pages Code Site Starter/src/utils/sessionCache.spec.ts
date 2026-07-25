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
})
