# Executive Summary

> **TEMPLATE** — fill the `[FILL IN: …]` prompts; keep the general framing. Delete this callout once populated.

*A one-page, non-technical overview of the [SOLUTION NAME] solution. For detail, follow the links into
the technical documents.*

## What it does

`[FILL IN: 2–4 sentences in plain language — what the solution digitises, who initiates the process,
what they submit/do, and what staff do with it.]`

## Who uses it

`[FILL IN: list each user type, how they sign in, and through which app. Example rows:]`
- **`[FILL IN: external users]`** — via the public **`[FILL IN: portal name]`**. They sign in with
  `[FILL IN: e.g. phone number + one-time code (OTP)]`.
- **`[FILL IN: internal staff]`** — sign in with their SMKB (Microsoft) account inside the
  **`[FILL IN: back-office app name]`**.

## How it's built (the parts)

`[FILL IN: list the front-end apps + the automation layer. Example:]`
1. **`[FILL IN: portal]`** — a public-facing web application.
2. **`[FILL IN: back-office app]`** — an internal web application for staff.
3. **Automation layer** — a set of **`[FILL IN: N]` automated workflows** (Power Automate cloud flows)
   that do all the real work: validating logins, reading/writing data, sending emails/SMS, and routing
   approvals.

A core design rule: **the apps never touch data directly.** Every read, write, email, and external call
goes through the automation layer, which re-checks who the caller is on every request. This keeps a
single, controlled security boundary.

## Where the data lives

`[FILL IN: the data stores this solution uses. Example:]`
- **Dataverse** (Power Platform) — `[FILL IN: which records]`.
- **SharePoint** (SMKB tenant) — `[FILL IN: which records, if used]`.
- **Microsoft 365 tenant** — the whole solution runs inside SMKB's own Microsoft cloud tenant.

## External services it talks to (only from the automation layer)

`[FILL IN: list each external system + what non-sensitive purpose it serves, or "none". Example:]`
- **`[FILL IN: external API]`** — `[FILL IN: purpose; what data is/ isn't sent]`.

## Personal & sensitive data (high level)

`[FILL IN: what categories of personal/sensitive data the system holds (identifying, contact, financial,
login secrets) and the high-level handling — who can see what, what is masked, what never leaves.]`
See [Data & Privacy](06-data-privacy.md).

## Security posture (high level)

- **Login:** `[FILL IN: e.g. phone + one-time code, protected by a bot-check, with rate-limiting,
  attempt-lockout, and short-lived sessions.]`
- **Access control:** every automated workflow re-validates the caller and restricts data to that user.
- **Secrets** (`[FILL IN: which]`) are held in **Azure Key Vault**, never in code or the apps.
- **Transport & browser hardening:** HTTPS-only, secure cookies, and a Content-Security-Policy.
- **Quality gates:** automated tests and static checks run automatically and **block a release if they fail**.

See [Security](07-security.md) and [Testing & Quality Gates](08-testing-and-quality-gates.md).

## Environments

The solution runs in three environments — **Dev → Stage → Production** — with changes promoted through a
controlled Power Platform pipeline. Environment-specific values (URLs, approver emails, secret references)
are configured per environment, never hard-coded. See [Deployment & ALM](09-deployment-alm.md).
