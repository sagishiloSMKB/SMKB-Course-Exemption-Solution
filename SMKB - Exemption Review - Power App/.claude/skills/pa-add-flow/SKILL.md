---
name: Power Apps — Wire a Flow (UI-only)
description: >-
  Wires a Power Automate flow into the Code App the UI-only way: pnpm pa add-flow
  to regenerate the committed generated barrel, a thin domain service (Run -> unwrap
  -> domain type), and the matching dev-mock export kept in lockstep.
when_to_use: >-
  User says "add a flow", "call a flow", "wire a flow", "connect Power Automate",
  "new flow call", or wants the Code App to talk to a new backend flow.
argument-hint: "<FlowName> <serviceFunctionName>"
arguments: [flow-name, service-function]
allowed-tools: Read Edit Write Bash(pnpm *) Grep
---

## Context

The Code App is **UI-only**: it never calls Dataverse or the network directly (ESLint bans
`fetch`/`XMLHttpRequest`/`WebSocket`, so a direct call fails `pnpm lint` and the deploy gate). Every backend
call goes through a generated flow service → the single `unwrap()` boundary → a clean domain type. Wiring a
flow touches **four spots that must stay in lockstep**:

1. `pnpm pa add-flow` regenerates `src/generated/` (barrel + model + service) **and** `.power/` schemas —
   **both are committed** and the build type-checks against them. It **overwrites `src/generated/index.ts`**.
2. A thin domain service in `src/services/` (`Service.Run()` → `unwrap<T>()` → a domain type that lives
   *with* the service — there is no shared `src/types/`).
3. A matching **dev-mock export** in `src/services/mock/generated.ts` so `pnpm dev` runs offline (dev aliases
   the `../generated` barrel to the mock).
4. On the first real flow, **delete the `ExampleFlow` scaffold** (5 files) — the deploy guard blocks on
   `sol_exampleflow`.

See the [README](../../../README.md) Steps 5–6 + "Removing the example", starter
[CLAUDE.md](../../../CLAUDE.md), and [wire-flow-reference.md](wire-flow-reference.md).

## Steps

1. Generate the flow service (regenerates the committed barrel + schemas):
   ```powershell
   pnpm pa add-flow
   ```
   Then confirm `src/generated/index.ts`, `src/generated/services/<FlowName>Service.ts`, and the `.power/`
   schema were (re)written. `add-flow` **rewrites `index.ts`** — re-export any services you still need.
2. Write the domain service `src/services/<name>Service.ts` — `Service.Run()` → `unwrap<T>()` → domain type
   (pattern in the reference). Do **not** inline the `unwrap` contract; import it from `src/services/unwrap.ts`.
3. Add the matching dev-mock in `src/services/mock/generated.ts` — **one export** named exactly like the
   generated service, returning `{ success: true, data: … }` (pattern in the reference). Keep it in lockstep
   or `pnpm dev` breaks.
4. Call it from a view (`onMounted`, etc.) with loading/error handling; show caught errors with
   `useSmkbToast().error(...)`.
5. **First real flow:** remove the `ExampleFlow` scaffold from all 5 locations (list in the reference).
6. Verify:
   ```powershell
   pnpm lint   # bans direct network calls; catches a missing mock/type
   pnpm test
   ```
   **PAUSE** — deploy (`deploy.ps1` = lint → test → build → `pnpm pa push`) is a separate step; run
   `/pa-init` first if the app record doesn't exist yet.

## Error Handling

- **`pnpm dev` breaks / undefined service:** the dev-mock export in `src/services/mock/generated.ts` is missing or misnamed — it must match the generated service name exactly.
- **`pnpm lint` fails with a network-call error:** you added a direct `fetch`/axios call — route it through a flow service instead (UI-only rule).
- **Build type error after `add-flow`:** `index.ts` was overwritten and dropped a re-export, or the domain type doesn't match the generated model. Re-add the export / align the type.
- **Deploy guard blocks on `sol_exampleflow`:** a trace of the example remains — remove all 5 locations (reference).

## Notes

- `src/generated/` and `.power/` are **committed** and never hand-edited — regenerate with `pnpm pa add-flow`.
- Domain types live with their service; `unwrap()` is the single success/failure boundary (unit-tested).
- Service + mock code patterns and the 5-file ExampleFlow removal list: [wire-flow-reference.md](wire-flow-reference.md).
