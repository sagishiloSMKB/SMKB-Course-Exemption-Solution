// Central user-facing messages for the generic flow error codes returned by the
// "HTTP 200 + errorCode" contract (see cloudFlow.ts / docs/FLOW-ERROR-CONTRACT.md).
//
// Add solution-specific codes (and languages) to the maps below. Screens that
// need context-aware messages (e.g. a login page whose text depends on remaining
// attempts) keep their own local map; everything else uses flowErrorMessage().

import { currentLanguage } from '../composables/useLanguage'
import type { LanguageCode } from '../config/solution'

/** Shown only if a language map is missing its own ERROR entry and no fallback was passed. */
const LAST_RESORT = 'Something went wrong. Please try again.'

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
 * Map a flow errorCode to a user message in the given language, with an optional override
 * fallback.
 *
 * Defaults to the ACTIVE language (the header toggle), not SOLUTION.defaultLanguage. Those two
 * are the same until someone touches the toggle, which is exactly why the old default looked
 * correct: switching to English produced an English UI with Hebrew error toasts.
 */
export function flowErrorMessage(
  code: string | undefined | null,
  fallback?: string,
  lang: LanguageCode = currentLanguage(),
): string {
  const messages = FLOW_ERROR_MESSAGES[lang] ?? FLOW_ERROR_MESSAGES.he
  // LAST_RESORT is not defensive noise. Every read from these maps is `string | undefined`, so a
  // language table added without an ERROR entry - the whole point of which is to be the fallback -
  // made this function return `undefined`, and the toast then displayed the text "undefined".
  const defaultMessage = fallback ?? messages.ERROR ?? LAST_RESORT
  if (!code) return defaultMessage
  return messages[code] ?? defaultMessage
}
