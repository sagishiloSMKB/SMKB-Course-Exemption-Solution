<template>
  <!-- Standalone full-page routes (errors, login screens) render outside the app shell.
       Add route names to STANDALONE_ROUTES below to opt a view out of the layout. -->
  <RouterView v-if="isStandalonePage" />

  <SmkbLayout v-else>
    <template #header>
      <SmkbAppHeader
        :app-name="SOLUTION.appName"
        v-model="lang"
        :languages="SOLUTION.languages"
        :show-theme-toggle="true"
        :show-user-menu="user.isAuthenticated"
        :user-menu="userMenuConfig"
        @user-logout="handleSignOut"
      >
        <!-- Sign In button shown in the header actions area when anonymous -->
        <template v-if="!user.isAuthenticated" #actions>
          <SmkbButton size="sm" variant="ghost" @click="handleSignIn">
            Sign In
          </SmkbButton>
        </template>
      </SmkbAppHeader>
    </template>

    <div class="main-content">
      <RouterView />
    </div>
  </SmkbLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { SmkbButton } from '@smkbacil/design-ui'
import { usePortalUser } from './composables/usePortalUser'
import { useLanguage } from './composables/useLanguage'
import { signIn, signOut } from './services/auth'
import { SOLUTION } from './config/solution'

// Routes rendered without the SmkbLayout shell (full-page views).
// The OTP auth module's enable skill adds 'login' here ('locked-out' stays
// inside the layout so the header remains visible).
const STANDALONE_ROUTES = new Set(['not-found'])

const route = useRoute()
const isStandalonePage = computed(() => STANDALONE_ROUTES.has(route.name as string))

const { user } = usePortalUser()

// Current language code - the SHARED ref (composables/useLanguage.ts), not a local one.
// While it was local, nothing outside this component could read it: every message elsewhere
// resolved against SOLUTION.defaultLanguage, so toggling to English left all error text in
// Hebrew, and <html dir> was never updated after mount.
const { langModel: lang } = useLanguage()

// User menu config for SmkbAppHeader — populated from the Power Pages session
const userMenuConfig = computed(() => ({
  name:       `${user.value.firstName} ${user.value.lastName}`.trim() || user.value.userName,
  email:      user.value.email,
  showLogout: true,
}))

function handleSignIn()  { signIn() }
function handleSignOut() { signOut() }
</script>
