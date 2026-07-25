import { describe, it, expect } from 'vitest'
import { flowErrorMessage, FLOW_ERROR_MESSAGES } from './flowErrors'
import { unwrapFlowResult, FlowError } from './cloudFlow'

describe('flowErrorMessage', () => {
  it('maps a known code to the default-language message', () => {
    expect(flowErrorMessage('NOT_FOUND')).toBe(FLOW_ERROR_MESSAGES.he.NOT_FOUND)
  })

  it('maps a known code per requested language', () => {
    expect(flowErrorMessage('NOT_FOUND', undefined, 'en')).toBe(FLOW_ERROR_MESSAGES.en.NOT_FOUND)
  })

  it('falls back to the generic ERROR message for unknown codes', () => {
    expect(flowErrorMessage('SOME_UNKNOWN_CODE')).toBe(FLOW_ERROR_MESSAGES.he.ERROR)
  })

  it('prefers an explicit fallback over the generic message', () => {
    expect(flowErrorMessage('SOME_UNKNOWN_CODE', 'custom')).toBe('custom')
    expect(flowErrorMessage(null, 'custom')).toBe('custom')
  })
})

describe('unwrapFlowResult (HTTP 200 + errorCode contract)', () => {
  it('throws FlowError carrying the code and full body when errorCode is present', () => {
    const body = { errorCode: 'WRONG_OTP', attemptsRemaining: 2 }
    try {
      unwrapFlowResult(body)
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(FlowError)
      expect((e as FlowError).code).toBe('WRONG_OTP')
      expect((e as FlowError).data).toEqual(body)
    }
  })

  it('passes clean bodies through unchanged', () => {
    const body = { approvalId: 'abc', status: 'ok' }
    expect(unwrapFlowResult(body)).toEqual(body)
  })

  it('resolves null/undefined bodies to undefined (fire-and-forget)', () => {
    expect(unwrapFlowResult(null)).toBeUndefined()
    expect(unwrapFlowResult(undefined)).toBeUndefined()
  })

  it('ignores empty-string errorCode', () => {
    const body = { errorCode: '', value: 1 }
    expect(unwrapFlowResult(body)).toEqual(body)
  })
})
