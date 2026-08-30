<template>
  <div class="locked-out-page">
    <SmkbCard class="locked-out-card">
      <div class="locked-out-content">
        <SmkbIcon name="lock" size="48" class="locked-icon" />
        <h2>הגישה שלך חסומה</h2>
        <p>החשבון שלך אינו פעיל. לעזרה, אנא פנה/י לתמיכה:</p>
        <div v-if="config" class="support-info">
          <p v-if="config.supportPhone">
            <strong>טלפון:</strong> {{ config.supportPhone }}
          </p>
          <p v-if="config.supportEmail">
            <strong>דוא"ל:</strong>
            <a :href="`mailto:${config.supportEmail}`">{{ config.supportEmail }}</a>
          </p>
        </div>
        <SmkbButton variant="ghost" @click="handleLogout">יציאה</SmkbButton>
      </div>
    </SmkbCard>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './useAuth'
import { getPortalConfig, type PortalConfig } from './configService'
import { OTP_AUTH_CONFIG } from './otpAuthConfig'

const router = useRouter()
const { logoutAndRevoke } = useAuth()
const config = ref<PortalConfig | null>(null)

onMounted(async () => {
  config.value = await getPortalConfig()
})

// Awaited on purpose: this handler navigates, and window.shell.ajaxSafePost has no
// keepalive, so navigating first can abort the in-flight revoke and leave the token
// valid server-side. logoutAndRevoke() bounds its own wait, so this cannot hang.
async function handleLogout() {
  await logoutAndRevoke()
  await router.push(OTP_AUTH_CONFIG.loginPath)
}
</script>

<style scoped>
.locked-out-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: var(--smkb-space-6);
}

.locked-out-card {
  max-width: 480px;
  width: 100%;
}

.locked-out-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--smkb-space-4);
  text-align: center;
  padding: var(--smkb-space-6);
}

.locked-icon {
  color: var(--smkb-color-danger);
}

.support-info {
  background: var(--smkb-color-surface-secondary);
  border-radius: var(--smkb-radius-md);
  padding: var(--smkb-space-4);
  width: 100%;
  text-align: start;
}

.support-info p {
  margin: var(--smkb-space-1) 0;
}
</style>
