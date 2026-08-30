import { normalizePhone } from './phone'

/** Shared field validators — keep the rules here so create/edit forms never drift. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(raw: string): boolean {
  return EMAIL_RE.test(raw.trim())
}

/** Israeli mobile: 05X-XXXXXXX (10 digits). Normalizes first so +972 / spaces are accepted. */
export function isValidIsraeliPhone(raw: string): boolean {
  return /^05\d{8}$/.test(normalizePhone(raw))
}

/** Israeli ID (תעודת זהות) Luhn-style checksum. Accepts 5–9 digits (leading zeros may be omitted). */
export function isValidIsraeliId(raw: string): boolean {
  const id = raw.trim()
  if (!/^\d{5,9}$/.test(id)) return false
  const padded = id.padStart(9, '0')
  const digits = padded.split('').map(Number)
  const sum = digits.reduce((acc, d, i) => {
    const v = i % 2 === 0 ? d : d * 2
    return acc + (v > 9 ? v - 9 : v)
  }, 0)
  return sum % 10 === 0
}
