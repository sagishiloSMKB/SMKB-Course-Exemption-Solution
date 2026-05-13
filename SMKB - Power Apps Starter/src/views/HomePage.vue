<template>
  <div class="page">
    <div class="page-header">
      <h1 class="page-title">Home</h1>
    </div>
    <p>Replace this view with your application's home screen.</p>
  </div>
</template>

<script setup lang="ts">
// Replace the contents of this view with your application logic.
// When you are ready to load data from Dataverse, import from ../services/dataService.
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
