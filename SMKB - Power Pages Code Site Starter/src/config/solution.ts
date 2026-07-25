// ─────────────────────────────────────────────────────────────────────────────
// Central solution constants — FILL THESE IN BEFORE FIRST DEPLOY.
//
// This is the single place for per-solution identity. Everything else in the
// starter (App.vue header, document title, session-storage keys, flow error
// language) reads from here — never hardcode these values elsewhere.
//
// The literal string 'CHANGEME' is a machine-checkable sentinel:
// /ppcs-provision-site and /ppcs-deploy grep this file and HALT while any
// CHANGEME remains (same role as "MY-SITE-NAME" in powerpages.config.json).
// ─────────────────────────────────────────────────────────────────────────────

export type LanguageCode = 'he' | 'en'

export interface LanguageDef {
  code: LanguageCode
  label: string
  shortLabel: string
  dir: 'rtl' | 'ltr'
}

export interface SolutionConfig {
  /**
   * Solution short prefix, lowercase, no underscore — e.g. 'pvch'. It is the middle
   * segment of every component's schema name (smkb_<prefix>_<PascalName>), and drives
   * sessionStorage keys and the site name (uppercased) — see POWER_PAGES_SITE_NAME.
   */
  prefix: string
  /**
   * Human site name WITHOUT the prefix — e.g. 'Lecturer Portal'. The full Power
   * Pages site name is derived as `<PREFIX> - <siteName>` (see POWER_PAGES_SITE_NAME,
   * e.g. 'PVCH - Lecturer Portal') and MUST be mirrored into `siteName` in
   * powerpages.config.json — /ppcs-provision-site syncs it and /ppcs-deploy verifies
   * it. Keep it short and ASCII: it becomes the Dataverse site (adx_website) name.
   */
  siteName: string
  /** App display name shown in SmkbAppHeader (and the OTP login page if enabled). */
  appName: { he: string; en: string }
  /** Browser tab title — main.ts overrides the Power Pages-injected title with this. */
  documentTitle: string
  /**
   * Initial <html lang>/<dir> (set in main.ts before mount) and the language
   * used for flow error messages (see services/flowErrors.ts).
   */
  defaultLanguage: LanguageCode
  /**
   * Languages offered by the SmkbAppHeader toggle. An empty array means a fixed
   * single-language app: the header shows no toggle and defaultLanguage's
   * direction stays as set by main.ts.
   */
  languages: LanguageDef[]
}

export const SOLUTION: SolutionConfig = {
  prefix: 'CHANGEME',
  siteName: 'CHANGEME-SITE-NAME',
  appName: { he: 'CHANGEME-APP-NAME-HE', en: 'CHANGEME-APP-NAME-EN' },
  documentTitle: 'CHANGEME-TITLE',
  defaultLanguage: 'he',
  languages: [
    { code: 'he', label: 'עברית', shortLabel: 'עב', dir: 'rtl' },
    { code: 'en', label: 'English', shortLabel: 'EN', dir: 'ltr' },
  ],
}

/** Direction of the default language (fallback rtl for 'he', ltr otherwise). */
export function defaultDirection(): 'rtl' | 'ltr' {
  const def = SOLUTION.languages.find((l) => l.code === SOLUTION.defaultLanguage)
  return def?.dir ?? (SOLUTION.defaultLanguage === 'he' ? 'rtl' : 'ltr')
}

/** Derived — single source for the OTP auth module's sessionStorage key. */
export const SESSION_STORAGE_KEY = `smkb-${SOLUTION.prefix}-auth`

/**
 * Canonical Power Pages site name — the uppercased publisher prefix, then the
 * site name, e.g. 'PVCH - Lecturer Portal'. Every component this starter creates
 * is namespaced to its solution through the prefix; the site (adx_website) carries
 * it in its own name. This value MUST be the `siteName` in powerpages.config.json
 * (PAC CLI reads that file directly): /ppcs-provision-site writes it there and
 * /ppcs-deploy verifies the two still agree.
 */
export const POWER_PAGES_SITE_NAME = `${SOLUTION.prefix.toUpperCase()} - ${SOLUTION.siteName}`
