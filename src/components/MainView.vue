<script setup lang="ts">
import { provide } from 'vue'
import { createAutoencoderService } from '../services/AutoencoderService'
import { createSelectionService } from '../services/SelectionService'
import AutoencoderView from './AutoencoderView.vue'
import EmbeddingView from './embeddingView/EmbeddingView.vue'
import WeightView from './WeightView.vue'
import TrainingConfigView from './TrainingConfigView.vue'
import TrainingStatsView from './TrainingStatsView.vue'

// Create and provide the autoencoder service to all descendants
const autoencoderService = createAutoencoderService()
provide('autoencoderService', autoencoderService)

// Create and provide the selection service to all descendants
const selSvc = createSelectionService()
provide('selectionService', selSvc)
</script>

<template>
  <div class="main-view">
    <header class="app-header">
      <h1 class="app-title">Superposition Visualization</h1>
    </header>

    <main class="app-content">
      <!-- Top row: Autoencoder (left) + Embedding space (right) -->
      <div class="top-row">
        <section class="autoencoder-section">
          <h2 class="section-title">Autoencoder</h2>
          <AutoencoderView />
        </section>

        <section class="panel embedding-panel">
          <h2 class="panel-title">Embedding Space</h2>
          <EmbeddingView />
        </section>
      </div>

      <!-- Secondary row: Weights + Training config + Training stats -->
      <div class="secondary-row">
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

    <!-- ── Selection debug bar ─────────────────────────────── -->
    <div class="debug-bar">
      <span class="debug-section">
        <span class="debug-label">Hover</span>
        <template v-if="selSvc.hovered.value">
          <span class="debug-kind">{{ selSvc.hovered.value.kind }}</span>
          <span class="debug-coords" v-if="selSvc.hovered.value.kind === 'weight'">
            [{{ selSvc.hovered.value.row }},{{ selSvc.hovered.value.col }}]
          </span>
          <span class="debug-coords" v-else>[{{ selSvc.hovered.value.idx }}]</span>
          <span class="debug-origin">← {{ selSvc.hoveredOrigin.value }}</span>
        </template>
        <span v-else class="debug-none">—</span>
      </span>

      <span class="debug-divider">│</span>

      <span class="debug-section">
        <span class="debug-label">Selected</span>
        <template v-if="selSvc.selected.value">
          <span class="debug-kind">{{ selSvc.selected.value.kind }}</span>
          <span class="debug-coords" v-if="selSvc.selected.value.kind === 'weight'">
            [{{ selSvc.selected.value.row }},{{ selSvc.selected.value.col }}]
          </span>
          <span class="debug-coords" v-else>[{{ selSvc.selected.value.idx }}]</span>
          <span class="debug-origin">← {{ selSvc.selectedOrigin.value }}</span>
        </template>
        <span v-else class="debug-none">—</span>
      </span>

      <button
        v-if="selSvc.selected.value"
        class="debug-deselect"
        @click="selSvc.clearSelected()"
        title="Clear selection"
      >✕ deselect</button>
    </div>
  </div>
</template>

<style scoped>
.main-view {
  min-height: 100vh;
  background: var(--color-bg-secondary);
  display: flex;
  flex-direction: column;
  /* leave room for the fixed debug bar */
  padding-bottom: 2rem;
}

.app-header {
  padding: 0.5rem 1rem;
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

  max-width: 1400px;
  align-self: center;
}

/* Top row: Autoencoder left, Embedding right */
.top-row {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

/* Autoencoder renders directly on the page — no card wrapper */
.autoencoder-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1 1 auto;
  min-width: 0;
}

.embedding-panel {
  flex: 1 1;
  min-width: 220px;
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

.section-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
}

.secondary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-start;
}

.weight-panel {
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
}

.training-config-panel {
  flex: 0 1 260px;
  min-width: 200px;
}

.training-stats-panel {
  flex: 1 1 300px;
  min-width: 250px;
}

/* ── Selection debug bar ──────────────────────────────── */
.debug-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  height: 1.75rem;
  padding: 0 1rem;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(4px);
  border-top: 1px solid rgba(255,255,255,0.08);
  font-size: 0.7rem;
  font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;
  color: #94a3b8;
  user-select: none;
}

.debug-section {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.debug-label {
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.62rem;
}

.debug-kind {
  color: #e2e8f0;
  font-weight: 600;
}

.debug-coords {
  color: #7dd3fc;
}

.debug-origin {
  color: #64748b;
  font-style: italic;
}

.debug-none {
  color: #334155;
}

.debug-divider {
  color: #334155;
}

.debug-deselect {
  margin-left: auto;
  font-size: 0.65rem;
  font-family: inherit;
  color: #94a3b8;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 3px;
  padding: 0.1rem 0.4rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.debug-deselect:hover {
  background: rgba(255,255,255,0.12);
  color: #e2e8f0;
}
</style>
