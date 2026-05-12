<template>
  <div class="HomePage">
    <SmkbCard as="article" variant="elevated" padding="lg" class="HomePage__card">
      <template #header>
        <h1 class="HomePage__title">Template site title</h1>
      </template>
      <p class="HomePage__text">Template site text. Replace this with your content.</p>
    </SmkbCard>
  </div>
</template>

<style scoped>
.HomePage {
  padding: var(--smkb-space-6);
  display: flex;
  justify-content: center;
}

.HomePage__card {
  max-width: 480px;
  width: 100%;
}

.HomePage__title {
  margin: 0;
  font-size: var(--smkb-font-size-xl);
  font-weight: var(--smkb-font-weight-bold);
}

.HomePage__text {
  margin: 0;
}
</style>
