import { describe, it, expect } from 'vitest'
import { isValidEmail, isValidIsraeliPhone, isValidIsraeliId } from './validators'

describe('isValidEmail', () => {
  it('accepts a well-formed address (trimming whitespace)', () => {
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('  lecturer@smkb.ac.il  ')).toBe(true)
  })
  it('rejects missing @ or domain dot', () => {
    expect(isValidEmail('ab.co')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('isValidIsraeliPhone', () => {
  it('accepts a 05X number (also via +972 / spaces)', () => {
    expect(isValidIsraeliPhone('0501234567')).toBe(true)
    expect(isValidIsraeliPhone('+972 50 123 4567')).toBe(true)
  })
  it('rejects wrong prefix or wrong length', () => {
    expect(isValidIsraeliPhone('0601234567')).toBe(false) // not 05
    expect(isValidIsraeliPhone('050123456')).toBe(false)   // 9 digits
    expect(isValidIsraeliPhone('05012345678')).toBe(false) // 11 digits
  })
})

describe('isValidIsraeliId (Luhn checksum)', () => {
  it('accepts valid ids', () => {
    expect(isValidIsraeliId('123456782')).toBe(true) // checksum sums to 40
    expect(isValidIsraeliId('000000018')).toBe(true)
  })
  it('accepts 5-9 digits (leading zeros omitted) that checksum correctly', () => {
    expect(isValidIsraeliId('00018')).toBe(true) // 5 digits → padded to 000000018
  })
  it('rejects a bad checksum', () => {
    expect(isValidIsraeliId('123456789')).toBe(false) // sums to 47
  })
  it('rejects non-numeric or out-of-range length', () => {
    expect(isValidIsraeliId('abc')).toBe(false)
    expect(isValidIsraeliId('1234')).toBe(false)       // < 5 digits
    expect(isValidIsraeliId('1234567890')).toBe(false) // > 9 digits
  })
})
