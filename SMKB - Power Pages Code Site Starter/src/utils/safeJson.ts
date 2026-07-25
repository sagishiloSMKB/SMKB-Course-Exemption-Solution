/**
 * Parse a JSON string defensively, returning `fallback` on null/empty input or
 * malformed JSON. Use for Dataverse text columns that hold serialized JSON and
 * for sessionStorage values — both can be absent or corrupted.
 *
 * @example
 * const fields = safeJsonParse<string[]>(record.lockedFieldsJson, [])
 */
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
