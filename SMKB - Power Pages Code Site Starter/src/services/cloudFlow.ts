// ─────────────────────────────────────────────────────────────────────────────
// Power Pages cloud flow client
//
// Invokes Power Automate cloud flows attached to this Power Pages site.
//
// Setup (once per site, after first deploy):
//   1. Create a Power Automate flow with trigger "When Power Pages calls a flow"
//      — the flow MUST be in a solution (not a personal/non-solution flow)
//   2. Power Pages Studio → Set up → Cloud flows → + Add cloud flow
//   3. Assign web roles to the flow:
//      • Authenticated Users — for flows that require sign-in
//      • Anonymous Users — only for flows callable without sign-in
//   4. Copy the GUID from the trigger URL shown in Studio:
//      /_api/cloudflow/v1.0/trigger/<guid-here>
//   5. Store the GUID in src/config/flows.ts
//      (never hardcode GUIDs in this service — they are site-specific)
//
// Security:
//   Table permissions are NOT enforced inside cloud flows. Any Dataverse access
//   inside the flow must be validated within the flow itself (re-check contactId,
//   accountId, or other scoping values before reading or writing records).
//
// ALM note:
//   Flow GUIDs are environment-specific. After promoting a solution to a new
//   environment, manually re-register the flow in that site via Studio →
//   Cloud flows — it does not auto-register on solution import.
//
// Docs: https://learn.microsoft.com/en-us/power-pages/configure/cloud-flow-integration
// ─────────────────────────────────────────────────────────────────────────────

import { getCsrfToken } from './csrf'

// Power Pages Code Site shell — available at runtime, absent in local dev
interface ShellDeferred<T> {
  done(fn: (res: T) => void): ShellDeferred<T>
  fail(fn: (xhr: unknown, status: string, error: string) => void): ShellDeferred<T>
}
interface PowerPagesShell {
  ajaxSafePost<T = unknown>(options: { type: 'POST'; url: string; data: Record<string, string> }): ShellDeferred<T>
}
declare global { interface Window { shell?: PowerPagesShell } }

/**
 * Thrown when the session token is missing, expired, or rejected by the server.
 * Used by the optional OTP auth module (src/modules/otp-auth/invokeAuthFlow.ts);
 * useFlowErrorToast ignores it so the global session-expired handler owns the UX.
 */
export class SessionExpiredError extends Error {
  constructor() { super('SESSION_EXPIRED') }
}

/**
 * Thrown when a flow returns a business/expected error as HTTP 200 with an
 * `errorCode` in the body, or on a transport/platform failure (code 'ERROR').
 * `data` holds the full response body when available (e.g. extra fields the
 * flow returned alongside the errorCode).
 */
export class FlowError extends Error {
  constructor(public code: string, public data?: unknown) {
    super(code)
    this.name = 'FlowError'
  }
}

/**
 * Resolve a flow's 200 body, converting an `errorCode` field into a thrown FlowError.
 * Exported for tests — application code should call invokeFlow instead.
 */
export function unwrapFlowResult<T>(body: unknown): T {
  if (body && typeof body === 'object') {
    const ec = (body as Record<string, unknown>).errorCode
    if (typeof ec === 'string' && ec) throw new FlowError(ec, body)
  }
  return (body ?? undefined) as T
}

/**
 * Invokes a Power Pages cloud flow and returns its output (if any).
 *
 * @param flowGuid  The GUID from the flow's trigger URL in Power Pages Studio.
 *                  Site-specific — store in src/config/flows.ts per environment.
 *
 * @param params    Key/value pairs that map to the flow trigger's input parameters.
 *                  Names must match exactly the parameter names defined in the flow.
 *                  Supported types: string, number, boolean.
 *                  Omit or pass {} if the flow has no input parameters.
 *
 * @returns
 *   - If the flow has a "Return value(s) to Power Pages" action: JSON object with the output fields.
 *   - If the flow has no return action (fire-and-forget): resolves to undefined.
 *
 * Error contract (see docs/FLOW-ERROR-CONTRACT.md): flows return business errors
 * as HTTP 200 with an `errorCode` field in the body. Power Pages discards the
 * body of any non-2xx flow response (returning a generic {ErrorCode:'00000006'}
 * envelope), so non-2xx cannot carry meaning. invokeFlow surfaces an `errorCode`
 * body as a thrown `FlowError` whose `.code` is that errorCode. Genuine
 * transport/platform failures (network, 403 web-role-not-assigned, 400 schema
 * mismatch) also throw `FlowError` with code 'ERROR'. Success bodies (no
 * errorCode) resolve normally.
 *
 * @example — fire-and-forget (no return value from flow)
 * await invokeFlow(FLOWS.submitContactForm, {
 *   email: user.value.email,
 *   message: formData.message,
 * })
 *
 * @example — with return value
 * const result = await invokeFlow<{ approvalId: string; status: string }>(
 *   FLOWS.requestApproval,
 *   { contactId: user.value.contactId, amount: 500 },
 * )
 * console.log(result.approvalId)
 */
export async function invokeFlow<T = void>(
  flowGuid: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const url = `/_api/cloudflow/v1.0/trigger/${flowGuid}`
  const shell = window.shell

  if (shell?.ajaxSafePost) {
    // Power Pages Code Site runtime — shell handles CSRF + form-urlencoded automatically.
    // NOTE: do NOT set contentType; the shell must send application/x-www-form-urlencoded.
    return new Promise<T>((resolve, reject) => {
      shell.ajaxSafePost<T>({ type: 'POST', url, data: { eventData: JSON.stringify(params) } })
        .done((res) => {
          try { resolve(unwrapFlowResult<T>(res)) } catch (e) { reject(e) }
        })
        .fail((_xhr, status, error) => {
          console.error(`[invokeFlow] ${status} — guid: ${flowGuid}`, error)
          reject(new FlowError('ERROR', `${status}: ${error}`))
        })
    })
  }

  // Fallback: local dev via Vite proxy (window.shell not present outside the portal runtime)
  const token = await getCsrfToken()
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      '__RequestVerificationToken': token,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'x-requested-with': 'XMLHttpRequest',
    },
    body: new URLSearchParams({ eventData: JSON.stringify(params) }),
  })

  if (!res.ok) {
    const text = await res.text()
    let detail: unknown
    try { detail = JSON.parse(text) } catch { detail = text }
    console.error(`[invokeFlow] fetch fallback ${res.status} ${res.statusText} — guid: ${flowGuid}`, detail)
    throw new FlowError('ERROR', detail)
  }

  // 202 Accepted = fire-and-forget; flow runs asynchronously with no return value
  if (res.status === 202) return undefined as T

  // A fire-and-forget flow can also answer 200 with an EMPTY body (no "Return value(s) to
  // Power Pages" action). res.json() then throws a bare SyntaxError, which is not a FlowError -
  // so `e instanceof FlowError` never matches, invokeAuthFlow cannot classify it, and the
  // documented contract ("transport failures arrive as FlowError('ERROR')") is broken by the
  // success path. Read text first and treat empty as "no value".
  const body = await res.text()
  if (body.trim() === '') return undefined as T
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    console.error(`[invokeFlow] 200 with a non-JSON body - guid: ${flowGuid}`, body.slice(0, 200))
    throw new FlowError('ERROR', body)
  }
  return unwrapFlowResult<T>(parsed)
}
