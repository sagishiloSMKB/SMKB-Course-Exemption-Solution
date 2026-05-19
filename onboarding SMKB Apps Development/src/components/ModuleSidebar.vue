<template>
  <nav class="sidebar">
    <div class="sidebar-modules">
      <RouterLink
        v-for="mod in modules"
        :key="mod.id"
        :to="mod.path"
        class="module-link"
        active-class="module-link--active"
        exact-active-class="module-link--active"
      >
        <span class="module-badge">{{ mod.number }}</span>
        <span class="module-title">{{ mod.title }}</span>
        <span v-if="isComplete(mod.id)" class="module-check" aria-label="Complete">✓</span>
      </RouterLink>
    </div>

    <div class="sidebar-footer">
      <div class="progress-label">{{ completionPercent }}% complete</div>
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: completionPercent + '%' }" />
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { modules } from '../router'
import { useProgress } from '../composables/useProgress'

const { isComplete, completionPercent } = useProgress()
</script>

<style scoped>
.sidebar {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--smkb-color-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background: var(--smkb-color-surface);
}

.sidebar-modules {
  flex: 1;
  padding: var(--smkb-space-3) 0;
}

.module-link {
  display: flex;
  align-items: center;
  gap: var(--smkb-space-2);
  padding: var(--smkb-space-2) var(--smkb-space-4);
  text-decoration: none;
  color: var(--smkb-color-text-secondary);
  font-size: var(--smkb-font-size-sm);
  border-left: 3px solid transparent;
  transition: background 0.1s, color 0.1s;
}

.module-link:hover {
  background: var(--smkb-color-surface-subtle);
  color: var(--smkb-color-text-primary);
}

.module-link--active {
  border-left-color: var(--smkb-color-primary);
  background: var(--smkb-color-surface-subtle);
  color: var(--smkb-color-primary);
  font-weight: var(--smkb-font-weight-semibold);
}

.module-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--smkb-color-surface-raised);
  font-size: 11px;
  font-weight: var(--smkb-font-weight-semibold);
  flex-shrink: 0;
}

.module-link--active .module-badge {
  background: var(--smkb-color-primary);
  color: white;
}

.module-title {
  flex: 1;
  line-height: 1.3;
}

.module-check {
  color: var(--smkb-color-success);
  font-size: var(--smkb-font-size-sm);
  font-weight: var(--smkb-font-weight-bold);
  flex-shrink: 0;
}

.sidebar-footer {
  padding: var(--smkb-space-4);
  border-top: 1px solid var(--smkb-color-border);
}

.progress-label {
  font-size: 11px;
  color: var(--smkb-color-text-tertiary);
  margin-bottom: var(--smkb-space-1);
}

.progress-track {
  height: 4px;
  background: var(--smkb-color-surface-raised);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--smkb-color-primary);
  border-radius: 2px;
  transition: width 0.3s ease;
}
</style>
