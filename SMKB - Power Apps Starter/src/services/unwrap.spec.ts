import { describe, it, expect } from 'vitest'
import { unwrap } from './unwrap'

describe('unwrap', () => {
  it('returns data on success', () => {
    expect(unwrap<{ x: number }>({ success: true, data: { x: 1 } })).toEqual({ x: 1 })
  })
  it('returns data when success is absent (not explicitly false)', () => {
    expect(unwrap<{ x: number }>({ data: { x: 2 } })).toEqual({ x: 2 })
  })
  it('throws the flow error CODE when success is false', () => {
    expect(() => unwrap({ success: false, error: { code: 'EMAIL_EXISTS' } })).toThrow('EMAIL_EXISTS')
  })
  it('falls back to the error message when there is no code', () => {
    expect(() => unwrap({ success: false, error: { message: 'boom' } })).toThrow('boom')
  })
  it("falls back to 'ERROR' when neither code nor message is present", () => {
    expect(() => unwrap({ success: false })).toThrow('ERROR')
  })
})
