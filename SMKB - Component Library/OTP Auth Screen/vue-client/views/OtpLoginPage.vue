<script setup lang="ts">
import { ref, computed, watch, unref, nextTick, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from '../composables/useI18n'
import { useAuth } from '../composables/useAuth'
import { createOtp, checkOtp } from '../services/authService'
import type { OtpChannel } from '../services/authService'
import { I18N_OTP } from '../consts/i18n-otp'
import type { Lang } from '../consts/i18n-otp'
import { isValidEmail } from '../utils/emailValidation'

const router = useRouter()
const route  = useRoute()
const { t, lang, setLang } = useI18n()
const { login } = useAuth()

// [ADAPT]: rename contextId to your domain parameter (e.g. eventId) to match your route
// definition and authService.ts. Remove if your flow has no context identifier.
const contextId = route.params.contextId as string | undefined

const step         = ref<'email' | 'otp'>('email')
const email        = ref('')
const digits       = ref<string[]>(['', '', '', '', '', ''])
const channels     = ref<OtpChannel[]>([])
const loading      = ref(false)
const errorCode    = ref<string | null>(null)
const attemptsLeft = ref<number | null>(null)
const retryActive  = ref(false)
let retryTimer: ReturnType<typeof setTimeout> | null = null

function setRetryThrottle() {
  if (retryTimer) clearTimeout(retryTimer)
  retryActive.value = true
  retryTimer = setTimeout(() => { retryActive.value = false }, 3000)
}

const langModel = computed({
  get: () => unref(lang) as Lang,
  set: (v: string) => setLang(v as Lang),
})

const otpValue       = computed(() => digits.value.join(''))
const verifyDisabled = computed(() => otpValue.value.length < 6 || retryActive.value)

const errorMessage = computed(() => {
  if (!errorCode.value) return ''
  switch (errorCode.value) {
    case 'INVALID_EMAIL': return t(I18N_OTP.loginErrInvalidEmail)
    case 'NOT_FOUND':     return t(I18N_OTP.loginErrNotFound)
    case 'LOCKED':        return step.value === 'otp' ? t(I18N_OTP.loginErrLockedAfter) : t(I18N_OTP.loginErrLocked)
    case 'WRONG_OTP':     return attemptsLeft.value !== null
                            ? I18N_OTP.loginErrWrongOtp[lang.value](attemptsLeft.value)
                            : t(I18N_OTP.loginErrGeneric)
    case 'OTP_NOT_CONFIGURED': return t(I18N_OTP.loginErrOtpNotConfigured)
    case 'OTP_SEND_FAILED':    return t(I18N_OTP.loginErrOtpSendFailed)
    case 'RATE_LIMITED':       return t(I18N_OTP.loginErrRateLimited)
    default:              return t(I18N_OTP.loginErrGeneric)
  }
})

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

// ── WebOTP: auto-read SMS code on Android Chrome ──────────────────────────
let _otpAbort: AbortController | null = null

function startWebOtp() {
  if (!('OTPCredential' in window)) return
  _otpAbort = new AbortController()
  ;(navigator.credentials.get as Function)({
    otp: { transport: ['sms'] },
    signal: _otpAbort.signal,
  }).then((cred: any) => {
    const code = cred?.code ?? cred?.id ?? ''
    if (code) {
      fillDigits(code)
      nextTick(() => verify())
    }
  }).catch(() => { /* dismissed or unsupported */ })
}

function stopWebOtp() {
  _otpAbort?.abort()
  _otpAbort = null
}

onUnmounted(stopWebOtp)

watch(email, () => {
  if (errorCode.value === 'INVALID_EMAIL' || errorCode.value === 'RATE_LIMITED') errorCode.value = null
})

function onStepEnter() {
  if (step.value === 'otp') {
    digitRefs.value[0]?.focus()
  }
}

async function sendCode() {
  const trimmed = email.value.trim()
  if (!trimmed) return
  if (!isValidEmail(trimmed)) {
    errorCode.value = 'INVALID_EMAIL'
    return
  }
  loading.value   = true
  errorCode.value = null
  // iOS OTP relay: focused synchronously before the async flow call to preserve
  // user-activation context — keeps keyboard QuickType bar visible when SMS arrives
  iosOtpRelay.value?.focus()
  const result = await createOtp(trimmed, contextId)
  loading.value = false
  if (result.errorCode) {
    pendingRelayCode.value = null
    errorCode.value = result.errorCode
    return
  }
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
  loading.value   = true
  errorCode.value = null
  const result = await checkOtp(email.value.trim(), otpValue.value, contextId)
  loading.value = false
  if (result.errorCode) {
    errorCode.value    = result.errorCode
    attemptsLeft.value = result.attemptsRemaining
    setRetryThrottle()
    digits.value = ['', '', '', '', '', '']
    nextTick(() => digitRefs.value[0]?.focus())
    return
  }
  login({ inviteeId: result.inviteeId, email: result.email, firstName: result.firstName, lastName: result.lastName })
  // [ADAPT]: replace with your post-auth redirect target
  router.push({ name: 'home' })
}

async function resend() {
  stopWebOtp()
  errorCode.value = null
  digits.value = ['', '', '', '', '', '']
  await sendCode()
}

function backToEmail() {
  stopWebOtp()
  errorCode.value = null
  attemptsLeft.value = null
  channels.value = []
  digits.value = ['', '', '', '', '', '']
  step.value = 'email'
}
</script>

<template>
  <div
    class="login-page"
    :class="{ 'login-page--emailStep': step === 'email' }"
  >
  <!-- iOS OTP relay: focused synchronously in sendCode() to preserve iOS user-activation
       context so keyboard opens and QuickType bar shows when SMS arrives -->
  <input
    v-if="step === 'email'"
    ref="iosOtpRelay"
    class="otp-ios-relay"
    type="text"
    inputmode="numeric"
    autocomplete="one-time-code"
    maxlength="6"
    tabindex="-1"
    :aria-label="t(I18N_OTP.loginOtpHeading)"
    @input="onOtpRelayInput"
  />

  <SmkbLoginPage
    v-model="langModel"
    :title="step === 'email' ? t(I18N_OTP.loginHeading) : t(I18N_OTP.loginOtpHeading)"
    :subtitle="step === 'email' ? t(I18N_OTP.loginEmailLead) : t(I18N_OTP.loginOtpDescLead)"
  >
    <Transition name="step" mode="out-in" @after-enter="onStepEnter">

      <!-- Step 1: email -->
      <div v-if="step === 'email'" key="email" class="login-form">
        <div class="login-email-intro">
          <!-- [ADAPT]: update these lines to match your solution's email types -->
          <p class="login-email-intro__college">{{ t(I18N_OTP.loginEmailCollegeLine) }}</p>
          <p class="login-email-intro__or">{{ t(I18N_OTP.loginEmailOr) }}</p>
          <p class="login-email-intro__personal">{{ t(I18N_OTP.loginEmailPersonalHint) }}</p>
        </div>
        <SmkbInput
          v-model="email"
          type="email"
          :placeholder="t(I18N_OTP.loginEmailPlaceholder)"
          autocomplete="email"
          :status="errorCode ? 'error' : 'default'"
          @keyup.enter="sendCode"
        />
        <p v-if="errorCode" class="login-error" role="alert">{{ errorMessage }}</p>
        <SmkbButton
          class="login-btn"
          :loading="loading"
          :disabled="!email.trim()"
          @click="sendCode"
        >
          {{ t(I18N_OTP.loginSendCode) }}
        </SmkbButton>
      </div>

      <!-- Step 2: OTP -->
      <div v-else key="otp" class="login-form">
        <ul class="otp-channels">
          <li v-for="ch in channels" :key="ch.type" class="otp-channel">
            <span dir="ltr" class="otp-channel__value">{{ ch.maskedValue }}</span>
          </li>
        </ul>
        <div class="otp-grid" dir="ltr" role="group" :aria-label="t(I18N_OTP.loginOtpHeading)">
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
          {{ t(I18N_OTP.loginVerify) }}
        </SmkbButton>
        <div class="otp-footer-actions">
          <button class="resend-link" type="button" @click="resend">
            {{ t(I18N_OTP.loginResend) }}
          </button>
          <button class="resend-link" type="button" @click="backToEmail">
            {{ t(I18N_OTP.loginChangeEmail) }}
          </button>
        </div>
      </div>

    </Transition>
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

:deep(.smkb-login-page__body) {
  margin-block-start: var(--smkb-space-2);
}

.login-page--emailStep :deep(.smkb-login-page__subtitle) {
  text-align: start;
  color: var(--smkb-color-foreground-muted);
  font-size: var(--smkb-font-size-sm);
  font-weight: var(--smkb-font-weight-medium);
}

/* ─── Form wrapper ─────────────────────────────────────────── */

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-4);
}

.login-email-intro {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-3);
  margin: 0;
}

.login-email-intro p {
  margin: 0;
}

.login-email-intro__or {
  text-align: start;
  color: var(--smkb-color-foreground-muted);
  font-size: var(--smkb-font-size-sm);
  font-weight: var(--smkb-font-weight-medium);
}

.login-email-intro__college,
.login-email-intro__personal {
  font-size: var(--smkb-font-size-md);
  color: var(--smkb-color-foreground-muted);
  line-height: var(--smkb-line-height-normal);
}

.login-btn {
  width: 100%;
}

.login-error {
  margin: 0;
  color: var(--smkb-color-danger);
  font-size: var(--smkb-font-size-sm);
}

/* ─── OTP grid ─────────────────────────────────────────────── */

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

/* ─── Channel list ─────────────────────────────────────────── */

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

.otp-channel__value {
  font-family: monospace;
}

/* ─── OTP footer (resend + change email) ───────────────────── */

.otp-footer-actions {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-2);
  align-items: center;
}

/* ─── Resend link ──────────────────────────────────────────── */

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

/* ─── Step transition ──────────────────────────────────────── */

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

/* ─── Mobile upscale (≤ 600px) ─────────────────────────────── */

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

  .login-page--emailStep :deep(.smkb-login-page__subtitle) {
    font-size: var(--smkb-font-size-md);
  }

  :deep(.smkb-login-page__app-name) {
    font-size: var(--smkb-font-size-md);
  }

  .login-email-intro {
    gap: var(--smkb-space-2);
  }

  .login-email-intro__college,
  .login-email-intro__personal {
    font-size: var(--smkb-font-size-lg);
  }

  .login-email-intro__or,
  .login-error {
    font-size: var(--smkb-font-size-md);
  }

  .resend-link {
    font-size: var(--smkb-font-size-md);
  }

  .otp-digit {
    width: 54px;
    height: 64px;
  }

  .login-btn {
    --smkb-button-padding-x: var(--smkb-space-6);
    --smkb-button-padding-y: var(--smkb-space-3);
    --smkb-button-font-size: var(--smkb-font-size-lg);
  }
}
</style>
