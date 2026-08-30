# ppcs-deploy Reference

## Pre-flight Failure → Runtime Symptom Table

| Pre-flight issue missed | What happens at runtime | Detection |
|-------------------------|------------------------|-----------|
| manualChunks key not in bundleFilePatterns | Old chunk file persists; new code not served | Stale behavior after deploy; `pac pages list` shows old web file |
| Lazy import (`() => import(...)`) | Route returns MIME-type error; console: "Failed to fetch dynamically imported module" | Browser console error on navigation |
| Wrong auth profile (Stage/Prod) | Code deployed to wrong environment | Users in wrong env see changes unexpectedly |
| `CHANGEME` left in `src/config/solution.ts` | Placeholder prefix/appName/documentTitle ship to production | `grep CHANGEME src/config/solution.ts` returns hits |
| TypeScript error not fixed | Build output may be corrupted or missing | Runtime JS errors; component not rendering |

Note: `npm run deploy` itself is gated — it runs
`npm run lint && npm run test && npm run build` before
`pac pages upload-code-site --rootPath .`, so lint/test/type failures abort
the upload.

---

## bundleFilePatterns — Current Expected Entries

These must match the `manualChunks` keys defined in `vite.config.ts`:

```json
{
  "bundleFilePatterns": [
    "assets/index.js",
    "assets/index.css",
    "assets/vue.js",
    "assets/smkb.js"
  ]
}
```

If you add a new `manualChunks` entry (e.g. `{ mylib: [...] }`), add
`"assets/mylib.js"` to the `bundleFilePatterns` array.

---

## Checking for Stale Web File Records

If the same filename appears in bundleFilePatterns across multiple deploys, PAC
CLI cleans it before uploading the new version. This is the correct behavior.

If a filename was once in bundleFilePatterns but was later removed (e.g. a
manualChunks entry was deleted), the old Dataverse Web File record persists.
To clean it:

1. Open Power Pages Design Studio → **Web Files**
2. Find records with names matching the old chunk filenames
3. Deactivate → Delete the stale records
4. Redeploy

---

## pac auth Environment Check

Command: `pac auth list`

Example output:
```
 Index  Active  Name        Environment                             Environment URL
 -----  ------  ----------  --------------------------------------  -----------------------------------------------
 1      *       SMKB Dev    SMKB Apps Dev (org229c958d)             https://org229c958d.crm4.dynamics.com/
 2              SMKB Stage  SMKB Apps Stage (orgaabbccdd)           https://orgaabbccdd.crm4.dynamics.com/
```

The `*` marks the active profile. Deploys target the active profile's environment.
To switch: `pac auth select --index 1`

---

## TypeScript Strict Mode Reminders

`noUnusedLocals` and `noUnusedParameters` are both `true`. Common fixes:

| Error | Fix |
|-------|-----|
| `'foo' is declared but its value is never read` | Prefix with `_`: `_foo` |
| `'bar' is declared but never used` | Remove the import/variable, or prefix with `_` |
| `Parameter 'baz' implicitly has an 'any' type` | Add explicit type annotation |
| `Object is possibly 'undefined'` | Add null check or use optional chaining (`?.`) |
