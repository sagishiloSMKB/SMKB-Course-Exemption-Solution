<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Items</h1>
      <SmkbButton variant="primary" icon-left="add" @click="handleCreate">
        New item
      </SmkbButton>
    </div>

    <SmkbTable :loading="loading" :data="items" :columns="columns">
      <template #empty>No items found.</template>

      <template #cell-name="{ row }">
        {{ row.name }}
      </template>

      <template #cell-createdAt="{ row }">
        {{ new Date(row.createdAt).toLocaleDateString() }}
      </template>
    </SmkbTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useSmkbToast } from "@smkb/design-ui";
import { getItems } from "../services/dataService";
import type { ExampleItem } from "../types/ExampleItem";

const toast = useSmkbToast();

const items = ref<ExampleItem[]>([]);
const loading = ref(true);

const columns = [
  { field: "name", label: "Name" },
  { field: "createdAt", label: "Created" },
];

onMounted(async () => {
  try {
    items.value = await getItems();
  } catch {
    toast.error("Failed to load items.");
  } finally {
    loading.value = false;
  }
});

function handleCreate() {
  // TODO: implement create flow
}
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
</style>
