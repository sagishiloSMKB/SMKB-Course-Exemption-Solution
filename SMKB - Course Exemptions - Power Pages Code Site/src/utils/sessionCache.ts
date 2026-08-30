/**
 * Session-lifetime cache with in-flight de-duplication for async loaders
 * (typically cloud-flow reads of reference data: lists, config, lookups).
 *
 * - The first `get()` runs the loader; concurrent callers share the same promise.
 * - The result is cached only on success, so a failed load is retried next call.
 * - `invalidate()` clears the cache (call after a write that stales the data).
 *
 * Two details that are easy to get wrong, and were:
 *
 * 1. **A loader that legitimately resolves `null` must still be cached.** Testing
 *    `cache !== null` conflates "no value yet" with "the value is null", so such a
 *    loader re-ran on every single call. A separate `loaded` flag is the fix.
 *
 * 2. **`invalidate()` has to cancel an in-flight load, not just the stored value.**
 *    Otherwise: `get()` starts, a write happens, `invalidate()` runs, and then the
 *    pre-write promise resolves and repopulates the cache - so every later `get()`
 *    returns pre-write data for the rest of the session. A generation counter fixes
 *    it: a load only commits if no `invalidate()` happened while it was in flight.
 *    The caller that started that load still receives its (now stale) value, which
 *    is unavoidable; what matters is that it is not cached for everyone else.
 *
 * @example
 * const banks = createSessionCache(() => invokeFlow<Bank[]>(FLOWS.getBankList))
 * const list = await banks.get()   // flow runs once per session
 * banks.invalidate()               // after a write that changes the list
 */
export function createSessionCache<T>(loader: () => Promise<T>) {
  let cache: T | undefined
  let loaded = false
  let inflight: Promise<T> | null = null
  let generation = 0

  async function get(): Promise<T> {
    if (loaded) return cache as T
    if (inflight) return inflight
    const gen = generation
    inflight = loader()
      .then((result) => {
        // Commit only if no invalidate() landed while this load was in flight.
        if (gen === generation) {
          cache = result
          loaded = true
        }
        return result
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  function invalidate(): void {
    generation++
    cache = undefined
    loaded = false
  }

  return { get, invalidate }
}
