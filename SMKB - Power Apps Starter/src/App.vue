<template>
  <SmkbLayout>
    <template #header>
      <SmkbAppHeader :show-theme-toggle="false" />
    </template>
    <div class="app-body">
      <AppNav :items="navItems" />
      <main class="app-content">
        <RouterView />
      </main>
    </div>
  </SmkbLayout>
</template>

<script setup lang="ts">
import AppNav from './components/AppNav.vue'

// ── Navigation ────────────────────────────────────────────────────────────────
// Add one entry here for each section you add to router/index.ts.
const navItems = [
  { label: 'Home', to: '/' },
]
</script>

<style scoped>
.app-body {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.app-content {
  flex: 1;
  overflow-y: auto;
}
</style>
