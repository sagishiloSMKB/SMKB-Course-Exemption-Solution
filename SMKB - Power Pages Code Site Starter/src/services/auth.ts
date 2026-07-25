// ─────────────────────────────────────────────────────────────────────────────
// Authentication helpers for Power Pages
//
// Power Pages handles OAuth server-side. The SPA never exchanges tokens;
// it redirects to the portal's built-in auth endpoints and reads the resulting
// session from window.Microsoft.Dynamic365.Portal.User.
// ─────────────────────────────────────────────────────────────────────────────

function getTenantId(): string {
  return window.Microsoft?.Dynamic365?.Portal?.tenant ?? ''
}

/**
 * Returns the URL that initiates the Microsoft Entra ID sign-in flow.
 * The portal redirects back to returnPath after successful authentication.
 *
 * Hash-based routes (#/page) are encoded as %23 so they survive the redirect.
 */
export function getSignInUrl(returnPath?: string): string {
  const tenantId = getTenantId()
  const path = returnPath ?? window.location.pathname + window.location.search
  // Encode '#' as '%23' so hash-based routes survive the server-side redirect
  const hash = window.location.hash.replace('#', '%23')
  const returnUrl = encodeURIComponent(path + hash)

  return (
    `/Account/Login/ExternalLogin` +
    `?provider=${encodeURIComponent(`https://login.windows.net/${tenantId}/`)}` +
    `&returnUrl=${returnUrl}`
  )
}

/** Redirect to the Microsoft Entra ID sign-in page. */
export function signIn(returnPath?: string): void {
  window.location.href = getSignInUrl(returnPath)
}

/** Sign out and return to the site root. */
export function signOut(): void {
  window.location.href = '/Account/Login/LogOff?returnUrl=%2F'
}
