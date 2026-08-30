// ─────────────────────────────────────────────────────────────────────────────
// Power Pages CSRF token helper
//
// This starter is flows-only by default: ALL Dataverse/backend access goes
// through Power Automate cloud flows (see cloudFlow.ts). There is deliberately
// NO direct Dataverse Web API (/_api/ OData) client — flows are the single
// server-side boundary that re-validates the caller. This helper exists only so
// the cloud-flow fetch fallback (local dev via the Vite proxy) can attach the
// anti-forgery token; in the deployed Power Pages Code Site runtime,
// window.shell.ajaxSafePost attaches it automatically.
//
// To opt out of flows-only and use the Web API directly, run /ppcs-enable-web-api.
// ─────────────────────────────────────────────────────────────────────────────

let _csrfToken: string | null = null

/**
 * Fetches and caches the CSRF token from the portal (from /_layout/tokenhtml).
 * Required by the local-dev fetch fallback in cloudFlow.ts for state-changing requests.
 */
export async function getCsrfToken(): Promise<string> {
  if (_csrfToken) return _csrfToken
  const res = await fetch('/_layout/tokenhtml')
  if (!res.ok) throw new Error(`Failed to fetch CSRF token: ${res.status}`)
  const html = await res.text()
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const token = doc.querySelector<HTMLInputElement>('input[name="__RequestVerificationToken"]')?.value
  if (!token) throw new Error('CSRF token not found — is /_layout/tokenhtml returning the expected page?')
  _csrfToken = token
  return _csrfToken
}
