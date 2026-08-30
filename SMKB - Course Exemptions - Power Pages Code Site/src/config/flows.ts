// Flow GUIDs — site-specific, assigned by Power Pages Studio after flow registration.
// This registry ships EMPTY: every solution fills in its own GUIDs.
// Run /ppcs-register-flow to add entries, or follow the steps below manually.
//
// For each flow:
//   1. Build the flow with trigger "When Power Pages calls a flow" in Power Automate
//      — the flow MUST be in a solution (not a personal/non-solution flow)
//   2. Power Pages Studio → Set up → Cloud flows → + Add cloud flow → select the flow
//   3. Assign web roles: "Authenticated Users" for private flows;
//      add "Anonymous Users" only for flows callable without sign-in
//   4. Copy the GUID from the trigger URL shown in Studio
//      e.g.  /_api/cloudflow/v1.0/trigger/<guid-here>
//   5. Paste the GUID into a named entry below
//
// Error contract: flows return business errors as HTTP 200 with an `errorCode`
// field — see docs/FLOW-ERROR-CONTRACT.md and services/cloudFlow.ts.
//
// ALM note: GUIDs are environment-specific. After promoting the solution to a
// new environment, re-register each flow in that site's Studio and update the
// GUIDs here (they do not auto-register on solution import).
//
// Typed as Record<string, string> (not `as const`) so entries can be appended
// without retyping call sites; name entries camelCase after what the flow does.
export const FLOWS: Record<string, string> = {
  // exampleFlow: '4d22a1a2-8a67-e681-9985-3f36acfb8ed4',
}
