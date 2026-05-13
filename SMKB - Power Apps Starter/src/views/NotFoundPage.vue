<template>
  <div class="page">
    <p class="code">404</p>
    <p class="message">Page not found</p>
    <RouterLink to="/" class="back-link">Back to home</RouterLink>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--smkb-space-3);
  height: 100%;
  color: var(--smkb-color-text-secondary);
}

.code {
  font-size: var(--smkb-font-size-3xl);
  font-weight: var(--smkb-font-weight-bold);
  color: var(--smkb-color-text-primary);
}

.message {
  font-size: var(--smkb-font-size-lg);
}

.back-link {
  margin-top: var(--smkb-space-2);
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-primary);
}
</style>
