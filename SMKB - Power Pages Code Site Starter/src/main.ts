import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createSmkb } from '@smkbacil/design-ui'
// tokens-nofonts.css is the default: tokens.css references bundled .woff2 files
// that Vite emits as assets/*.woff2 — those are NOT in bundleFilePatterns, so
// Power Pages serves index.html for them (404/MIME errors). To use the bundled
// fonts, switch to tokens.css AND add the woff2 patterns to bundleFilePatterns.
import '@smkbacil/design-ui/tokens-nofonts.css'  // design tokens — colors, spacing, typography
import '@smkbacil/design-ui/style.css'           // component styles
import App from './App.vue'
import router from './router'
import { SOLUTION, defaultDirection } from './config/solution'
import './assets/main.css'           // app-level overrides — must load after library styles

// Set language + direction on <html> BEFORE mount. The design system reads
// direction from <html dir>; without this, a plain refresh renders LTR until
// the header component mounts. SmkbAppHeader keeps it in sync on toggle.
document.documentElement.lang = SOLUTION.defaultLanguage
document.documentElement.dir = defaultDirection()

// Power Pages injects its own favicon and title into <head> before our bundle runs.
// Override the favicon by removing existing icon links and re-adding ours.
document.querySelectorAll("link[rel*='icon']").forEach(el => el.remove())
const _faviconLink = document.createElement('link')
_faviconLink.rel = 'icon'
_faviconLink.type = 'image/x-icon'
_faviconLink.href = '/favicon.ico'
document.head.appendChild(_faviconLink)
document.title = SOLUTION.documentTitle

createApp(App)
  .use(createPinia())
  .use(router)
  .use(createSmkb())                 // registers all SmkbXxx components globally
  .mount('#app')
