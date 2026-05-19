<template>
  <div class="page">
    <div class="hero">
      <div class="hero-eyebrow">SMKB Apps Development</div>
      <h1 class="hero-title">Welcome, developer.</h1>
      <p class="hero-subtitle">
        Get up to speed in ~45 minutes. This guide walks you through everything you need to
        understand the SMKB development system before writing your first line of code.
      </p>
    </div>

    <div class="section">
      <h2>What you'll learn</h2>
      <div class="learn-grid">
        <div class="learn-card">
          <div class="learn-card-icon">🏗️</div>
          <div>
            <div class="learn-card-title">Power Platform</div>
            <div class="learn-card-desc">What it is, what its components do, and how SMKB uses them</div>
          </div>
        </div>
        <div class="learn-card">
          <div class="learn-card-icon">📦</div>
          <div>
            <div class="learn-card-title">The Starter Kit</div>
            <div class="learn-card-desc">The template system that every SMKB solution is built from</div>
          </div>
        </div>
        <div class="learn-card">
          <div class="learn-card-icon">🤖</div>
          <div>
            <div class="learn-card-title">Working with Claude</div>
            <div class="learn-card-desc">What Claude does automatically and what needs your input</div>
          </div>
        </div>
        <div class="learn-card">
          <div class="learn-card-icon">🔒</div>
          <div>
            <div class="learn-card-title">Security & Privacy</div>
            <div class="learn-card-desc">The non-negotiable rules built into every SMKB project</div>
          </div>
        </div>
        <div class="learn-card">
          <div class="learn-card-icon">🚀</div>
          <div>
            <div class="learn-card-title">ALM & The Pipeline</div>
            <div class="learn-card-desc">How changes move from Dev to Stage to Production</div>
          </div>
        </div>
        <div class="learn-card">
          <div class="learn-card-icon">🎨</div>
          <div>
            <div class="learn-card-title">The UI Library</div>
            <div class="learn-card-desc">@smkb/design-ui — the shared component library used in every solution</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>How this works</h2>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <div><strong>Read</strong> — each module has focused content with real examples from the codebase</div>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <div><strong>Explore</strong> — code examples show exactly what things look like in practice</div>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <div><strong>Mark complete</strong> — track your progress through the 10 modules</div>
        </div>
        <div class="step">
          <div class="step-num">4</div>
          <div><strong>Start building</strong> — say "init project" to Claude when you're done</div>
        </div>
      </div>
    </div>

    <InfoCallout type="tip">
      This onboarding app is itself built with <strong>@smkb/design-ui</strong> — the same library
      every SMKB solution uses. The sidebar, header, and layout you see right now are live examples.
    </InfoCallout>

    <ModuleNav module-id="welcome" />
  </div>
</template>

<script setup lang="ts">
import InfoCallout from '../components/InfoCallout.vue'
import ModuleNav from '../components/ModuleNav.vue'
</script>

<style scoped>
.page { max-width: 760px; }

.hero {
  margin-bottom: var(--smkb-space-10);
}

.hero-eyebrow {
  font-size: var(--smkb-font-size-sm);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-primary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: var(--smkb-space-3);
}

.hero-title {
  font-size: 2.5rem;
  font-weight: var(--smkb-font-weight-bold);
  color: var(--smkb-color-text-primary);
  margin: 0 0 var(--smkb-space-4);
  line-height: 1.2;
}

.hero-subtitle {
  font-size: var(--smkb-font-size-lg);
  color: var(--smkb-color-text-secondary);
  line-height: 1.6;
  margin: 0;
  max-width: 600px;
}

.section {
  margin-bottom: var(--smkb-space-10);
}

.section h2 {
  font-size: var(--smkb-font-size-xl);
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin: 0 0 var(--smkb-space-5);
}

.learn-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--smkb-space-4);
}

.learn-card {
  display: flex;
  gap: var(--smkb-space-3);
  padding: var(--smkb-space-4);
  border: 1px solid var(--smkb-color-border);
  border-radius: var(--smkb-radius-md);
  background: var(--smkb-color-surface-subtle);
}

.learn-card-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.learn-card-title {
  font-weight: var(--smkb-font-weight-semibold);
  color: var(--smkb-color-text-primary);
  margin-bottom: var(--smkb-space-1);
  font-size: var(--smkb-font-size-sm);
}

.learn-card-desc {
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-secondary);
  line-height: 1.4;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: var(--smkb-space-4);
}

.step {
  display: flex;
  gap: var(--smkb-space-4);
  align-items: flex-start;
  font-size: var(--smkb-font-size-sm);
  color: var(--smkb-color-text-secondary);
  line-height: 1.5;
}

.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--smkb-color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--smkb-font-weight-bold);
  font-size: var(--smkb-font-size-sm);
  flex-shrink: 0;
}
</style>
