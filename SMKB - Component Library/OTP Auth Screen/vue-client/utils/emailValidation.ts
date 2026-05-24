/**
 * Pragmatic email check for login UX (not a full RFC 5322 parser).
 */
export function isValidEmail(raw: string): boolean {
  const s = raw.trim()
  if (!s || s.length > 254) return false
  const at = s.indexOf('@')
  if (at <= 0 || at !== s.lastIndexOf('@')) return false
  const local = s.slice(0, at)
  const domain = s.slice(at + 1)
  if (!local || local.length > 64) return false
  if (!domain || domain.length > 253 || !domain.includes('.')) return false
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false
  return /^[^\s@]+$/.test(local) && /^[^\s@.]+(\.[^\s@.]+)+$/.test(domain)
}
