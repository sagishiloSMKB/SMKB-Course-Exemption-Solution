<template>
  <div class="code-block">
    <div v-if="$slots.filename" class="code-filename">
      <slot name="filename" />
    </div>
    <pre class="code-pre"><code>{{ code }}</code></pre>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  code: string
  language?: string
}>()
</script>

<style scoped>
.code-block {
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  overflow: hidden;
  margin: var(--smkb-space-3) 0;
}

.code-filename {
  background: var(--smkb-color-surface-raised);
  border-bottom: 1px solid var(--smkb-color-border);
  padding: var(--smkb-space-2) var(--smkb-space-4);
  font-size: var(--smkb-font-size-xs);
  color: var(--smkb-color-text-secondary);
  font-family: monospace;
}

.code-pre {
  background: var(--smkb-color-surface-subtle);
  margin: 0;
  padding: var(--smkb-space-4);
  overflow-x: auto;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: var(--smkb-font-size-sm);
  line-height: 1.6;
  color: var(--smkb-color-text-primary);
}

.code-pre code {
  white-space: pre;
}
</style>
