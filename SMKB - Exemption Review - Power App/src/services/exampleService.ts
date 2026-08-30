import { ExampleFlowService } from '../generated'
import { unwrap } from './unwrap'

// ── Example domain service ──────────────────────────────────────────────────
// This is the pattern every service in a flow-based (UI-only) app follows:
//   generated Service.Run(input)  →  unwrap<T>()  →  a clean domain type.
// The Vue app never calls Dataverse/network APIs directly — a Power Automate
// flow does the work server-side and this service just shapes the result.
//
// Domain types live WITH their service (SMKB convention — no shared src/types/).
//
// In `pnpm dev`, `../generated` is aliased to src/services/mock/generated.ts, so
// this runs offline against mock data. In `pnpm build` it type-checks against the
// real generated barrel. When you wire a real flow with `pnpm pa add-flow`, delete
// this example service and the rest of the example trio (see src/generated/index.ts).

export interface ExampleItem {
  id: number
  name: string
}

/** Load the example items via the ExampleFlow flow. */
export async function getExamples(): Promise<ExampleItem[]> {
  const data = unwrap<{ items: ExampleItem[] }>(await ExampleFlowService.Run({}))
  return data?.items ?? []
}
