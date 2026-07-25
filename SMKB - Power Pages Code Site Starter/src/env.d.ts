/// <reference types="vite/client" />

// Vite environment variables — extend as needed
interface ImportMetaEnv {
  readonly VITE_PORTAL_URL: string
  readonly VITE_TENANT_ID: string
  readonly VITE_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Power Pages injects user context into window.Microsoft at page load.
// This global is only present when the SPA is served by Power Pages —
// it will be undefined in local dev until you sign in via the proxy.
interface PortalUser {
  userName: string   // empty string when anonymous
  firstName: string
  lastName: string
  email: string
  contactId: string
}

interface Window {
  Microsoft?: {
    Dynamic365?: {
      Portal?: {
        User?: PortalUser
        tenant?: string  // Azure AD / Entra tenant GUID
      }
    }
  }
}
