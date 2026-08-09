# Security Baseline — SMKB Power Platform Solutions

> The **security posture** every solution built from this kit inherits: what ships hardened by default,
> what is enforced automatically, and what is a deliberate, documented trade-off. This is a reusable
> house standard — a solution keeps the baseline and records its own concrete findings in
> [`docs/07-security.md`](docs/07-security.md) and its dated [`audit/`](audit/README.md) report.

## Why this exists

An external security company audited an SMKB solution built from this kit and raised **12 findings**.
Almost every fix that solution then made was a fix the **starter should have shipped** — so the next
solution would have earned the same findings again.

The response was not to write a longer checklist. Each control became one of two things:

- a **shipped default** — a site setting, an env-var definition, a hardened template; or
- an **enforced invariant** — a flow-lint rule, an ESLint rule, a pre-commit check.

A control that depends on someone remembering it is not a control. Where something genuinely cannot be
enforced, it is written down here as an accepted trade-off **with its reasoning**, so a future reviewer
can recognise it as deliberate instead of re-raising it.

**How to use this document.** Running [`/security-audit`](.claude/skills/security-audit/SKILL.md)?
Treat everything below as the **expected** state: verify it, record it under "Verified-safe" in the
report, and spend your effort on what this solution added on top. A finding that matches a **Defend**
row below is answered by its reasoning, not re-litigated.

---

## The 12 findings → controls

**Verdicts.** *Fix* — the starter was wrong and now ships differently. *Defend* — the posture was
already correct and is now documented so it reads as intentional.

| # | Finding | Verdict | Control | Where |
|---|---|---|---|---|
| 1 | Session token in `sessionStorage` (XSS) | **Defend** | Server re-validates the token on every call; ≤1h TTL; tab-scoped storage; strict CSP; `v-html` banned | `vue/no-v-html: 'error'` in both SPA ESLint configs |
| 2 | OTP / token stored in clear at rest | **Fix (constrained)** | Short expiry + attempt lockout + clear-on-use + **table restricted to the service account**. No hash exists to use — see below | OTP recipe → "Security baseline for this module" |
| 3 | "Sensitive processes are anonymous" | **Defend** | Anonymous web role + validate-token-in-flow is Microsoft's documented model; the token check is the boundary | `authenticated-flow-validates-token` (error) |
| 4a | File upload not validated server-side | **Fix** | Extension allow-list + magic bytes + size cap + server-generated filename; one generic `INVALID_FILE` | `FLOW_SNIPPETS.md` §16 |
| 4b | IDOR via client-supplied record id | **Fix** | Resolve the actor from the session row; scope every read/write by owner; never pass a client id to `UpdateRecord` | `FLOW_SNIPPETS.md` §15 + §12 · `no-unused-trigger-inputs` (warn) |
| 4c | Full bank details in an approval email | **Defend** | The approver needs them to approve; recipient-facing copies are masked; mailbox retention/DLP is an IT control | `docs/06-data-privacy.md` egress table |
| 5 | OTP responses enable enumeration | **Fix** | One generic code for not-found / expired / wrong; unknown address answered as success; real reason kept in run history | OTP templates + `FLOW_SNIPPETS.md` §17 |
| 6 | Rate limiting too weak | **Fix (partly)** | Bot check + per-identifier limit + lockout, **plus a global cap** and an abuse alert; per-IP is an edge control | `smkb_sol_OtpDailyCap`, `smkb_sol_SecurityAlertEmails` · §18 |
| 7 | Ownership checks incomplete | **Fix** | The §15 scaffold on every record operation; `NOT_FOUND` when a record is not the caller's | `FLOW_SNIPPETS.md` §15 |
| 8 | Unused login/registration paths enabled | **Fix** | Six built-in paths shipped **disabled**; each defaults to `true` on the platform | 6 × `.powerpages-site/site-settings/auth-*-disabled.sitesetting.yml` |
| 9 | No table permissions | **Defend** | Power Pages denies Dataverse access by default and the Web API is off for every table, so there is no browser-facing surface to protect | Code Site `CLAUDE.md` → "What's intentionally absent" |
| 10 | Unstable dependency (`latest`) | **Defend** | Nothing in the kit uses `latest`; ranges are pinned and lockfiles committed | every `package.json` + lockfile |
| 11 | Secrets in flow run history | **Fix** | Secure I/O on connector actions, never on a trigger or a `Compose`; run-history access is the fallback control | `securedata-only-on-connector-actions`, `keyvault-secret-read-is-secured` (both error) · §19 |
| 12 | CSP / browser headers incomplete | **Fix** | `object-src 'none'`, `base-uri 'self'`, `upgrade-insecure-requests`, `Referrer-Policy`, `Permissions-Policy` | `security-csp*.sitesetting.yml` + 2 header settings |

---

## What is enforced, not just documented

These fail a build, a commit, or a deploy. They are the part of the baseline that cannot quietly rot.

| Gate | Enforces |
|---|---|
| `securedata-only-on-connector-actions` (error) | `secureData` only on `OpenApiConnection`/`Http` **actions** — never a trigger, never a `Compose` |
| `keyvault-secret-read-is-secured` (error) | a Secret env-var read marks its **outputs** secure |
| `authenticated-flow-validates-token` (error) | a flow taking an `authToken` validates it server-side |
| `http-uri-encodes-client-input` (error) | client input reaching an HTTP URI is encoded |
| `no-secret-param-default` (error) | no secret committed as a parameter default |
| `no-unused-trigger-inputs` (warn) | no dead trigger input a reviewer can't distinguish from a record selector |
| `vue/no-v-html: 'error'` | no raw HTML injection in either SPA |
| ESLint no-direct-network | the SPA cannot bypass the flow boundary |
| `scripts/check-template-guards.mjs` | no shipped file trips its own placeholder guard; `.ps1`/solution XML stay ASCII |
| flow-lint self-test coverage gate | every rule has a firing test and a silent test — so this table stays honest |
| `description-max-length` (error) | no action description over 256 chars — over the limit a flow imports fine and then **fails to activate** |

Run them all: each starter's `deploy.ps1`, the pre-commit hook, and CI.

**Not statically enforced, and worth naming as such:** session revocation on logout, the idle timeout, and expiring sessions on an auth-adjacent write are *conventions in the OTP recipe*, not lint rules — no static check can tell whether a given write is auth-adjacent. They are audit-table rows instead. Treat a solution that skipped them as a finding, not as a passing default.

---

## Accepted trade-offs

Each of these was considered and left in place. If a review raises one, the answer is here.

**`style-src 'unsafe-inline'`** — required by dynamic inline style **attributes** (`:style`, `v-show`, `<Transition>`, `element.style.setProperty`) that no nonce or hash can cover, plus the `<style>` elements Power Pages injects itself; It is **not** CSS-in-JS: `@smkbacil/design-ui` ships a static stylesheet that Vite extracts to a self-served `assets/index.css`. Removing it
breaks all component styling. Recorded in the Code Site "Known accepted findings" table.

**Response timing distinguishes not-found from wrong-code.** A short-circuit returns faster than a full
verification. Equalising it inside a cloud flow is impractical — connector latency varies far more than
the branch does, and a fixed delay taxes every real user. The rate limit, lockout and global cap are
what make bulk probing expensive. The channel is narrow, not closed, and saying otherwise would be
worse than admitting it.

**A one-time code and a session token are stored as written.** Power Automate has **no hash expression**
— no SHA or HMAC in WDL, and OData `$filter` cannot hash server-side — so this is a platform limit, not
an oversight. For a 6-digit code hashing would buy little regardless (10⁶ keyspace falls to exhaustive
search instantly). The **session token** is the value where hashing would genuinely help, and the same
limitation applies. Real at-rest hashing needs a Dataverse plug-in, an Azure Function or a custom
connector: treat it as a compliance-driven project, not a baseline item.

**A value in a `Compose` output cannot be secured.** `secureData` there is rejected by the platform, so
such a value remains in **admin-only** run history. Prefer inlining it into a secured connector action;
where several actions need it, the control is auditing who holds owner/co-owner on the flow and admin on
the environment.

**Per-IP rate limiting is not attempted in a flow.** A cloud flow has no trustworthy client IP — the
Power Pages trigger supplies none, and anything the SPA passes is attacker-controlled. It belongs at the
WAF / front door, as an IT task. A limiter keyed on a spoofable value is worse than none, because it
reads as a control that is not there.

**File validation reads only the first few bytes.** Extension, magic bytes and size are
defense-in-depth. Storage-layer AV scanning does the rest, and the portal never serves an upload as
active content. This is not a malware-scanning tier and should not be described as one.

**No HTML sanitizer ships, because nothing renders HTML.** There is no `v-html`, no `innerHTML`, no
markdown or rich-text renderer anywhere in either SPA, and no design-system component takes an
HTML-string prop — every extension point is a Vue slot, which is compiled VNodes, not parsed markup.
The control is `vue/no-v-html: 'error'` in both ESLint configs, with zero `eslint-disable` for it in the
repo. A build-time prohibition is stronger than a runtime sanitizer, and shipping DOMPurify alongside it
would signal that rendering HTML is a supported pattern here — which is the door the ban is holding shut.

> **If a solution ever does need authored HTML**, this is the required pattern, added *in that solution*:
> **DOMPurify** (public package, no credential) with an explicit tag/attribute allowlist and an anchor
> hook forcing `https?:`/`mailto:` plus `rel="noopener" target="_blank"`; the `eslint-disable` scoped to
> the single sanitized component and nowhere else. Never hand-roll an allowlist — that is the finding an
> auditor will raise, and correctly.

---

## Owner / environment actions

The starter cannot ship these — they live in Dataverse security roles, the Power Platform admin centre,
GitHub settings or the network edge. They are listed here so a reviewer can confirm them instead of
re-discovering them, and each has a matching row in
[`audit/TEMPLATE-security-audit.md`](audit/TEMPLATE-security-audit.md).

| Owner action | Why the starter cannot ship it | How a reviewer confirms it |
|---|---|---|
| **Security telemetry and alerting** — emit structured events (outcome, `errorCode`, actor) and alert on thresholds. **Key the thresholds on the payload, not the HTTP status:** Power Pages forces the 200 + `errorCode` contract, so every business rejection is an HTTP 200 and status-based alerting sees nothing. | Needs an Application Insights / Log Analytics workspace and retention policy owned by the environment, not the repo. The shipped lockout and global-cap alert emails cover only those two events. | A dashboard or query exists that counts `errorCode` by kind over time, and someone receives an alert |
| **Restrict the OTP / session table to the flow's service account**, and keep the token and code columns out of views, search and exports. | Dataverse security roles are environment data. | The table's roles list only the service account; a normal user cannot read the token column |
| **Pipeline scanning** — enable the commented-out Solution Checker job (needs the `AZURE_*` service-principal secrets), plus dependency (SCA), secret and static analysis scanning, and protected-branch gates. | Needs org/repo settings and a service principal. The kit ships `flow-lint`, ESLint and the template guards; none of them is a CVE or secret scanner. | The CI run shows the extra jobs, and a branch protection rule requires them |
| **Per-IP / distributed rate limiting at the WAF or front door.** | A cloud flow has no trustworthy client IP (see Accepted trade-offs). | An edge rule exists, or the risk is accepted in writing |
| **Atomic attempt counters** if abuse volume warrants it — move them to a store with real concurrency, or to the edge. | The connector has no compare-and-swap, so two simultaneous attempts can both read the same count. The shipped per-identifier limit, lockout and global cap are the baseline, not a guarantee. | Either the counter store changed, or the residual is accepted in writing |
| **Run-history access** — audit who holds owner/co-owner on each flow and admin on the environment. | Platform permissions. It is the fallback control for any value that cannot be secured in the action config. | The owner list is reviewed and minimal |

---

## Recurring platform traps

Each of these cost a debugging cycle in a real deployment. Several fail **silently**.

- **`secureData` outside a connector action is fatal, and not where you look.** The solution imports
  *successfully*; the flow then fails **activation** with `InvalidSecureDataConfiguration` and sits in
  **Draft**, so every portal call fails. Nothing in the import output mentions it.
- **No Secure Inputs on a Power-Pages-invoked trigger** — internal actions only.
- **A flow can land in Draft after import** when its connection references need reconfirming, and there
  is **no `pac` verb to turn a flow on** — reactivation is a manual portal step.
- **Run history is admin-only** — owners/co-owners and environment admins, never end users or the
  Anonymous role. That is precisely why it is the fallback for a value that cannot be secured.
- **Power Pages discards the body of any non-2xx flow response**, substituting a generic
  `IncorrectPayload` envelope. Every response — success and error — must be **HTTP 200**, with the error
  carried in an `errorCode` field. A 400 with a perfect error code reaches nobody.
- **`pac` exits 0 on failure.** Confirmed for a failed solution import, a rejected component type, and a
  failed push. Parse stdout; never gate on the exit code alone.
- **A late-added site setting keeps its placeholder GUID** unless the freshen script is re-run, and the
  placeholder scan is case-sensitive — an uppercase placeholder is silently skipped.
- **`.ps1` and shipped solution XML must be ASCII-only** (or BOM'd). Windows PowerShell 5.1 reads a
  BOM-less UTF-8 script as ANSI, and Windows-1255 mangles an en dash in an XML display name.
- **Never ship another solution's artifacts in the kit.** Reference material must be genericized —
  no real GUIDs, tenant hosts, org email addresses or environment ids.

---

## Where the details live

| Topic | Document |
|---|---|
| Flow security patterns (ownership, file validation, anti-enumeration, caps, Secure I/O) | [FLOW_SNIPPETS.md](SMKB%20-%20Power%20Automate%20Flows%20Starter/FLOW_SNIPPETS.md) §15–19 |
| The lint rules and how to add one | [flow-lint README](SMKB%20-%20Power%20Automate%20Flows%20Starter/tools/flow-lint/README.md) |
| Shipped site settings, CSP, login lockdown, HSTS | [Code Site CLAUDE.md](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/CLAUDE.md) → Security Configuration |
| Shared OTP module hardening, session revocation, idle timeout | [OTP RECIPE.md](SMKB%20-%20Component%20Library/OTP%20Auth%20Screen/RECIPE.md) → Security baseline |
| Bot protection: client, CSP, and the fail-closed server gate | [`/ppcs-add-turnstile`](SMKB%20-%20Power%20Pages%20Code%20Site%20Starter/.claude/skills/ppcs-add-turnstile/SKILL.md) |
| Abuse-threshold env vars | [Env Vars README](SMKB%20-%20Environmental%20Variables%20Starter/README.md) → Security Baseline Variables |
| Per-solution security record | [docs/07-security.md](docs/07-security.md) · [docs/06-data-privacy.md](docs/06-data-privacy.md) |
| Pre-go-live audit | [audit/](audit/README.md) · [`/security-audit`](.claude/skills/security-audit/SKILL.md) |
| Testing method | [TESTING-STRATEGY.md](TESTING-STRATEGY.md) |
