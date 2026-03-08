<script setup lang="ts">
import { provide } from 'vue'
import { createAutoencoderService } from '../services/AutoencoderService'
import AutoencoderView from './AutoencoderView.vue'
import EmbeddingView from './EmbeddingView.vue'
import WeightView from './WeightView.vue'
import TrainingConfigView from './TrainingConfigView.vue'
import TrainingStatsView from './TrainingStatsView.vue'

// Create and provide the autoencoder service to all descendants
const autoencoderService = createAutoencoderService()
provide('autoencoderService', autoencoderService)
</script>

<template>
  <div class="main-view">
    <header class="app-header">
      <h1 class="app-title">Superposition Visualization</h1>
      <p class="app-subtitle">
        Explore how a linear autoencoder learns to represent features in a compressed embedding space.
      </p>
    </header>

    <main class="app-content">
      <!-- Autoencoder: rendered directly on the background (no card) -->
      <section class="autoencoder-section">
        <h2 class="section-title">Autoencoder</h2>
        <AutoencoderView />
      </section>

      <!-- Secondary row: Embedding + Weights + Training config + Training stats -->
      <div class="secondary-row">
        <section class="panel embedding-panel">
          <h2 class="panel-title">Embedding Space</h2>
          <EmbeddingView />
        </section>

        <section class="panel weight-panel">
          <h2 class="panel-title">Weights</h2>
          <WeightView />
        </section>

        <section class="panel training-config-panel">
          <h2 class="panel-title">Training</h2>
          <TrainingConfigView />
        </section>

        <section class="panel training-stats-panel">
          <h2 class="panel-title">Statistics</h2>
          <TrainingStatsView />
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.main-view {
  min-height: 100vh;
  background: var(--color-bg-secondary);
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 1.5rem 2rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-bg);
}

.app-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.25rem;
}

.app-subtitle {
  font-size: 0.88rem;
  color: var(--color-text-secondary);
  margin: 0;
}

.app-content {
  padding: 1.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  flex: 1;
}

/* Autoencoder renders directly on the page — no card wrapper */
.autoencoder-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
}

.primary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-start;
}

.secondary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-start;
}

.panel {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: var(--shadow-card);
}

.panel-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.embedding-panel {
  flex: 0 1 320px;
  min-width: 260px;
}

.weight-panel {
  flex: 0 1 260px;
  min-width: 200px;
}

.training-config-panel {
  flex: 0 1 260px;
  min-width: 200px;
}

.training-stats-panel {
  flex: 1 1 300px;
  min-width: 250px;
}
</style>
