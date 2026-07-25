import { describe, it, expect } from 'vitest'
import { SOLUTION, POWER_PAGES_SITE_NAME, SESSION_STORAGE_KEY } from './solution'

// Locks the per-solution naming conventions so a refactor can't silently change
// the separator, casing, or key format that Power Pages / sessionStorage depend on.
describe('solution naming conventions', () => {
  it('derives the Power Pages site name as "<PREFIX-uppercase> - <siteName>"', () => {
    expect(POWER_PAGES_SITE_NAME).toBe(`${SOLUTION.prefix.toUpperCase()} - ${SOLUTION.siteName}`)
  })

  it('site name leads with the uppercased prefix and " - " separator', () => {
    expect(POWER_PAGES_SITE_NAME.startsWith(`${SOLUTION.prefix.toUpperCase()} - `)).toBe(true)
  })

  it('derives the sessionStorage key from the prefix', () => {
    expect(SESSION_STORAGE_KEY).toBe(`smkb-${SOLUTION.prefix}-auth`)
  })
})
