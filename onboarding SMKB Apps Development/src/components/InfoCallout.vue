<template>
  <div class="callout" :class="`callout--${type}`">
    <span class="callout-icon">{{ icon }}</span>
    <div class="callout-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: 'tip' | 'warning' | 'note' | 'rule'
}>()

const icon = computed(() => {
  const icons = { tip: '💡', warning: '⚠️', note: 'ℹ️', rule: '🚫' }
  return icons[props.type]
})
</script>

<style scoped>
.callout {
  display: flex;
  gap: var(--smkb-space-3);
  padding: var(--smkb-space-4);
  border-radius: var(--smkb-radius-md);
  border-left: 4px solid;
  margin: var(--smkb-space-4) 0;
  font-size: var(--smkb-font-size-sm);
  line-height: 1.6;
}

.callout--tip {
  border-left-color: var(--smkb-color-success);
  background: color-mix(in srgb, var(--smkb-color-success) 8%, transparent);
}

.callout--warning {
  border-left-color: var(--smkb-color-warning);
  background: color-mix(in srgb, var(--smkb-color-warning) 8%, transparent);
}

.callout--note {
  border-left-color: var(--smkb-color-primary);
  background: color-mix(in srgb, var(--smkb-color-primary) 8%, transparent);
}

.callout--rule {
  border-left-color: var(--smkb-color-destructive);
  background: color-mix(in srgb, var(--smkb-color-destructive) 8%, transparent);
}

.callout-icon {
  font-size: 1.1em;
  flex-shrink: 0;
  line-height: 1.6;
}

.callout-body {
  flex: 1;
  color: var(--smkb-color-text-primary);
}
</style>
