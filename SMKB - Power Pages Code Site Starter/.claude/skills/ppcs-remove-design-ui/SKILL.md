---
name: Power Pages Code Site — Remove the SMKB Design System
description: >-
  Removes @smkbacil/design-ui from a Code Site that builds its own UI, so the repo needs no
  private-registry credential at all. Covers the five wiring points, the .npmrc / manualChunk /
  optimizeDeps cleanup, and the cold-cache verification everyone gets wrong.
when_to_use: >-
  User says "remove design-ui", "drop the design system", "we have our own UI/visual identity",
  "get rid of NPM_TOKEN", or npm install fails on @smkbacil for a site with bespoke styling.
allowed-tools: Read Edit Write Grep Glob Bash(npm *)
---

## Context

`@smkbacil/design-ui` is the default and it is the right default — it is what makes SMKB apps look
like SMKB apps. But a site that builds its **own** visual identity (a like-for-like rebuild of an
existing bespoke page, say) ships **zero bytes** of it and still pays for it: the package is
**private**, so every `npm install`, every CI run and every new developer machine needs a working
`@smkbacil` token for code that never reaches the bundle. The failure mode also misleads — a missing
or expired token surfaces as `npm error 404 @smkbacil/design-ui`, which reads as a *missing package*
and has cost a real initialization a wrong diagnosis.

Decide this at **Init Project Phase 4**, when the specs are gathered — "does this site use the SMKB
design system, or its own visual identity?" — not after CI goes red on the first push.

**The wiring is in five places, and the components are globally registered so `grep import` finds
almost nothing.** `createSmkb()` in `main.ts` registers every `Smkb*` component, so a template can
use `<SmkbButton>` or `<SmkbNotFoundPage>` with **no import line at all**. Grep for the *usage*, not
the import:

```powershell
Select-String -Path "src\**\*.ts","src\**\*.vue" -Pattern '@smkbacil|<Smkb|useSmkbToast|createSmkb'
```

## Steps

1. Run the grep above and list every hit. In the shipped template the real consumers are
   `src/main.ts` (the two CSS imports + `createSmkb()`), `src/App.vue` (`SmkbButton`),
   `src/composables/useFlowErrorToast.ts` (`useSmkbToast`), and any template using a globally
   registered `Smkb*` component — `src/views/NotFoundView.vue` ships as a one-liner
   `<SmkbNotFoundPage />`. Confirm against the actual repo rather than trusting this list.
2. **`src/composables/useFlowErrorToast.ts`** — delete. It is the only real `import` of the package.
   It is also unused unless something calls it; a form that shows errors inline never does. If you
   *do* want toasts, this file is what you would reimplement over your own component.
3. **`src/views/NotFoundView.vue`** — rewrite with plain markup and your own tokens. This is the one
   people miss, and the reason the dependency survives in most solutions.
4. **`src/App.vue`** — replace any `Smkb*` component (the shipped template uses `SmkbButton`) with
   your own markup.
5. **`src/main.ts`** — remove the two design-ui CSS imports and the `createSmkb()` registration, and
   leave a comment saying the omission is deliberate so the next reader does not "restore" it.
6. **`src/modules/otp-auth/`** — delete if OTP auth is not being used: it is built entirely from
   `Smkb*` components, so it cannot survive the removal. **Copy `useTurnstile.ts` out first** if you
   want the captcha — it is standalone (its only imports are `vue` and `SOLUTION`) and already lives
   at `src/composables/useTurnstile.ts` in current versions of this starter.
7. **`package.json`** — remove the `@smkbacil/design-ui` dependency.
8. **`vite.config.ts`** — remove `optimizeDeps: { exclude: ['@smkbacil/design-ui'] }` **and** the
   `smkb` entry from `manualChunks`.
9. **`powerpages.config.json`** — remove `assets/smkb.js` from `bundleFilePatterns` if it is listed
   (the starter now ships `assets/*.js`, which needs no change).
10. **`.npmrc`** — delete. It exists solely to authenticate that scope; leaving it keeps
    `${NPM_TOKEN}` in play and can still fail installs.
11. **`.github/workflows/ci.yml`** — nothing to do. The credential pre-flight already skips itself
    when the app's `package.json` declares no `@smkbacil` dependency.

### Verify like CI does, not like a developer does

12. **A warm npm cache will hide a broken setup**, so prove it from cold — this is the step everyone
    gets wrong:
    ```powershell
    Remove-Item -Recurse -Force node_modules; Remove-Item -Force package-lock.json
    npm install --no-audit --no-fund     # must succeed with NO npm credential at all
    npm run lint; npm run test; npm run build
    ```
13. Confirm the bundle is genuinely clean — `dist/assets/index.js` must not contain `smkbacil`.

## Error Handling

- **`npm install` still fails on `@smkbacil`:** a dependency remains in `package.json`, or a
  lockfile entry survived — delete `package-lock.json` and reinstall.
- **`vue-tsc` errors on a missing component:** a globally registered `Smkb*` usage is still in a
  template. Re-run the usage grep from Context; `grep import` will not find these.
- **Build succeeds but the bundle still contains `smkbacil`:** the `manualChunks` `smkb` entry or
  `optimizeDeps.exclude` is still present (steps 8).
- **It installed fine locally before you started:** that proves nothing — the cache serves a warm
  install long after a token dies. `npm whoami` is the credential check.

## Notes

- This is a **one-way door for this solution**: re-adding the design system later means restoring
  `.npmrc`, the dependency, `createSmkb()` and the CSS imports. Decide at Phase 4.
- Keeping design-ui is the default and the norm. Only remove it when the site genuinely has its own
  visual identity — a bespoke rebuild, or a public page with an externally-designed look.
