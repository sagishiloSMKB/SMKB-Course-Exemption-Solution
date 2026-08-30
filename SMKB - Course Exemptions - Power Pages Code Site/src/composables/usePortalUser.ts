import { ref, onMounted } from 'vue'

export interface PortalUserInfo {
  isAuthenticated: boolean
  userName: string
  firstName: string
  lastName: string
  email: string
  contactId: string
  tenantId: string
}

const ANONYMOUS: PortalUserInfo = {
  isAuthenticated: false,
  userName: '',
  firstName: '',
  lastName: '',
  email: '',
  contactId: '',
  tenantId: '',
}

/**
 * Returns the current Power Pages user from the platform-injected global.
 *
 * window.Microsoft.Dynamic365.Portal.User is set by the Power Pages platform
 * script after the page loads. Read it inside onMounted, not at module level.
 *
 * When running under the Vite dev server (localhost), this global will only be
 * populated if your Vite proxy points to the live portal and the browser has a
 * valid session cookie from that origin.
 */
export function usePortalUser() {
  const user = ref<PortalUserInfo>({ ...ANONYMOUS })

  onMounted(() => {
    const u = window.Microsoft?.Dynamic365?.Portal?.User
    const tenantId = window.Microsoft?.Dynamic365?.Portal?.tenant ?? ''

    user.value = {
      isAuthenticated: !!(u?.userName),
      userName: u?.userName ?? '',
      firstName: u?.firstName ?? '',
      lastName: u?.lastName ?? '',
      email: u?.email ?? '',
      contactId: u?.contactId ?? '',
      tenantId,
    }
  })

  return { user }
}
