// Central user-facing messages for the generic flow error codes returned by the
// "HTTP 200 + errorCode" contract (see cloudFlow.ts / docs/FLOW-ERROR-CONTRACT.md).
//
// Add solution-specific codes (and languages) to the maps below. Screens that
// need context-aware messages (e.g. a login page whose text depends on remaining
// attempts) keep their own local map; everything else uses flowErrorMessage().

import { SOLUTION } from '../config/solution'
import type { LanguageCode } from '../config/solution'

export const FLOW_ERROR_MESSAGES: Record<LanguageCode, Record<string, string>> = {
  he: {
    INVALID_INPUT: 'הנתונים שנשלחו אינם תקינים. בדוק/י את הפרטים ונסה/י שוב',
    NOT_FOUND: 'הפריט המבוקש לא נמצא',
    UNAUTHORIZED: 'פג תוקף החיבור — אנא התחבר/י מחדש',
    EXTERNAL_API_ERROR: 'שירות חיצוני אינו זמין כעת. נסה/י שוב מאוחר יותר',
    ERROR: 'אירעה שגיאה. אנא נסה/י שוב',
  },
  en: {
    INVALID_INPUT: 'The submitted data is invalid. Check the details and try again',
    NOT_FOUND: 'The requested item was not found',
    UNAUTHORIZED: 'Your session has expired — please sign in again',
    EXTERNAL_API_ERROR: 'An external service is currently unavailable. Try again later',
    ERROR: 'Something went wrong. Please try again',
  },
}

/**
 * Map a flow errorCode to a user message in the given language
 * (defaults to SOLUTION.defaultLanguage), with an optional override fallback.
 */
export function flowErrorMessage(
  code: string | undefined | null,
  fallback?: string,
  lang: LanguageCode = SOLUTION.defaultLanguage,
): string {
  const messages = FLOW_ERROR_MESSAGES[lang] ?? FLOW_ERROR_MESSAGES.he
  const defaultMessage = fallback ?? messages.ERROR
  if (!code) return defaultMessage
  return messages[code] ?? defaultMessage
}
