import '@smkb/design-ui/tokens-nofonts.css'
import '@smkb/design-ui/tokens-dark.css'
import '@smkb/design-ui/styles'

import { createApp } from 'vue'
import { createSmkb } from '@smkb/design-ui'
import App from './App.vue'
import { router } from './router'

const app = createApp(App)
app.use(createSmkb())
app.use(router)
app.mount('#app')
