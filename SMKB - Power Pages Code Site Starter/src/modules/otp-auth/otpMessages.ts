import { currentLanguage } from '../../composables/useLanguage'
import type { LanguageCode } from '../../config/solution'

/**
 * User-facing text for the OTP login screen, per language.
 *
 * WHY THIS FILE EXISTS
 * The error map used to be a `switch` of hardcoded Hebrew literals inside `OtpLoginView.vue`. Two
 * consequences: the header's language toggle changed the chrome and left every error in Hebrew,
 * and a solution whose `SOLUTION.defaultLanguage` is `'en'` shipped Hebrew errors with no toggle
 * involved at all. Resolving against the ACTIVE language (`composables/useLanguage.ts`) fixes
 * both, and matches how `services/flowErrors.ts` already worked.
 *
 * SCOPE — read this before filing "the login screen is still Hebrew"
 * Only the ERROR and CHANNEL strings live here. The screen's own copy (headings, button labels,
 * the phone/code prompts) is still Hebrew in the template: this module ships Hebrew-first, and
 * lifting every label into a message table is a separate piece of work with its own decisions
 * (where the table lives, whether views get a `t()` helper, how the design system's own strings
 * follow). If a solution needs a fully bilingual login screen, do that deliberately — start by
 * extending this file and replacing the template literals, not by adding a second mechanism.
 *
 * ANTI-ENUMERATION — do not "improve" these messages
 * `INVALID_CODE` deliberately covers no-pending-code, expired and wrong-code with ONE message,
 * and the phone step answers an unknown number exactly as it answers a successful send. A more
 * helpful message here would only be cosmetic anyway — the flow response body carries the code
 * and anyone can read it in the network tab — which is why the hardened flow templates return a
 * single generic code in the first place. `LOCKED` is the one specific code kept, because a stuck
 * user needs to know why, and it describes the ATTEMPT STATE, never the account.
 * See `SMKB - Component Library/OTP Auth Screen/RECIPE.md` -> "Security baseline".
 */

interface OtpStrings {
  /** Wrong code, with the remaining-attempts count. */
  invalidCodeWithAttempts: (n: number) => string
  /** Wrong code with no count available - also covers expired and no-pending-code. */
  invalidCodeGeneric: string
  /** Too many wrong codes on the code step. */
  lockedOnCode: string
  /** Too many requests on the phone step. */
  lockedOnPhone: string
  invalidPhone: string
  sendFailed: string
  rateLimited: string
  captchaFailed: string
  generic: string
  channelSms: string
  channelEmail: string
}

const STRINGS: Record<LanguageCode, OtpStrings> = {
  he: {
    invalidCodeWithAttempts: (n) => `הקוד שגוי. נותרו ${n} ניסיונות`,
    invalidCodeGeneric: 'הקוד שגוי או שתוקפו פג. בקש/י קוד חדש',
    lockedOnCode: 'יותר מדי ניסיונות שגויים. בקש/י קוד חדש',
    lockedOnPhone: 'יותר מדי נסיונות. נסה/י שוב מאוחר יותר',
    invalidPhone: 'נא להזין מספר טלפון תקין',
    sendFailed: 'לא ניתן לשלוח את קוד האימות. אנא נסה שוב',
    rateLimited: 'כבר נשלח קוד. ניתן לבקש קוד חדש בעוד כדקה',
    captchaFailed: 'אימות האבטחה נכשל, נסה/י שוב',
    generic: 'אירעה שגיאה. אנא נסה שוב',
    channelSms: 'מספר טלפון',
    channelEmail: 'דוא״ל',
  },
  en: {
    invalidCodeWithAttempts: (n) => `That code is incorrect. ${n} attempt(s) remaining`,
    invalidCodeGeneric: 'That code is incorrect or has expired. Request a new one',
    lockedOnCode: 'Too many incorrect codes. Request a new one',
    lockedOnPhone: 'Too many attempts. Try again later',
    invalidPhone: 'Enter a valid phone number',
    sendFailed: 'The verification code could not be sent. Please try again',
    rateLimited: 'A code was already sent. You can request another in about a minute',
    captchaFailed: 'The security check failed, please try again',
    generic: 'Something went wrong. Please try again',
    channelSms: 'phone number',
    channelEmail: 'email',
  },
}

function strings(lang: LanguageCode = currentLanguage()): OtpStrings {
  return STRINGS[lang] ?? STRINGS.he
}

/**
 * Message for an OTP error code.
 *
 * @param step Which step the user is on - `LOCKED` means "too many wrong codes" on the code step
 *             and "too many requests" on the phone step, and the two need different wording.
 * @param attemptsRemaining From the flow response, when it supplies one.
 */
export function otpErrorMessage(
  code: string | null | undefined,
  step: 'phone' | 'otp',
  attemptsRemaining: number | null = null,
  lang?: LanguageCode,
): string {
  if (!code) return ''
  const s = strings(lang)
  switch (code) {
    case 'INVALID_PHONE':
    case 'INVALID_INPUT':
      return s.invalidPhone
    case 'INVALID_CODE':
      return attemptsRemaining !== null
        ? s.invalidCodeWithAttempts(attemptsRemaining)
        : s.invalidCodeGeneric
    case 'LOCKED':
      return step === 'otp' ? s.lockedOnCode : s.lockedOnPhone
    // Legacy codes from a flow built before the recipe was hardened. Kept so an older deployment
    // degrades gracefully, and mapped to the SAME generic text as INVALID_CODE so the client
    // never widens what the flow reveals.
    case 'NOT_FOUND':
    case 'WRONG_OTP':
    case 'EXPIRED':
    case 'ACCOUNT_ARCHIVED':
      return s.invalidCodeGeneric
    case 'OTP_SEND_FAILED':
      return s.sendFailed
    case 'RATE_LIMITED':
      return s.rateLimited
    case 'CAPTCHA_FAILED':
      return s.captchaFailed
    default:
      return s.generic
  }
}

/** Label for a delivery channel ("a code was sent to your <label>"). */
export function otpChannelLabel(
  type: 'sms' | 'email_college' | 'email_personal' | string,
  lang?: LanguageCode,
): string {
  const s = strings(lang)
  switch (type) {
    case 'sms':
      return s.channelSms
    case 'email_college':
    case 'email_personal':
      return s.channelEmail
    default:
      return ''
  }
}
