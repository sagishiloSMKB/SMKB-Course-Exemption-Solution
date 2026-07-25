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
 * Usage:
 *   const citiesCache = useSessionCache(() => getCities())
 *   const cities = await citiesCache.ensureLoaded()
 */
export function useSessionCache<T>(fetcher: () => Promise<T>) {
  const data = ref<T>() as Ref<T | undefined>
  let loaded = false
  let inFlight: Promise<T> | null = null

  async function ensureLoaded(): Promise<T> {
    if (loaded) return data.value as T
    if (!inFlight) {
      inFlight = fetcher()
        .then((v) => {
          data.value = v
          loaded = true
          return v
        })
        .catch((e) => {
          inFlight = null // allow retry on the next call
          throw e
        })
    }
    return inFlight
  }

  return { data, ensureLoaded }
}
