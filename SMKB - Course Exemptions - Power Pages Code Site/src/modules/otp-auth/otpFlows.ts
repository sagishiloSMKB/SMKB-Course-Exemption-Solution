// Flow GUIDs for the OTP auth module — site-specific, assigned by Power Pages
// Studio after flow registration (separate from src/config/flows.ts so the
// dormant module never breaks the base starter's types).
//
// The four flows this module needs (contracts in ./README.md):
//   createOtp        — sends an OTP to the user's registered channels
//   checkOtp         — verifies the OTP and returns the user + session token
//   getPortalConfig  — public config: support contact + Turnstile site key
//   revokeSession    — invalidates a session token server-side (logout / idle timeout)
//
// revokeSession is optional-but-recommended: leave its GUID empty and logout still
// clears local state, but the token stays valid server-side until its absolute
// expiry — so a copied token outlives the logout. See RECIPE.md.
//
// Register each in Power Pages Studio → Set up → Cloud flows and assign the
// **Anonymous Users** web role (these run before sign-in; the OTP session token
// validates access internally on subsequent authenticated flows).
//
// DEV MOCK: while a GUID is empty and you run `npm run dev`, authService.ts
// serves built-in mocks — any phone number works and the OTP is 123456.
export const OTP_FLOWS = {
  createOtp: '',
  checkOtp: '',
  getPortalConfig: '',
  revokeSession: '',
}
