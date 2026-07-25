/**
 * Session-lifetime cache with in-flight de-duplication for async loaders
 * (typically cloud-flow reads of reference data: lists, config, lookups).
 *
 * - The first `get()` runs the loader; concurrent callers share the same promise.
 * - The result is cached only on success, so a failed load is retried next call.
 * - `invalidate()` clears the cache (call after a write that stales the data).
 *
 * @example
 * const banks = createSessionCache(() => invokeFlow<Bank[]>(FLOWS.getBankList))
 * const list = await banks.get()   // flow runs once per session
 */
export function createSessionCache<T>(loader: () => Promise<T>) {
  let cache: T | null = null
  let inflight: Promise<T> | null = null

  async function get(): Promise<T> {
    if (cache !== null) return cache
    if (inflight) return inflight
    inflight = loader()
      .then((result) => {
        cache = result
        return result
      })
      .finally(() => {
        inflight = null
      })
    return inflight
  }

  function invalidate(): void {
    cache = null
  }

  return { get, invalidate }
}
