<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">בית</h1>
    </div>

    <p class="page-intro">
      זהו מסך הבית לדוגמה. החלף אותו בתוכן האפליקציה שלך. הטבלה נטענת דרך
      <code>getExamples()</code> — בפיתוח (<code>pnpm dev</code>) מתוך נתוני מוק,
      ובענן דרך ה-flow המחובר.
    </p>

    <SmkbButton v-if="error" variant="secondary" @click="load">
      טעינה נכשלה — נסה שוב
    </SmkbButton>

    <SmkbTable
      :data="items"
      :columns="columns"
      :loading="loading"
      row-key="id"
      hoverable
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getExamples, type ExampleItem } from '../services/exampleService'

const items = ref<ExampleItem[]>([])
const loading = ref(false)
const error = ref(false)

const columns = [
  { field: 'id', label: 'מזהה' },
  { field: 'name', label: 'שם' },
]

async function load() {
  loading.value = true
  error.value = false
  try {
    items.value = await getExamples()
  } catch (e) {
    error.value = true
    console.error('Failed to load examples', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page {
  padding: var(--smkb-space-6);
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-6);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-title {
  font-size: var(--smkb-font-size-xl);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
}

.page-intro {
  color: var(--smkb-color-text-secondary);
  line-height: 1.6;
}
</style>
