<template>
  <div class="module-nav">
    <div class="module-nav-info">
      Module {{ currentModule?.number }} of {{ modules.length }}
    </div>
    <div class="module-nav-actions">
      <SmkbButton
        v-if="prevModule"
        variant="ghost"
        @click="router.push(prevModule.path)"
      >
        ← {{ prevModule.title }}
      </SmkbButton>
      <span v-else class="spacer" />

      <SmkbButton
        v-if="!isComplete(moduleId)"
        variant="primary"
        @click="handleMarkComplete"
      >
        Mark complete
        <template v-if="nextModule"> &amp; continue →</template>
      </SmkbButton>
      <SmkbButton
        v-else-if="nextModule"
        variant="secondary"
        @click="router.push(nextModule.path)"
      >
        Next: {{ nextModule.title }} →
      </SmkbButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { modules } from '../router'
import { useProgress } from '../composables/useProgress'

const props = defineProps<{ moduleId: string }>()

const router = useRouter()
const { isComplete, markComplete } = useProgress()

const currentIndex = computed(() => modules.findIndex(m => m.id === props.moduleId))
const currentModule = computed(() => modules[currentIndex.value])
const prevModule = computed(() => currentIndex.value > 0 ? modules[currentIndex.value - 1] : null)
const nextModule = computed(() => currentIndex.value < modules.length - 1 ? modules[currentIndex.value + 1] : null)

function handleMarkComplete() {
  markComplete(props.moduleId)
  if (nextModule.value) {
    router.push(nextModule.value.path)
  }
}
</script>

<style scoped>
.module-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--smkb-space-6) 0;
  border-top: 1px solid var(--smkb-color-border);
  margin-top: var(--smkb-space-8);
}

.module-nav-info {
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-tertiary);
}

.module-nav-actions {
  display: flex;
  align-items: center;
  gap: var(--smkb-space-3);
}

.spacer {
  width: 1px;
}
</style>
