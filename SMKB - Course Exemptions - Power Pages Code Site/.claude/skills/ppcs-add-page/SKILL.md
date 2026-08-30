---
name: Power Pages Code Site — Add Page / Route
description: >-
  Creates a new Vue view file and registers it in the Power Pages Code Site router
  with a direct import. Enforces the no-dynamic-import rule required by Power Pages
  bundling — lazy imports create unlisted chunks that 404 at runtime.
when_to_use: >-
  User says "add a page", "create a view", "add a route", "new screen", "new page",
  or provides a URL path or page name to create in this SPA.
argument-hint: "<PageName> [/url-path]"
arguments: [page-name, path]
allowed-tools: Read Edit Bash(npm run build)
---

## Context

The critical constraint in this project: **route components must use direct
imports, never lazy/dynamic imports.**

```typescript
// ✅ CORRECT — direct import
import MyView from '../views/MyView.vue'

// ❌ WRONG — lazy/dynamic import — DO NOT USE
const MyView = () => import('../views/MyView.vue')
```

Why: Dynamic imports cause Vite to emit a separate chunk file. Power Pages only
serves files listed in `bundleFilePatterns` in `powerpages.config.json`. Any
unlisted file returns `index.html` with a 200 status, causing a MIME-type error
that silently breaks the route.

## Steps

1. **Derive names from arguments.**
   - `$page-name`: the component name. If not PascalCase, convert it
     (e.g. `my-page` → `MyPage`, `contact form` → `ContactForm`)
   - Filename: `src/views/<PageName>View.vue`
   - Route path: `/$path` if provided, else `/<kebab-case-of-page-name>`
   - Route name: `<kebab-case-of-page-name>` (same as path without `/`)

2. **Read the template.**
   Read `src/views/HomeView.vue` to understand the existing component structure
   (how `usePortalUser` is imported, how the template is structured).

3. **Create the view file.**
   Write `src/views/<PageName>View.vue`:

   ```vue
   <script setup lang="ts">
   // Remove unused import below if this page doesn't need auth info
   import { usePortalUser } from '@/composables/usePortalUser'
   import { onMounted } from 'vue'

   const { user } = usePortalUser()

   onMounted(() => {
     // Portal user is available here (not at module top level)
   })
   </script>

   <template>
     <div class="main-content">
       <h1><!-- Page title --></h1>
       <!-- Page content -->
     </div>
   </template>

   <style scoped>
   /* Use CSS custom properties so styles react to theme/direction changes */
   /* e.g. color: var(--smkb-color-text); */
   </style>
   ```

   If the user provided specific content or features for the page, generate
   appropriate content using `SmkbCard`, `SmkbButton`, `SmkbTable`, etc.
   (all globally registered — no import needed for components).

   If the page needs backend data, use the flows-only pattern — never raw
   `fetch` (ESLint bans it outside the sanctioned transport files):
   ```typescript
   import { invokeFlow } from '@/services/cloudFlow'
   import { FLOWS } from '@/config/flows'
   import { useFlowErrorToast } from '@/composables/useFlowErrorToast'

   const showFlowError = useFlowErrorToast()

   try {
     const data = await invokeFlow<MyResult>(FLOWS.myFlow, { param: value })
   } catch (e) {
     showFlowError(e)
   }
   ```
   Register new flows with `/ppcs-register-flow`.

4. **Read the router.**
   Read `src/router/index.ts` to understand the existing import block and
   routes array structure.

5. **Register the route.**
   In `src/router/index.ts`:
   - Add the direct import **immediately after the last existing view import**:
     ```typescript
     import <PageName>View from '../views/<PageName>View.vue'
     ```
   - Add the route object **inside the `routes` array**:
     ```typescript
     { path: '/<path>', name: '<route-name>', component: <PageName>View },
     ```

6. **Verify with build.**
   Run `npm run build`. If it fails, fix any TypeScript errors before reporting done.
   Common issues:
   - Unused `user` variable from `usePortalUser` → remove if not needed,
     or prefix with `_`
   - Missing prop types → add explicit TypeScript types

7. **Report.**
   Confirm the view was created, the route was registered with a direct import,
   and the build passed. Show the new route URL so the user can test it.

## Error Handling

- If the user asks for a `() => import(...)` pattern, refuse and explain the
  Power Pages bundling constraint. Offer the direct import as the correct approach.
- If `src/views/HomeView.vue` doesn't exist (template unavailable), create a
  minimal SFC with `<script setup lang="ts">`, an empty template, and a comment
  about using SmkbCard/SmkbButton from the globally registered @smkbacil/design-ui.

## Notes

Full-page views that must render **outside** the `SmkbLayout` shell
(login-style screens, error pages) are registered by route **name** in the
`STANDALONE_ROUTES` set in `src/App.vue`. Add the route name there if the new
page should not get the app header/layout.

If the new page needs its own chunk (large library, code-splitting requirement):
1. Add a `manualChunks` entry in `vite.config.ts` grouping the view files
2. Add the new chunk filename to `bundleFilePatterns` in `powerpages.config.json`
3. Still use a **direct import** in the router — the manualChunks approach splits
   at the bundle level without dynamic imports

Do NOT create a lazy import even for large pages. Use manualChunks instead.
