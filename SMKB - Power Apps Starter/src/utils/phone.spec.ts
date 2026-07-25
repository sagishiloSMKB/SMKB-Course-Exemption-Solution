import { describe, it, expect } from 'vitest'
import { normalizePhone } from './phone'

describe('normalizePhone', () => {
  it('strips non-digits', () => {
    expect(normalizePhone('050-123-4567')).toBe('0501234567')
    expect(normalizePhone('(050) 123 4567')).toBe('0501234567')
  })
  it('converts a +972 / 972 prefix to a leading 0', () => {
    expect(normalizePhone('+972501234567')).toBe('0501234567')
    expect(normalizePhone('972 50 123 4567')).toBe('0501234567')
  })
  it('leaves an already-normalized number unchanged', () => {
    expect(normalizePhone('0501234567')).toBe('0501234567')
  })
  it('returns empty string for no digits', () => {
    expect(normalizePhone('abc')).toBe('')
  })
})
