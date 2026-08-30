import { ref, type Ref } from 'vue'

/**
 * Session-scoped cache with in-flight de-duplication.
 *
 * Wrap any async fetcher once and reuse the result app-wide: the first caller
 * triggers the fetch, concurrent callers share the same in-flight promise, and
 * every later caller gets the cached value. A failed fetch is NOT cached, so the
 * next call retries. This is the generic form of the cities/approvers caching the
 * production apps use for reference lists that rarely change within a session.
 *
 * `invalidate()` drops the cached value AND cancels the commit of any load already
 * in flight, via a generation counter. Without that second half there is a real
 * write-then-read race: `ensureLoaded()` starts, a write happens, `invalidate()`
 * runs, then the pre-write promise resolves and repopulates the cache - so every
 * later call returns pre-write data for the rest of the session.
 *
 * Kept deliberately in step with the Power Pages Code Site starter's
 * `src/utils/sessionCache.ts`. Same semantics, different idiom (a Vue `ref` here so
 * templates can read `data` directly). If you change one, change both.
 *
 * Usage:
 *   const citiesCache = useSessionCache(() => getCities())
 *   const cities = await citiesCache.ensureLoaded()
 *   citiesCache.invalidate()          // after a write that changes the list
 */
export function useSessionCache<T>(fetcher: () => Promise<T>) {
  const data = ref<T>() as Ref<T | undefined>
  let loaded = false
  let inFlight: Promise<T> | null = null
  let generation = 0

  async function ensureLoaded(): Promise<T> {
    if (loaded) return data.value as T
    if (!inFlight) {
      const gen = generation
      inFlight = fetcher()
        .then((v) => {
          // Commit only if no invalidate() landed while this fetch was in flight.
          if (gen === generation) {
            data.value = v
            loaded = true
          }
          return v
        })
        .finally(() => {
          inFlight = null // allow a retry, and never hold a settled promise
        })
    }
    return inFlight
  }

  function invalidate(): void {
    generation++
    data.value = undefined
    loaded = false
  }

  return { data, ensureLoaded, invalidate }
}
