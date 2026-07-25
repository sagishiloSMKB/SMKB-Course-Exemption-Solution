# SMKB Design System — Full Reference

> @smkb-generated — auto-updated on every `pnpm install`. Delete this line to opt out of auto-updates.
> Library: `@smkbacil/design-ui` (tokens + components)

---

## Installation & Setup

```bash
pnpm add @smkbacil/design-ui
```

```ts
// main.ts — import order matters
import '@smkbacil/design-ui/tokens.css'       // light theme tokens + custom fonts (Open Sans, Foodi, Assistant)
import '@smkbacil/design-ui/tokens-dark.css'  // dark theme overrides
import '@smkbacil/design-ui/styles'           // component styles + base CSS

import { createApp } from 'vue'
import { createSmkb } from '@smkbacil/design-ui'

const app = createApp(App)
app.use(createSmkb())   // registers all components globally
app.mount('#app')
```

**Power Apps / strict CSP environments:**

Power Apps Code Apps serve assets through a proxy that corrupts binary font files (woff/woff2),
causing `OTS parsing error` failures. Use `tokens-nofonts.css` to skip all `@font-face` declarations
and fall back to the system font stack:

```ts
// main.ts (Power Apps)
import '@smkbacil/design-ui/tokens-nofonts.css'  // ← no @font-face, system fonts only
import '@smkbacil/design-ui/tokens-dark.css'
import '@smkbacil/design-ui/styles'

import { createApp } from 'vue'
import { createSmkb } from '@smkbacil/design-ui'

const app = createApp(App)
app.use(createSmkb())
app.mount('#app')
```

**Tree-shakeable alternative:**
```ts
import { SmkbButton, SmkbInput, SmkbSelect } from '@smkbacil/design-ui'
```

---

## Token Reference

### Color Primitives (Layer 1)

#### Brand palette (canonical hex)
| Token | Value |
|---|---|
| `--smkb-brand-green` | #4eb764 (primary — also `--smkb-green-600`) |
| `--smkb-brand-blue` | #15b7e0 |
| `--smkb-brand-pink` | #cc66a3 |
| `--smkb-brand-yellow` | #f6be53 |

Semantic aliases (`--smkb-color-brand-*`): same hex via `var(--smkb-brand-*)` — Layer 2 tokens for theming, aligned with other `--smkb-color-*` names.

#### Brand Green scale (600 = brand green)
| Token | Value | Use |
|---|---|---|
| `--smkb-green-50` | #f4fbf6 | Subtle tint background |
| `--smkb-green-100` | #e7f5eb | |
| `--smkb-green-200` | #c8ead1 | Dark mode active |
| `--smkb-green-300` | #9ed9ae | Dark mode primary hover |
| `--smkb-green-400` | #72d883 | Dark mode primary |
| `--smkb-green-500` | #5fc96f | |
| `--smkb-green-600` | #4eb764 (`var(--smkb-brand-green)`) **brand / primary** |
| `--smkb-green-700` | #3d9a52 | Hover state |
| `--smkb-green-800` | #2e7540 | Active/pressed |
| `--smkb-green-900` | #1f4f28 | Deep tint |

#### Emerald (Success only — distinct from brand green)
| Token | Value |
|---|---|
| `--smkb-emerald-50` | #f0fdf4 |
| `--smkb-emerald-100` | #dcfce7 |
| `--smkb-emerald-500` | #22c55e |
| `--smkb-emerald-600` | #16a34a |
| `--smkb-emerald-700` | #15803d |

#### Gray (Neutral)
`--smkb-gray-50` #f8fafc → `--smkb-gray-100` #f1f5f9 → `--smkb-gray-200` #e2e8f0 → `--smkb-gray-300` #cbd5e1 → `--smkb-gray-400` #94a3b8 → `--smkb-gray-500` #64748b → `--smkb-gray-600` #475569 → `--smkb-gray-700` #334155 → `--smkb-gray-800` #1e293b → `--smkb-gray-900` #0f172a

#### Red (Danger/Error)
`--smkb-red-50` #fef2f2 · `--smkb-red-500` #ef4444 · `--smkb-red-600` #dc2626 · `--smkb-red-700` #b91c1c

#### Amber (Warning)
`--smkb-amber-50` #fffbeb · `--smkb-amber-500` #f59e0b · `--smkb-amber-600` #d97706

#### Blue (Info/Links)
`--smkb-blue-500` #3b82f6 · `--smkb-blue-600` #0b6bcb · `--smkb-blue-700` #0953a8

---

### Semantic Tokens (Layer 2) — Light Theme

#### Brand / Primary
```
--smkb-color-primary         var(--smkb-brand-green)  #4eb764
--smkb-color-primary-hover   var(--smkb-green-700)    #3d9a52
--smkb-color-primary-active  var(--smkb-green-800)    #2e7540
--smkb-color-primary-subtle  var(--smkb-green-50)     #f4fbf6
--smkb-color-primary-fg      #ffffff
```

#### Foreground (Text)
```
--smkb-color-foreground          var(--smkb-gray-900)   #0f172a
--smkb-color-foreground-muted    var(--smkb-gray-500)   #64748b
--smkb-color-foreground-subtle   var(--smkb-gray-400)   #94a3b8
--smkb-color-foreground-inverse  #ffffff
```

#### Surface (Background)
```
--smkb-color-surface          #ffffff
--smkb-color-surface-subtle   var(--smkb-gray-50)    #f8fafc
--smkb-color-surface-raised   #ffffff
--smkb-color-surface-overlay  rgba(0,0,0,0.5)
```

#### Border
```
--smkb-color-border        var(--smkb-gray-200)   #e2e8f0
--smkb-color-border-strong var(--smkb-gray-300)   #cbd5e1
--smkb-color-border-focus  var(--smkb-brand-green)  #4eb764
--smkb-color-focus-ring    rgba(78,183,100,0.25)
--smkb-focus-ring          0 0 0 3px var(--smkb-color-focus-ring)
```

#### Semantic States
```
--smkb-color-danger         var(--smkb-red-600)       #dc2626
--smkb-color-danger-hover   var(--smkb-red-700)       #b91c1c
--smkb-color-danger-subtle  var(--smkb-red-50)        #fef2f2
--smkb-color-danger-fg      #ffffff

--smkb-color-success        var(--smkb-emerald-600)   #16a34a
--smkb-color-success-subtle var(--smkb-emerald-50)    #f0fdf4
--smkb-color-success-fg     #ffffff

--smkb-color-warning        var(--smkb-amber-600)     #d97706
--smkb-color-warning-subtle var(--smkb-amber-50)      #fffbeb
--smkb-color-warning-fg     var(--smkb-gray-900)
```

#### Dark Theme Overrides (applied with `[data-theme="dark"]` on any ancestor)
```
--smkb-color-primary         var(--smkb-green-400)   #72d883
--smkb-color-foreground      var(--smkb-gray-50)     #f8fafc
--smkb-color-surface         var(--smkb-gray-900)    #0f172a
--smkb-color-surface-subtle  var(--smkb-gray-800)    #1e293b
--smkb-color-border          var(--smkb-gray-700)    #334155
```

---

### Typography
```
--smkb-font-family      'Open Sans' (Latin), 'Foodi' (Hebrew), 'Assistant' (fallback), system-ui
--smkb-font-size-xs     0.75rem   (12px)
--smkb-font-size-sm     0.875rem  (14px)
--smkb-font-size-md     1rem      (16px)
--smkb-font-size-lg     1.125rem  (18px)
--smkb-font-size-xl     1.25rem   (20px)
--smkb-font-size-2xl    1.5rem    (24px)

--smkb-font-weight-normal    400
--smkb-font-weight-medium    500
--smkb-font-weight-semibold  600
--smkb-font-weight-bold      700

--smkb-line-height-tight    1.25
--smkb-line-height-snug     1.375
--smkb-line-height-normal   1.5
--smkb-line-height-relaxed  1.625
```

### Spacing
```
--smkb-space-1    0.25rem  (4px)
--smkb-space-2    0.5rem   (8px)
--smkb-space-3    0.75rem  (12px)
--smkb-space-4    1rem     (16px)
--smkb-space-5    1.25rem  (20px)
--smkb-space-6    1.5rem   (24px)
--smkb-space-8    2rem     (32px)
--smkb-space-10   2.5rem   (40px)
--smkb-space-12   3rem     (48px)
--smkb-space-16   4rem     (64px)
```

### Border Radius
```
--smkb-radius-sm    6px
--smkb-radius-md    10px   ← GLOBAL SHAPE KNOB (override to change all components)
--smkb-radius-lg    16px
--smkb-radius-xl    24px
--smkb-radius-full  9999px
```

### Shadows
```
--smkb-shadow-xs  0 1px 2px 0 rgb(0 0 0 / 0.04)
--smkb-shadow-sm  0 1px 3px 0 rgb(0 0 0 / 0.1), ...
--smkb-shadow-md  0 4px 6px -1px rgb(0 0 0 / 0.1), ...
--smkb-shadow-lg  0 10px 15px -3px rgb(0 0 0 / 0.1), ...
--smkb-shadow-xl  0 20px 25px -5px rgb(0 0 0 / 0.1), ...
```

### Motion
```
--smkb-motion-duration-instant   50ms
--smkb-motion-duration-fast      100ms
--smkb-motion-duration-normal    200ms
--smkb-motion-duration-slow      350ms
--smkb-motion-easing-default     cubic-bezier(0.4, 0, 0.2, 1)
--smkb-motion-easing-spring      cubic-bezier(0.34, 1.56, 0.64, 1)
```
All durations become 0ms when `prefers-reduced-motion: reduce`.

### Z-Index
```
--smkb-z-dropdown   1000
--smkb-z-sticky     1020
--smkb-z-overlay    1040
--smkb-z-modal      1050
--smkb-z-dialog     1060
--smkb-z-tooltip    1070
--smkb-z-toast      1080
```

---

## Shared Types

```ts
type SmkbVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'on-primary' | 'neutral-ghost'
type SmkbSize    = 'sm' | 'md' | 'lg'
type SmkbStatus  = 'default' | 'error' | 'success' | 'warning'

interface SmkbOption<V = unknown> {
  label: string
  value: V
  disabled?: boolean
  group?: string
}

interface SmkbColumn<T = Record<string, unknown>> {
  field: string                              // dot-notation key path
  label: string
  sortable?: boolean
  width?: string | number
  align?: 'start' | 'center' | 'end'
  slot?: string                              // named cell slot
}

interface SmkbSortState {
  field: string
  direction: 'asc' | 'desc' | 'none'
}

// NavItem / Language — used by SmkbAppHeader
interface NavItem  { label: string; href?: string; active?: boolean }
interface Language { code: string; label: string; shortLabel?: string; dir: 'ltr' | 'rtl' }

interface SmkbSegmentedOption {
  value: string
  label: string
  shortLabel?: string
  disabled?: boolean
  lang?: string
  dir?: 'ltr' | 'rtl'
}
```

---

## Component Catalog

### SmkbButton

Clickable action element. Renders as `<button>`, `<a>`, or `<span>`.

**Props**
| Prop | Type | Default | Description |
|---|---|---|---|
| `variant` | `SmkbVariant` | `'primary'` | Visual style (includes `on-primary`, `neutral-ghost`) |
| `size` | `SmkbSize` | `'md'` | |
| `disabled` | `boolean` | `false` | Uses `aria-disabled` to keep in tab order |
| `loading` | `boolean` | `false` | Shows spinner, blocks clicks, sets `aria-busy` |
| `tag` | `'button'\|'a'\|'span'` | `'button'` | HTML element |
| `type` | `'button'\|'submit'\|'reset'` | `'button'` | |
| `iconLeft` | `string` | — | Icon class before label |
| `iconRight` | `string` | — | Icon class after label |
| `ariaLabel` | `string` | — | For icon-only buttons |

**Emits** `click(event: MouseEvent)` — not emitted when disabled/loading

**Slots** `default` (label), `icon-left`, `icon-right`

---

### SmkbIconButton

Circular icon-only button. Renders an icon from **`@smkbacil/design-ui` SVG files** (`icon` prop), or custom content via the default slot.

**Props** — `ariaLabel` (required), `icon?`, `variant`, `size`, `disabled`, `loading`, `tag`, `type`, optional `ariaPressed`, `ariaExpanded`, `ariaControls`.

**Emits** `click`

**Slots** `default` (custom icon SVG)

---

### SmkbBackButton

Dedicated back control: `SmkbIconButton` with `variant="neutral-ghost"`. Renders **inline SVG** arrows (Material Design paths) — no Iconify fetch. LTR shows a left-pointing arrow; RTL shows a right-pointing arrow, following `<html dir>`.

**Props** — `ariaLabel` (required), `size`, `disabled`, `loading`, `tag`, `type`, `href` (for `tag="a"`).

**Emits** `click`

**Composable** `useDocumentDir()` — reactive `ltr` / `rtl` from `<html dir>` (exported for advanced use).

---

### SmkbSegmentedControl

Pill `radiogroup` bound with `v-model` to the selected option `value`.

**Props** — `modelValue`, `options` (`SmkbSegmentedOption[]`), `variant`, `size`, `disabled`, `showShortLabel`, `groupAriaLabel`

**Emits** `update:modelValue`

---

### SmkbInput

Text input with validation states, icons, and helper message.

**Props**
| Prop | Type | Default |
|---|---|---|
| `modelValue` | `string\|number` | — |
| `type` | `'text'\|'email'\|'password'\|'number'\|'tel'\|'url'\|'search'` | `'text'` |
| `placeholder` | `string` | — |
| `size` | `SmkbSize` | `'md'` |
| `disabled` | `boolean` | `false` |
| `loading` | `boolean` | `false` |
| `readonly` | `boolean` | `false` |
| `required` | `boolean` | `false` |
| `status` | `SmkbStatus` | `'default'` |
| `message` | `string` | — |
| `iconLeft` | `string` | — |
| `iconRight` | `string` | — |
| `maxlength` | `number` | — |

**Emits** `update:modelValue`, `input`, `change`, `focus`, `blur`

---

### SmkbSelect

Custom-styled accessible dropdown (not native `<select>`).

**Props**
| Prop | Type | Default |
|---|---|---|
| `modelValue` | `V` | — |
| `options` | `SmkbOption<V>[]` | `[]` |
| `placeholder` | `string` | — |
| `size` | `SmkbSize` | `'md'` |
| `disabled` | `boolean` | `false` |
| `loading` | `boolean` | `false` |
| `status` | `SmkbStatus` | `'default'` |
| `message` | `string` | — |

**Emits** `update:modelValue`, `change`, `focus`, `blur`

**Slots** `chevron`, `option({option, selected})`

**Keyboard** ArrowDown/Up navigate, Enter/Space select, Home/End jump, Escape close, typeahead character search

---

### SmkbAutocomplete

Combobox (type-ahead) with filtered suggestions. ARIA `role="combobox"` / `role="listbox"`.

**Props**
| Prop | Type | Default |
|---|---|---|
| `modelValue` | `string` | — |
| `options` | `SmkbOption[]` | `[]` |
| `placeholder` | `string` | — |
| `size` | `SmkbSize` | `'md'` |
| `disabled` | `boolean` | `false` |
| `status` | `SmkbStatus` | `'default'` |
| `minChars` | `number` | `1` |
| `openOnFocus` | `boolean` | `false` |

**Emits** `update:modelValue`, `select(option: SmkbOption)`, `input`, `focus`, `blur`

---

### SmkbCheckbox

**Props** `modelValue` (boolean), `value` (group), `label`, `size`, `disabled`, `indeterminate`, `required`, `name`

**Emits** `update:modelValue`, `change`

**Slots** `default` (label override)

---

### SmkbRadio

**Props** `modelValue`, `value` (this radio's emitted value), `label`, `size`, `disabled`, `name`

**Emits** `update:modelValue`, `change`

---

### SmkbSwitch

Toggle rendered as `<input type="checkbox" role="switch">`.

**Props** `modelValue` (boolean), `label`, `size`, `disabled`, `name`

**Emits** `update:modelValue`, `change`

---

### SmkbSlider

Styled native range input.

**Props** `modelValue` (number, default 0), `min` (0), `max` (100), `step` (1), `disabled`, `size`, `label`

**Emits** `update:modelValue`, `change`

---

### SmkbField

Layout wrapper: label + form control + helper/error message. Use with any input component.

**Props** `label`, `message`, `status` (SmkbStatus), `required`, `horizontal`

**Slots** `default({fieldId, messageId})` — scoped slot providing auto-generated IDs

```vue
<SmkbField label="Email" status="error" message="Invalid email" required>
  <template #default="{ fieldId, messageId }">
    <SmkbInput :id="fieldId" :aria-describedby="messageId" v-model="email" type="email" status="error" />
  </template>
</SmkbField>
```

---

### SmkbDialog / SmkbModal

Modal dialog with focus trap, backdrop, Escape to close. Teleported to `<body>`.

**Props**
| Prop | Type | Default |
|---|---|---|
| `open` | `boolean` | `false` |
| `title` | `string` | — |
| `size` | `'sm'\|'md'\|'lg'\|'fullscreen'` | `'md'` |
| `closable` | `boolean` | `true` |
| `closeOnBackdrop` | `boolean` | `true` |

**Emits** `update:open`, `open`, `close`

**Slots** `default` (body), `title`, `footer({close})`

```vue
<SmkbDialog v-model:open="isOpen" title="Confirm">
  <p>Are you sure?</p>
  <template #footer="{ close }">
    <SmkbButton variant="ghost" @click="close">Cancel</SmkbButton>
    <SmkbButton variant="danger" @click="confirm">Delete</SmkbButton>
  </template>
</SmkbDialog>
```

---

### SmkbTable + SmkbTableColumn

Full-featured data table with sorting and optional pagination.

**SmkbTable Props**
| Prop | Type | Default |
|---|---|---|
| `data` | `T[]` | `[]` |
| `columns` | `SmkbColumn<T>[]` | — |
| `loading` | `boolean` | `false` |
| `paginated` | `boolean` | `false` |
| `perPage` | `number` | `20` |
| `currentPage` | `number` | `1` |
| `striped` | `boolean` | `false` |
| `hoverable` | `boolean` | `false` |
| `stickyHeader` | `boolean` | `false` |
| `caption` | `string` | — |

**Emits** `update:currentPage`, `sort({field, direction})`

**Slots** `header-{field}`, `cell-{field}({row, value, col})`, `empty`

---

### SmkbPagination

**Props** `currentPage` (v-model), `total` (required), `perPage` (20), `pageRange` (5), `showEnds` (true)

**Emits** `update:currentPage`, `change`

---

### SmkbTabs

**Props** `modelValue`, `tabs` (array of `{label, value, disabled?}`), `size`, `animated`

**Emits** `update:modelValue`, `change`

**Keyboard** Roving tabindex: ArrowLeft/Right to navigate tabs

---

### SmkbSteps

Progress/wizard indicator.

**Props** `modelValue` (0-indexed step), `steps` (array of `{label, description?, disabled?}`), `clickable`, `animated`

**Emits** `update:modelValue`, `change`

---

### SmkbCollapse

**Props** `open` (v-model), `title`, `animation`

**Emits** `update:open`, `open`, `close`

**Slots** `trigger`, `default`

---

### SmkbDropdown

Composable dropdown — you control trigger and content entirely via slots.

**Props** `open` (v-model), `position` ('bottom-start'), `disabled`, `closeOnClick` (true)

**Emits** `update:open`, `open`, `close`

**Slots** `trigger`, `default` (menu content)

**Behavior** Click-outside closes, Escape closes, click inside closes (if closeOnClick)

---

### SmkbTooltip

**Props** `label`, `position` ('top'/'bottom'/'left'/'right'), `active` (true), `multiline`, `delay`

**Slots** `default` (the element that triggers the tooltip)

---

### SmkbSidebar

Off-canvas panel with focus trap and backdrop.

**Props** `open` (v-model), `position` ('left'/'right'), `fullHeight` (true), `closable` (true)

**Emits** `update:open`, `open`, `close`

**Slots** `default`

---

### SmkbNotification

**Props** `variant` (SmkbVariant), `closable` (true), `duration` (ms), `message`

**Emits** `close`

**Slots** `default`

---

### SmkbLoading

**Props** `active` (false), `fullPage` (false), `label` ('Loading…')

---

### SmkbSkeleton

**Props** `count` (1), `width`, `height`, `circle` (false), `animated` (true)

---

### SmkbIcon

Renders one SVG from **`src/icons/svg/*.svg`** in `@smkbacil/design-ui` (Material Symbols–style glyphs). Export `SMKB_ICON_NAMES` lists ids.

**Props** — `icon` (id matching a `.svg` filename), `size` (`SmkbSize`).

**Slots** — `default` for custom inline SVG (slot takes precedence when provided).

**Adding icons:** Add `new-icon.svg` under `src/icons/svg/`, rebuild the package. Optional: `pnpm run generate-svg-icons` to refresh bodies from Iconify (maintainer).

---

### SmkbLogo

SMKB brand logo with 10 SVG variants. All SVGs inlined at build time.

**Props**
| Prop | Type | Default | Description |
|---|---|---|---|
| `lang` | `'heb'\|'eng'` | `'heb'` | Wordmark language |
| `layout` | `'horizontal'\|'vertical'\|'icon'` | `'horizontal'` | |
| `theme` | `'auto'\|'light'\|'dark'` | `'auto'` | auto = CSS-driven by `[data-theme]`; light = for primary bg; dark = for dark bg |
| `width` | `string\|number` | — | CSS width; omit for natural SVG size |

---

### SmkbAppHeader

Fixed application header with language switching, navigation, and responsive side drawer.

**Props**
| Prop | Type | Default | Description |
|---|---|---|---|
| `logoLang` | `'heb'\|'eng'` | auto | Auto-derives from language dir if omitted |
| `logoLayout` | `'horizontal'\|'vertical'\|'icon'` | `'horizontal'` | |
| `logoWidth` | `string\|number` | `'140px'` | |
| `logoHref` | `string` | `'/'` | |
| `showLanguage` | `boolean` | `true` | Show/hide language toggle |
| `showAccessibility` | `boolean` | `true` | Show/hide built-in accessibility toolbar |
| `languages` | `Language[]` | he + en | Available languages |
| `modelValue` | `string` | `'he'` | Active language code (v-model) |
| `headerItems` | `NavItem[]` | `[]` | Always visible in bar (desktop) |
| `menuItems` | `NavItem[]` | `[]` | Behind hamburger on desktop |

**Emits** `update:modelValue` (language changed), `nav` (item clicked)

**Slots** `logo`, `actions`, `drawer-top`, `drawer-bottom`

**Behavior**
- Language change sets `document.documentElement.lang` + `dir`
- Logo wordmark auto-switches: ltr lang → eng logo, rtl lang → heb logo
- Mobile: all items collapse to side drawer (header items top, menu items bottom)
- CSS token: `--smkb-header-height: 64px` available globally for page layout offset

```vue
<SmkbAppHeader
  v-model="currentLang"
  :header-items="[{ label: 'Home', href: '/', active: true }]"
  :menu-items="[{ label: 'Settings', href: '/settings' }]"
/>
<!-- Offset page content: padding-block-start: var(--smkb-header-height) -->
```

---

### SmkbAccessibility

Self-contained accessibility toolbar. A trigger button opens a side panel with 12 toggle tools,
3 adjustment sliders, and a reset button. State is persisted to `localStorage`.
Bilingual (Hebrew / English) with RTL/LTR support. Built into `SmkbAppHeader` by default.

**Props**
| Prop | Type | Default | Description |
|---|---|---|---|
| `lang` | `'he'\|'en'` | auto | Panel language. Falls back to `document.documentElement.lang` |
| `showTrigger` | `boolean` | `true` | Render the inline trigger button |
| `open` | `boolean` | `false` | v-model for panel open state |

**Emits** `update:open`

**Toggle tools** (toggle CSS class on `<html>`)
| Key | Effect |
|---|---|
| `high-contrast` | Override color tokens for maximum contrast |
| `negative` | `filter: invert(1) hue-rotate(180deg)` (exclusive with grayscale) |
| `grayscale` | `filter: grayscale(1)` (exclusive with negative) |
| `highlight-links` | Yellow background + underline on all `<a>` |
| `highlight-headings` | Colored bottom border on h1–h6 |
| `readable-font` | Switch to Arial/Helvetica |
| `hide-images` | `visibility: hidden` on img and non-icon svg |
| `stop-animations` | Force animation/transition duration to 0.001ms |
| `big-cursor-dark` | 32px dark cursor via SVG data URI (exclusive with white cursor) |
| `big-cursor-white` | 32px white cursor via SVG data URI (exclusive with dark cursor) |
| `keyboard-nav` | Enhanced `focus-visible` outline on all interactive elements |
| `reading-guide` | Mouse-following horizontal highlight bar |

**Sliders** (set CSS custom property on `<html>`)
| Key | CSS Var | Range | Default |
|---|---|---|---|
| `font-size` | `--smkb-a11y-font-scale` | 0.5×–2.0× | 1.0 |
| `word-spacing` | `--smkb-a11y-word-spacing` | 0–20px | 0 |
| `letter-spacing` | `--smkb-a11y-letter-spacing` | 0–10px | 0 |

```vue
<!-- Standalone use (trigger renders inline) -->
<SmkbAccessibility lang="he" />

<!-- Controlled — host manages open state, no built-in trigger -->
<SmkbAccessibility lang="en" :show-trigger="false" v-model:open="a11yOpen" />

<!-- Hide from header entirely -->
<SmkbAppHeader :show-accessibility="false" />
```

---

## Common Patterns

### Form with validation

```vue
<SmkbField label="Email address" :status="errors.email ? 'error' : 'default'" :message="errors.email" required>
  <template #default="{ fieldId }">
    <SmkbInput :id="fieldId" v-model="form.email" type="email" :status="errors.email ? 'error' : 'default'" />
  </template>
</SmkbField>
```

### Confirmation dialog

```vue
<SmkbButton variant="danger" @click="open = true">Delete</SmkbButton>
<SmkbDialog v-model:open="open" title="Confirm deletion" size="sm">
  <p>This action cannot be undone.</p>
  <template #footer="{ close }">
    <SmkbButton variant="ghost" @click="close">Cancel</SmkbButton>
    <SmkbButton variant="danger" :loading="deleting" @click="handleDelete">Delete</SmkbButton>
  </template>
</SmkbDialog>
```

### Data table with pagination

```vue
<SmkbTable
  :data="rows"
  :columns="[
    { field: 'name', label: 'Name', sortable: true },
    { field: 'email', label: 'Email' },
    { field: 'role', label: 'Role', slot: 'role' },
  ]"
  :loading="loading"
  paginated
  :per-page="20"
  v-model:current-page="page"
  hoverable
  striped
>
  <template #cell-role="{ value }">
    <SmkbButton size="sm" variant="ghost">{{ value }}</SmkbButton>
  </template>
</SmkbTable>
```

### Loading skeleton

```vue
<template v-if="loading">
  <SmkbSkeleton :count="3" height="1.5rem" />
</template>
<template v-else>
  <!-- real content -->
</template>
```
