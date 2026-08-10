import { ref, readonly, watch, type Ref } from 'vue'
import { SOLUTION, type LanguageCode } from '../config/solution'

/**
 * The app's active language — one module-scoped ref, so every consumer sees the same value.
 *
 * WHY THIS EXISTS
 * The header's language toggle used to bind to a `ref` local to `App.vue`. Nothing else could
 * read it, so every user-facing string outside the header resolved against
 * `SOLUTION.defaultLanguage` instead: `flowErrorMessage()` did, and the OTP module's error map
 * did not resolve at all — it was hardcoded Hebrew. Toggling to English changed the header and
 * left every error message in Hebrew. A solution whose `defaultLanguage` is `'en'` shipped
 * Hebrew OTP errors with no toggle involved.
 *
 * That local ref also never touched `<html dir>`, though `CLAUDE.md` claimed it "drives the
 * active language and document direction" — direction was set once in `main.ts` before mount and
 * then never again, so a toggle to a language with the opposite direction left the document in
 * the old one. Setting both attributes here makes the claim true and keeps it in one place.
 *
 * Usage:
 *   const { lang, setLanguage } = useLanguage()   // in a component
 *   flowErrorMessage(code)                        // defaults to currentLanguage()
 */

/** The direction a language is written in, from SOLUTION.languages (fallback: rtl for he). */
function directionOf(code: LanguageCode): 'rtl' | 'ltr' {
  const def = SOLUTION.languages.find((l) => l.code === code)
  return def?.dir ?? (code === 'he' ? 'rtl' : 'ltr')
}

const _lang = ref<LanguageCode>(SOLUTION.defaultLanguage)

// Mirror onto <html> whenever it changes. `main.ts` sets the initial pair before mount (a plain
// refresh must not render LTR until this module is imported), so this only handles changes.
watch(_lang, (code) => {
  document.documentElement.lang = code
  document.documentElement.dir = directionOf(code)
})

/**
 * Read the active language outside a component — for non-reactive callers such as
 * `flowErrorMessage()`'s default argument.
 */
export function currentLanguage(): LanguageCode {
  return _lang.value
}

export function useLanguage(): {
  /** Read-only for consumers; use setLanguage() to change it. */
  lang: Readonly<Ref<LanguageCode>>
  /** Writable ref for `v-model` on SmkbAppHeader's language toggle. */
  langModel: Ref<LanguageCode>
  setLanguage: (code: LanguageCode) => void
  directionOf: (code: LanguageCode) => 'rtl' | 'ltr'
} {
  return {
    lang: readonly(_lang) as Readonly<Ref<LanguageCode>>,
    langModel: _lang,
    setLanguage: (code: LanguageCode) => { _lang.value = code },
    directionOf,
  }
}
