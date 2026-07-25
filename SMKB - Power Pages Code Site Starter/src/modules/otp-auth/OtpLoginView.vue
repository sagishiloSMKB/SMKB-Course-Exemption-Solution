<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuth } from './useAuth'
import { createOtp, checkOtp, normalizePhone, type OtpChannel } from './authService'
import { getPortalConfig } from './configService'
import { useTurnstile } from './useTurnstile'
import { OTP_AUTH_CONFIG } from './otpAuthConfig'
import { SOLUTION } from '../../config/solution'

const router = useRouter()
const route  = useRoute()
const { login } = useAuth()

// App title for the login card, in the solution's default language.
const appTitle = SOLUTION.appName[SOLUTION.defaultLanguage]

const sessionExpired = computed(() => route.query.expired === '1')

const step         = ref<'phone' | 'otp'>('phone')
const phone        = ref('')
const digits       = ref<string[]>(['', '', '', '', '', ''])
const channels     = ref<OtpChannel[]>([])
const loading      = ref(false)
const errorCode    = ref<string | null>(null)
const attemptsLeft = ref<number | null>(null)
const retryActive  = ref(false)
const sendCooldown = ref(0)

// Pre-fill the phone from a ?mobile= URL param (emailed invitation links can carry the user's mobile).
const prefillMobile = normalizePhone(String(route.query.mobile ?? ''))
if (prefillMobile) phone.value = prefillMobile

// ── Cloudflare Turnstile (only active when a site key is configured) ──────────
const { token: turnstileToken, failed: turnstileFailed, render: renderTurnstile, reset: resetTurnstile } = useTurnstile()
const turnstileSiteKey = ref('')
const turnstileEl      = ref<HTMLElement | null>(null)
const configLoading    = ref(true)
const captchaRequired  = computed(() => !!turnstileSiteKey.value)
// Send stays disabled until: not already sending, the portal config has loaded, a phone is entered,
// no resend cooldown is active, and — when a captcha is required — a Turnstile token is in hand.
// (Gating on config + token is what prevents a premature send before the widget is ready.)
const sendDisabled     = computed(
  () =>
    loading.value ||
    configLoading.value ||
    !phone.value.trim() ||
    sendCooldown.value > 0 ||
    (captchaRequired.value && !turnstileToken.value),
)
// "Verifying security" indicator — shown from the moment the page loads (while the portal config +
// Turnstile widget initialise) and on through until a token is in hand, so the disabled Send button
// always has accompanying feedback. Hidden once a token arrives, on failure (the error shows instead),
// or during a resend cooldown.
const verifyingSecurity = computed(
  () =>
    !turnstileFailed.value &&
    sendCooldown.value === 0 &&
    (configLoading.value || (captchaRequired.value && !turnstileToken.value)),
)

let retryTimer:    ReturnType<typeof setTimeout>  | null = null
let cooldownTimer: ReturnType<typeof setInterval> | null = null

function setRetryThrottle() {
  if (retryTimer) clearTimeout(retryTimer)
  retryActive.value = true
  retryTimer = setTimeout(() => { retryActive.value = false }, 3000)
}

// Resend cooldown — started only after a code is actually sent (or the server reports a real
// rate-limit), matching the server's 1-minute resend window. Persisted in sessionStorage so a page
// refresh doesn't reset it (a failed send never starts a cooldown).
const COOLDOWN_KEY = `${SOLUTION.prefix}-otp-cooldown-until`

function tickCooldown() {
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    sendCooldown.value--
    if (sendCooldown.value <= 0) {
      clearInterval(cooldownTimer!)
      cooldownTimer = null
      try { sessionStorage.removeItem(COOLDOWN_KEY) } catch { /* ignore */ }
    }
  }, 1000)
}

function startSendCooldown(seconds = 60) {
  sendCooldown.value = seconds
  try { sessionStorage.setItem(COOLDOWN_KEY, String(Date.now() + seconds * 1000)) } catch { /* ignore */ }
  tickCooldown()
}

function restoreSendCooldown() {
  let until = 0
  try { until = Number(sessionStorage.getItem(COOLDOWN_KEY) || 0) } catch { /* ignore */ }
  const remaining = Math.ceil((until - Date.now()) / 1000)
  if (remaining > 0) {
    sendCooldown.value = remaining
    tickCooldown()
  } else {
    try { sessionStorage.removeItem(COOLDOWN_KEY) } catch { /* ignore */ }
  }
}

function clearSendCooldown() {
  if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null }
  sendCooldown.value = 0
  try { sessionStorage.removeItem(COOLDOWN_KEY) } catch { /* ignore */ }
}

function retryTurnstile() {
  if (turnstileSiteKey.value) renderTurnstile(turnstileEl.value, turnstileSiteKey.value)
}

const otpValue       = computed(() => digits.value.join(''))
const verifyDisabled = computed(() => otpValue.value.length < 6 || retryActive.value)

const errorMessage = computed(() => {
  if (!errorCode.value) return ''
  switch (errorCode.value) {
    case 'INVALID_PHONE':    return 'נא להזין מספר טלפון תקין'
    // Generic on purpose — don't reveal whether a number is registered (anti-enumeration).
    // NOT_FOUND and the phone-step LOCKED share the same generic message. ACCOUNT_ARCHIVED
    // intentionally keeps a specific message so a deactivated user is told to contact support.
    case 'NOT_FOUND':        return 'פרטי הכניסה שגויים'
    case 'ACCOUNT_ARCHIVED': return 'חשבונך אינו פעיל. אנא פנה/י לתמיכה'
    case 'LOCKED':           return step.value === 'otp'
                               ? 'יותר מדי ניסיונות שגויים. בקש/י קוד חדש'
                               : 'פרטי הכניסה שגויים'
    case 'WRONG_OTP':        return attemptsLeft.value !== null
                               ? `הקוד שגוי. נותרו ${attemptsLeft.value} ניסיונות`
                               : 'אירעה שגיאה. אנא נסה שוב'
    case 'OTP_SEND_FAILED':  return 'לא ניתן לשלוח את קוד האימות. אנא נסה שוב'
    case 'RATE_LIMITED':     return 'כבר נשלח קוד. ניתן לבקש קוד חדש בעוד כדקה'
    case 'EXPIRED':          return 'תוקף הקוד פג. בקש/י קוד חדש'
    case 'INVALID_INPUT':    return 'נא להזין מספר טלפון תקין'
    case 'CAPTCHA_FAILED':   return 'אימות האבטחה נכשל, נסה/י שוב'
    default:                 return 'אירעה שגיאה. אנא נסה שוב'
  }
})

function channelLabel(type: OtpChannel['type']): string {
  switch (type) {
    case 'sms':            return 'מספר טלפון'
    case 'email_college':
    case 'email_personal': return 'דוא״ל'
    default:               return ''
  }
}

// ── OTP digit grid ─────────────────────────────────────────────────────────
const digitRefs        = ref<HTMLInputElement[]>([])
const iosOtpRelay      = ref<HTMLInputElement | null>(null)
const pendingRelayCode = ref<string | null>(null)

function setDigitRef(el: unknown, index: number) {
  if (el instanceof HTMLInputElement) digitRefs.value[index] = el
}

function onOtpRelayInput(e: Event) {
  const input = e.target as HTMLInputElement
  const code = input.value.replace(/\D/g, '')
  if (code.length >= 6) {
    pendingRelayCode.value = code
    input.value = ''
  }
}

function onDigitInput(index: number, e: Event) {
  const input = e.target as HTMLInputElement
  const digit = input.value.replace(/\D/g, '')
  if (digit.length > 1) {
    fillDigits(digit)
    if (digit.length >= 6) nextTick(() => verify())
    return
  }
  const newVal = digit ? digit[0]! : ''
  digits.value[index] = newVal
  input.value = newVal
  errorCode.value = null
  if (newVal && index < 5) {
    nextTick(() => digitRefs.value[index + 1]?.focus())
  }
}

function onDigitKeydown(index: number, e: KeyboardEvent) {
  if (e.key === 'Backspace') {
    if (digits.value[index]) {
      digits.value[index] = ''
    } else if (index > 0) {
      digits.value[index - 1] = ''
      nextTick(() => digitRefs.value[index - 1]?.focus())
    }
  } else if (e.key === 'Enter' && otpValue.value.length === 6) {
    verify()
  }
}

function fillDigits(code: string) {
  const clean = code.replace(/\D/g, '').slice(0, 6)
  if (!clean) return
  errorCode.value = null
  digits.value = Array.from({ length: 6 }, (_, i) => clean[i] ?? '')
  nextTick(() => digitRefs.value[Math.min(clean.length - 1, 5)]?.focus())
}

function onDigitPaste(e: ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text') ?? ''
  fillDigits(text)
  if (text.replace(/\D/g, '').length >= 6) nextTick(() => verify())
}

// ── WebOTP: auto-read SMS code on Android Chrome ───────────────────────────
let _otpAbort: AbortController | null = null

function startWebOtp() {
  if (!('OTPCredential' in window)) return
  _otpAbort = new AbortController()
  ;(navigator.credentials.get as (o: unknown) => Promise<Record<string, unknown> | null>)({
    otp: { transport: ['sms'] },
    signal: _otpAbort.signal,
  }).then((cred: Record<string, unknown> | null) => {
    const code = String(cred?.code ?? cred?.id ?? '')
    if (code) { fillDigits(code); nextTick(() => verify()) }
  }).catch(() => { /* dismissed or unsupported */ })
}

function stopWebOtp() {
  _otpAbort?.abort()
  _otpAbort = null
}

onMounted(async () => {
  restoreSendCooldown()
  // getPortalConfig is anonymous (pre-auth) — fetch the public Turnstile site key. The Send button
  // stays disabled (configLoading) until this resolves, so it can't be clicked before the widget is up.
  try {
    const cfg = await getPortalConfig()
    turnstileSiteKey.value = cfg.turnstileSiteKey
    if (turnstileSiteKey.value) {
      await nextTick()
      renderTurnstile(turnstileEl.value, turnstileSiteKey.value)
    }
  } finally {
    configLoading.value = false
  }
})

onUnmounted(() => {
  stopWebOtp()
  if (cooldownTimer) clearInterval(cooldownTimer)
})

function onStepEnter() {
  if (step.value === 'otp') digitRefs.value[0]?.focus()
}

// ── Phone validation ────────────────────────────────────────────────────────
function isValidPhone(val: string): boolean {
  return /^0\d{8,9}$/.test(normalizePhone(val))
}

// ── Actions ─────────────────────────────────────────────────────────────────
async function sendCode() {
  const trimmed = phone.value.trim()
  if (!trimmed) return
  if (!isValidPhone(trimmed)) {
    errorCode.value = 'INVALID_PHONE'
    return
  }
  phone.value = normalizePhone(trimmed)
  loading.value = true
  errorCode.value = null
  // Focus relay synchronously to preserve iOS user-activation for QuickType OTP bar
  iosOtpRelay.value?.focus()
  const result = await createOtp(phone.value, turnstileToken.value)
  loading.value = false
  // Token is single-use — re-arm a fresh one for any retry/resend.
  if (captchaRequired.value) resetTurnstile()
  if (result.errorCode) {
    pendingRelayCode.value = null
    errorCode.value = result.errorCode
    // No client block on a failed send. Only the server's real rate-limit imposes a wait; other
    // failures let the user fix the input and retry as soon as a fresh Turnstile token re-arms.
    if (result.errorCode === 'RATE_LIMITED') startSendCooldown(60)
    return
  }
  // Sent successfully → start the 1-minute resend cooldown (matches the server's resend window).
  startSendCooldown(60)
  channels.value = result.channels
  digits.value = ['', '', '', '', '', '']
  step.value = 'otp'
  nextTick(() => {
    const pending = pendingRelayCode.value
    pendingRelayCode.value = null
    if (pending && pending.length >= 6) {
      fillDigits(pending)
      nextTick(() => verify())
    } else {
      digitRefs.value[0]?.focus()
      startWebOtp()
    }
  })
}

async function verify() {
  if (otpValue.value.length < 6) return
  loading.value = true
  errorCode.value = null
  const result = await checkOtp(phone.value.trim(), otpValue.value)
  loading.value = false
  if (result.errorCode) {
    errorCode.value    = result.errorCode
    attemptsLeft.value = result.attemptsRemaining
    setRetryThrottle()
    digits.value = ['', '', '', '', '', '']
    nextTick(() => digitRefs.value[0]?.focus())
    return
  }
  login({
    userId:             result.userId,
    email:              result.email,
    firstName:          result.firstName,
    lastName:           result.lastName,
    status:             result.status,
    authToken:          result.authToken,
    authTokenExpiresAt: result.authTokenExpiresAt,
  })
  // Post-login routing — solution-specific overrides go in otpAuthConfig.ts.
  const status = result.status
  const custom = OTP_AUTH_CONFIG.onLoginRedirect?.(status)
  if (custom) router.push(custom)
  else if (OTP_AUTH_CONFIG.blockedStatuses.includes(status)) router.push(OTP_AUTH_CONFIG.lockedOutPath)
  else router.push(OTP_AUTH_CONFIG.homePath)
}

async function resend() {
  stopWebOtp()
  errorCode.value = null
  digits.value = ['', '', '', '', '', '']
  await sendCode()
}

function backToPhone() {
  stopWebOtp()
  // Changing the number is an explicit "send to a different phone" — drop the resend cooldown so the
  // new number can be sent immediately (the server only rate-limits the same number).
  clearSendCooldown()
  errorCode.value = null
  attemptsLeft.value = null
  channels.value = []
  digits.value = ['', '', '', '', '', '']
  step.value = 'phone'
}

</script>

<template>
  <div
    class="login-page"
    :class="{ 'login-page--phoneStep': step === 'phone' }"
  >
    <!-- iOS OTP relay: focused synchronously in sendCode() to preserve iOS user-activation
         context so the QuickType OTP bar appears when the SMS arrives -->
    <input
      v-if="step === 'phone'"
      ref="iosOtpRelay"
      class="otp-ios-relay"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="6"
      tabindex="-1"
      aria-label="קוד אימות"
      @input="onOtpRelayInput"
    />

    <!-- Same app header bar as inside the app: logo + app name + accessibility, no user avatar
         (not authenticated). The login card below is left exactly as-is. -->
    <SmkbAppHeader
      :app-name="SOLUTION.appName"
      :show-language="false"
      :show-theme-toggle="false"
      :show-user-menu="false"
    />

    <SmkbLoginPage
      :title="step === 'phone' ? `כניסה ל${appTitle}` : 'הזן/י את הקוד'"
      :subtitle="step === 'phone' ? 'הזן/י את מספר הטלפון הנייד שלך' : 'שלחנו את קוד האימות ל:'"
      :show-language="false"
    >
      <Transition name="step" mode="out-in" @after-enter="onStepEnter">

        <!-- Step 1: phone number entry -->
        <div v-if="step === 'phone'" key="phone" class="login-form">
          <div v-if="sessionExpired" class="session-expired-banner" role="alert">
            פג תוקף החיבור — אנא התחבר/י מחדש
          </div>
          <SmkbInput
            v-model="phone"
            type="tel"
            placeholder="05X-XXXXXXX"
            :status="errorCode ? 'error' : 'default'"
            @keyup.enter="sendCode"
          />
          <p v-if="errorCode" class="login-error" role="alert">{{ errorMessage }}</p>
        </div>

        <!-- Step 2: OTP entry -->
        <div v-else key="otp" class="login-form">
          <ul v-if="channels.length" class="otp-channels">
            <li v-for="ch in channels" :key="ch.type" class="otp-channel">
              <span class="otp-channel__label">{{ channelLabel(ch.type) }}</span>
              <span dir="ltr" class="otp-channel__value">{{ ch.maskedValue }}</span>
            </li>
          </ul>
          <div class="otp-grid" dir="ltr" role="group" aria-label="קוד אימות">
            <input
              v-for="(_, i) in digits"
              :key="i"
              :ref="(el) => setDigitRef(el, i)"
              :value="digits[i]"
              class="otp-digit"
              :class="{
                'otp-digit--filled': digits[i] !== '',
                'otp-digit--error': !!errorCode,
                'otp-digit--group-start': i === 3,
              }"
              type="text"
              inputmode="numeric"
              :maxlength="i === 0 ? 6 : 1"
              :autocomplete="i === 0 ? 'one-time-code' : 'off'"
              @input="onDigitInput(i, $event)"
              @keydown="onDigitKeydown(i, $event)"
              @paste="onDigitPaste"
            />
          </div>
          <p v-if="errorCode" class="login-error" role="alert">{{ errorMessage }}</p>
          <SmkbButton
            class="login-btn"
            :loading="loading"
            :disabled="verifyDisabled"
            @click="verify"
          >
            כניסה
          </SmkbButton>
          <div class="otp-footer-actions">
            <button
              class="resend-link"
              type="button"
              :disabled="sendDisabled"
              @click="resend"
            >
              {{ sendCooldown > 0 ? `לא קיבלת קוד? שלחו שוב (${sendCooldown})` : 'לא קיבלת קוד? שלחו שוב' }}
            </button>
            <button class="resend-link" type="button" @click="backToPhone">
              שינוי מספר טלפון
            </button>
          </div>
        </div>

      </Transition>

      <!-- Turnstile widget + send button. Kept mounted across steps (v-show) so the single-use
           token survives for resend; shown only on the phone step. The widget sits directly
           above the send button. The widget itself only renders when a site key is configured. -->
      <div v-show="step === 'phone'" class="phone-actions">
        <div v-show="captchaRequired" ref="turnstileEl" class="turnstile-container"></div>
        <p v-if="turnstileFailed" class="turnstile-status turnstile-status--error" role="alert">
          אימות האבטחה נכשל. ייתכן ואתם משתמשים בדפדפן שאינו נתמך או בתוספים החוסמים את הבדיקה.
          <button type="button" class="turnstile-retry" @click="retryTurnstile">נסה/י שוב</button>
        </p>
        <p v-else-if="verifyingSecurity" class="turnstile-status turnstile-status--verifying" role="status" aria-live="polite">
          <span class="turnstile-spinner" aria-hidden="true"></span>
          <span>מבצע אימות אבטחה</span>
        </p>
        <SmkbButton
          class="login-btn"
          :loading="loading"
          :disabled="sendDisabled"
          @click="sendCode"
        >
          {{ sendCooldown > 0 ? `שליחה (${sendCooldown})` : 'שליחה' }}
        </SmkbButton>
      </div>
    </SmkbLoginPage>
  </div>
</template>

<style scoped>
/* iOS OTP relay — off-screen, NOT display:none/visibility:hidden (those block focus) */
.otp-ios-relay {
  position: fixed;
  top: -9999px;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}

/* Turnstile status line (between the widget and the Send button). */
.turnstile-status {
  margin: 0;
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-foreground-muted);
  text-align: center;
}
.turnstile-status--error {
  color: var(--smkb-color-danger);
}
/* "Verifying security" line: centered spinner + text. */
.turnstile-status--verifying {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--smkb-space-2);
}
.turnstile-spinner {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border: 2px solid var(--smkb-color-border);
  border-top-color: var(--smkb-color-primary);
  border-radius: 50%;
  animation: turnstile-spin 0.65s linear infinite;
}
@keyframes turnstile-spin {
  to {
    transform: rotate(360deg);
  }
}
.turnstile-retry {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: var(--smkb-color-primary);
  text-decoration: underline;
  cursor: pointer;
}

/* App header bar on top, then the login shell fills the rest (the shell defaults to 100dvh, which
   would otherwise push the header off-screen). */
.login-page {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}
.login-page :deep(.smkb-login-page) {
  flex: 1;
  min-block-size: 0;
}

/* Login page only: drop the header's bottom shadow (kept everywhere else). */
.login-page :deep(.smkb-app-header) {
  box-shadow: none;
}

/* ─── SmkbLoginPage slot top margin ─────────────────────────────────────── */

:deep(.smkb-login-page__body) {
  margin-block-start: var(--smkb-space-2);
}

/* Spacing between title and subtitle */
:deep(.smkb-login-page__subtitle) {
  margin-block-start: var(--smkb-space-4);
}

/* Phone step: subtitle alignment */
.login-page--phoneStep :deep(.smkb-login-page__subtitle) {
  text-align: start;
  color: var(--smkb-color-foreground-muted);
  font-size: var(--smkb-font-size-sm);
  font-weight: var(--smkb-font-weight-medium);
}

/* ─── Form wrapper ───────────────────────────────────────────────────────── */

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-4);
}

.login-btn {
  width: 100%;
}

/* Phone-step actions: Turnstile widget stacked directly above the send button. */
.phone-actions {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-4);
  margin-block-start: var(--smkb-space-4);
}

/* Turnstile widget — centered; reserve height to avoid layout shift while it loads */
.turnstile-container {
  display: flex;
  justify-content: center;
  min-height: 65px;
}

/* Phone input: right-align text and placeholder for RTL UI */
.login-form :deep(input[type="tel"]) {
  text-align: right;
  direction: rtl;
}

.login-error {
  margin: 0;
  color: var(--smkb-color-danger);
  font-size: var(--smkb-font-size-sm);
}

.session-expired-banner {
  padding: var(--smkb-space-3) var(--smkb-space-4);
  background: var(--smkb-color-warning-subtle, #fff8e1);
  color: var(--smkb-color-warning-foreground, #7c5800);
  border: 1px solid var(--smkb-color-warning, #f59e0b);
  border-radius: var(--smkb-radius-md);
  font-size: var(--smkb-font-size-sm);
  text-align: center;
}

/* ─── OTP grid ───────────────────────────────────────────────────────────── */

.otp-grid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--smkb-space-2);
}

.otp-digit {
  width: 48px;
  height: 56px;
  border: 1.5px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  font-size: var(--smkb-font-size-2xl);
  font-weight: 600;
  text-align: center;
  background: var(--smkb-color-surface);
  color: var(--smkb-color-foreground);
  outline: none;
  caret-color: transparent;
  transition:
    border-color var(--smkb-motion-duration-fast) var(--smkb-motion-easing-default),
    background var(--smkb-motion-duration-fast) var(--smkb-motion-easing-default),
    box-shadow var(--smkb-motion-duration-fast) var(--smkb-motion-easing-default);
}

.otp-digit:focus {
  border-color: var(--smkb-color-border-focus);
  box-shadow: var(--smkb-focus-ring);
}

.otp-digit--filled {
  background: var(--smkb-color-primary-subtle);
  border-color: var(--smkb-color-primary);
}

.otp-digit--error {
  border-color: var(--smkb-color-danger);
}

.otp-digit--error:focus {
  box-shadow: 0 0 0 3px var(--smkb-color-danger-subtle);
}

.otp-digit--group-start {
  margin-inline-start: var(--smkb-space-3);
}

/* ─── Channel list ───────────────────────────────────────────────────────── */

.otp-channels {
  list-style: none;
  margin: 0 0 var(--smkb-space-3);
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-1);
}

.otp-channel {
  display: flex;
  align-items: center;
  gap: var(--smkb-space-2);
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-foreground-muted);
}

.otp-channel::before {
  content: '';
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--smkb-color-primary);
  flex-shrink: 0;
}

.otp-channel__label {
  font-weight: var(--smkb-font-weight-medium);
  color: var(--smkb-color-foreground);
}

.otp-channel__label::after {
  content: ':';
}

.otp-channel__value {
  font-family: monospace;
}

/* ─── OTP footer actions ─────────────────────────────────────────────────── */

.otp-footer-actions {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-2);
  align-items: center;
}

/* ─── Resend / change-phone links ────────────────────────────────────────── */

.resend-link {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-primary);
  text-align: center;
  text-decoration: none;
}

.resend-link:hover {
  text-decoration: underline;
}

.resend-link:disabled {
  color: var(--smkb-color-text-secondary);
  cursor: not-allowed;
  text-decoration: none;
}

/* ─── Step transition ────────────────────────────────────────────────────── */

.step-enter-active,
.step-leave-active {
  transition:
    opacity var(--smkb-motion-duration-normal) var(--smkb-motion-easing-default),
    transform var(--smkb-motion-duration-normal) var(--smkb-motion-easing-default);
}

.step-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.step-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ─── Mobile upscale (≤ 600px) ───────────────────────────────────────────── */

@media (max-width: 600px) {
  :deep(.smkb-login-page__brand .smkb-logo__svg) {
    width: 200px !important;
  }

  :deep(.smkb-login-page__title) {
    font-size: var(--smkb-font-size-2xl);
  }

  :deep(.smkb-login-page__subtitle) {
    font-size: var(--smkb-font-size-lg);
  }

  .login-page--phoneStep :deep(.smkb-login-page__subtitle) {
    font-size: var(--smkb-font-size-md);
  }

  :deep(.smkb-login-page__app-name) {
    font-size: var(--smkb-font-size-md);
  }

  .login-error {
    font-size: var(--smkb-font-size-md);
  }

  .resend-link {
    font-size: var(--smkb-font-size-md);
  }

  /* Let the 6 digits flex to fill the row and shrink on narrow screens so they
     never overflow. max-width caps them so they don't get oversized on wider phones. */
  .otp-grid {
    gap: var(--smkb-space-1);
  }

  .otp-digit {
    flex: 1 1 0;
    min-width: 0;
    width: auto;
    max-width: 56px;
    height: 60px;
    font-size: var(--smkb-font-size-xl);
  }

  .otp-digit--group-start {
    margin-inline-start: var(--smkb-space-2);
  }

  .login-btn {
    --smkb-button-padding-x: var(--smkb-space-6);
    --smkb-button-padding-y: var(--smkb-space-3);
    --smkb-button-font-size: var(--smkb-font-size-lg);
  }
}
</style>
