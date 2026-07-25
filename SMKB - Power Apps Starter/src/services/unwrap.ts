// Shared unwrapper for generated Power Automate flow-service results.
//
// This is the single security-relevant boundary that decides whether a flow call
// counts as success or failure — keep it in ONE place so the contract can't drift
// between services. A flow returns `{ success, data, error }`; on `success === false`
// we throw the flow's error code (e.g. 'EMAIL_EXISTS') so callers surface a real
// failure instead of silently treating it as success.

/** The runtime shape every generated `*Service.Run()` resolves to. */
export interface FlowResult<T> {
  success?: boolean
  data?: T
  error?: { code?: string; message?: string }
}

/** Return the flow's `data`, or throw its error code/message when `success === false`. */
export function unwrap<T>(result: unknown): T {
  const r = result as FlowResult<T>
  if (r && r.success === false) {
    throw new Error(r.error?.code ?? r.error?.message ?? 'ERROR')
  }
  return r?.data as T
}
