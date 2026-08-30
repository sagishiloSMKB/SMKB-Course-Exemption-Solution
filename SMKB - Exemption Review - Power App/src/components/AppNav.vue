<template>
  <nav class="app-nav" aria-label="Main navigation">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="nav-item"
      active-class="nav-item--active"
      exact-active-class="nav-item--active"
    >
      <span v-if="item.icon" class="nav-item__icon" :class="item.icon" aria-hidden="true" />
      <span class="nav-item__label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
defineProps<{
  items: { label: string; to: string; icon?: string }[]
}>()
</script>

<style scoped>
.app-nav {
  width: 220px;
  flex-shrink: 0;
  height: 100%;
  border-inline-end: 1px solid var(--smkb-color-border);
  background: var(--smkb-color-surface);
  padding: var(--smkb-space-4) var(--smkb-space-2);
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-1);
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--smkb-space-2);
  padding: var(--smkb-space-2) var(--smkb-space-3);
  border-radius: var(--smkb-radius-md);
  font-size: var(--smkb-font-size-sm);
  font-weight: var(--smkb-font-weight-medium);
  color: var(--smkb-color-foreground-muted);
  text-decoration: none;
  transition:
    background var(--smkb-motion-duration-fast) var(--smkb-motion-easing-default),
    color var(--smkb-motion-duration-fast) var(--smkb-motion-easing-default);
}

.nav-item:hover {
  background: var(--smkb-color-surface-subtle);
  color: var(--smkb-color-foreground);
}

.nav-item--active {
  background: var(--smkb-color-primary-subtle);
  color: var(--smkb-color-primary);
  font-weight: var(--smkb-font-weight-semibold);
}
</style>
