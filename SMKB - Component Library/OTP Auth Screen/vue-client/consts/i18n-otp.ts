// OTP / login i18n keys — extracted from Events Tickets RSVP.
// Import this file directly, or merge I18N_OTP into your solution's existing i18n.ts.
// [ADAPT]: update text values to match your solution's language and tone.

export type Lang = 'he' | 'en'

export const I18N_OTP = {
  loginHeading:        { he: 'כניסה',                     en: 'Sign in' },
  loginEmailLead:      { he: 'נא להזין -',                en: 'Please enter –' },
  loginEmailCollegeLine: {
    he: 'כתובת מייל של המכללה (email@smkb.ac.il)',
    en: 'College email address (email@smkb.ac.il)',
  },
  loginEmailOr:        { he: 'או',                        en: 'or' },
  loginEmailPersonalHint: {
    he: 'כתובת מייל אישית (המקושרת לחשבון המכללה)',
    en: 'Personal email address (linked to your college account)',
  },
  loginSendCode:       { he: 'שליחה',                     en: 'Send' },
  loginOtpDescLead:    { he: 'שלחנו את קוד האימות ל:',    en: 'We sent a verification code to:' },
  loginVerify:         { he: 'כניסה',                     en: 'Sign in' },
  loginResend:         { he: 'לא קיבלת קוד? שלחו שוב',   en: "Didn't receive a code? Resend" },
  loginChangeEmail:    { he: 'שינוי כתובת מייל',          en: 'Change email address' },
  loginErrInvalidEmail: {
    he: 'נא להזין כתובת דוא"ל תקינה',
    en: 'Please enter a valid email address',
  },
  loginErrNotFound:    {
    he: 'כתובת המייל לא נמצאה במערכת',
    en: 'This email was not found in the system',
  },
  loginErrLocked:      {
    he: 'חשבונך נעול לאחר ניסיונות כושלים. נסה שוב מאוחר יותר',
    en: 'Account locked after too many failed attempts. Try again later.',
  },
  loginErrLockedAfter: {
    he: 'הקוד שגוי, ניתן לנסות שוב בעוד 10 דקות',
    en: 'Wrong code. Try again in 10 minutes.',
  },
  loginErrWrongOtp:    {
    he: (n: number) => `הקוד שגוי. נותרו ${n} ניסיונות`,
    en: (n: number) => `Wrong code. ${n} attempts remaining.`,
  },
  loginErrGeneric:     { he: 'אירעה שגיאה. אנא נסה שוב',  en: 'Something went wrong. Please try again.' },
  loginErrOtpNotConfigured: {
    he: 'שירות שליחת הקוד אינו זמין כרגע. נסה שוב מאוחר יותר או פנה לתמיכה.',
    en: 'Verification is not available right now. Try again later or contact support.',
  },
  loginErrOtpSendFailed: {
    he: 'לא ניתן לשלוח את קוד האימות. אנא נסה שוב.',
    en: "We couldn't send a verification code. Please try again.",
  },
  loginErrRateLimited: {
    he: 'שלחנו יותר מדי קודים לאחרונה. נסה שוב בעוד 10 דקות.',
    en: 'Too many codes sent recently. Please wait 10 minutes and try again.',
  },
  loginEmailPlaceholder: { he: 'דוא"ל',                   en: 'Email' },
  loginOtpHeading:       { he: 'הזן/י את הקוד',           en: 'Enter the code' },
} as const
