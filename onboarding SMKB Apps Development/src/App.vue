<template>
  <SmkbLayout>
    <template #header>
      <SmkbAppHeader
        app-name="SMKB Developer Onboarding"
        logo-lang="eng"
        model-value="en"
        :show-language="false"
        :show-user-menu="false"
        :show-accessibility="false"
        :show-theme-toggle="false"
      />
    </template>
    <div class="app-body">
      <ModuleSidebar />
      <main class="app-content">
        <RouterView />
      </main>
    </div>
  </SmkbLayout>
</template>

<script setup lang="ts">
import ModuleSidebar from './components/ModuleSidebar.vue'
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
  padding: var(--smkb-space-8);
}
</style>
