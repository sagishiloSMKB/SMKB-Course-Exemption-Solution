// ── Dev-only mock of the ../generated barrel ────────────────────────────────
// In `pnpm dev`, vite.config.ts aliases every `from '../generated'` import to THIS
// file, so the app runs offline with no wired flow and no network access. In
// `pnpm build` this file is ignored — the real generated barrel is used instead.
//
// This is the ONE place dev mock data lives. To mock a new flow, add one export
// here whose `Run()` returns a `{ success, data }` shape matching what the flow
// returns — no new alias or file needed. Keep this file self-contained: it must
// NOT import from '../generated' (that would create an alias loop in dev).
//
// Remove the ExampleFlowService export below once you delete the example service.

export const ExampleFlowService = {
  async Run(_input?: unknown) {
    return {
      success: true,
      data: {
        items: [
          { id: 1, name: 'פריט לדוגמה 1' },
          { id: 2, name: 'פריט לדוגמה 2' },
        ],
      },
    }
  },
}
