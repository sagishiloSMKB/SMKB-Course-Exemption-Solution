/** Normalize a phone string to digits, converting a +972 / 972 prefix to a leading 0. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits.startsWith('972') ? '0' + digits.slice(3) : digits
}
