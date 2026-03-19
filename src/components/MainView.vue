<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { RotateCcw, Play, Square } from 'lucide-vue-next'
import { createAutoencoderService } from '../services/AutoencoderService'
import { createSelectionService } from '../services/SelectionService'
import AutoencoderView from './AutoencoderView.vue'
import EmbeddingView from './embeddingView/EmbeddingView.vue'
import WeightView from './WeightView.vue'
import TrainingConfigView from './TrainingConfigView.vue'
import TrainingStatsView from './TrainingStatsView.vue'

const autoencoderService = createAutoencoderService()
provide('autoencoderService', autoencoderService)

const selSvc = createSelectionService()
provide('selectionService', selSvc)

// ── Combined panel tabs ───────────────────────────────────────
type PanelTab = 'training' | 'statistics' | 'weights'
const activeTab = ref<PanelTab>('training')

// ── Training footer (progress + button) ───────────────────────
const svc = autoencoderService

const progressFrac = computed(() => {
  const done = svc.step.value - svc.trainingStartStep.value
  return Math.min(1, Math.max(0, done / svc.config.trainingSteps))
})
const stepsCompleted = computed(() =>
  Math.max(0, svc.step.value - svc.trainingStartStep.value)
)
const lossDisplay = computed(() => svc.loss.value.toFixed(4))
</script>

<template>
  <div class="main-view">
    <header class="app-header">
      <h1 class="app-title">Superposition Visualization</h1>
    </header>

    <main class="app-content">
      <div class="app-layout">

        <!-- ── Left column: Autoencoder (65%) ─────────────── -->
        <section class="left-col">
          <h2 class="section-title">Autoencoder</h2>
          <AutoencoderView />
        </section>

        <!-- ── Right column: Embedding + Combined panel (35%) -->
        <div class="right-col">

          <!-- Embedding Space -->
          <section class="panel embedding-panel">
            <h2 class="panel-title">Embedding Space</h2>
            <EmbeddingView />
          </section>

          <!-- Combined tabbed panel -->
          <div class="panel combined-panel">

            <!-- Tab bar -->
            <div class="combined-tab-bar">
              <button
                v-for="tab in (['training', 'statistics', 'weights'] as PanelTab[])"
                :key="tab"
                class="combined-tab-btn"
                :class="{ active: activeTab === tab }"
                @click="activeTab = tab"
              >
                {{ tab === 'training' ? 'Training' : tab === 'statistics' ? 'Statistics' : 'Weights' }}
              </button>
            </div>

            <!-- Tab panes — keep all mounted so state is preserved -->
            <div class="tab-pane" v-show="activeTab === 'training'">
              <TrainingConfigView />
            </div>
            <div class="tab-pane" v-show="activeTab === 'statistics'">
              <TrainingStatsView />
            </div>
            <div class="tab-pane tab-pane--weights" v-show="activeTab === 'weights'">
              <WeightView />
            </div>

            <!-- Always-visible training footer -->
            <div class="training-footer">
              <div class="footer-progress">
                <div class="progress-meta">
                  <span class="progress-steps">
                    {{ stepsCompleted.toLocaleString() }} / {{ svc.config.trainingSteps.toLocaleString() }}
                  </span>
                  <span v-if="svc.step.value > 0" class="progress-loss">loss {{ lossDisplay }}</span>
                </div>
                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: `${progressFrac * 100}%` }" />
                </div>
              </div>
              <div class="footer-btns">
                <button
                  class="reset-btn"
                  :disabled="svc.isTraining.value"
                  @click="svc.resetWeights()"
                  title="Re-initialise weights (Xavier normal, bias = 0)"
                ><RotateCcw :size="13" /> Reset</button>
                <button
                  class="train-btn"
                  :class="{ 'train-btn--stop': svc.isTraining.value }"
                  @click="svc.isTraining.value ? svc.stopTraining() : svc.startTraining()"
                >
                  <Square v-if="svc.isTraining.value" :size="13" /> <Play v-else :size="13" />
                  {{ svc.isTraining.value ? 'Stop Training' : 'Start Training' }}
                </button>
              </div>
            </div>

          </div>
        </div>
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

.app-content {
  padding: 1.5rem 2rem;
  flex: 1;
  width: 100%;
  max-width: 1200px;
  align-self: center;
  box-sizing: border-box;
}

/* ── Two-column layout ───────────────────────────────────────── */
.app-layout {
  display: grid;
  grid-template-columns: 65fr 35fr;
  gap: 2rem;
  align-items: flex-start;
}

.left-col {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.right-col {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

/* ── Shared panel style ──────────────────────────────────────── */
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

/* ── Combined panel tabs ─────────────────────────────────────── */
.combined-panel {
  gap: 0;
}

.combined-tab-bar {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  margin: 0 -1.25rem 0.75rem;
  padding: 0 1.25rem;
}

.combined-tab-btn {
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 500;
  font-family: inherit;
  color: var(--color-text-secondary);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  margin-bottom: -1px;
  transition: color 0.12s, border-color 0.12s;
  text-transform: capitalize;
}
.combined-tab-btn:hover {
  color: var(--color-text-primary);
}
.combined-tab-btn.active {
  color: var(--color-interactive);
  border-bottom-color: var(--color-interactive);
}

.tab-pane {
  padding: 0.25rem 0 0.5rem;
}

.tab-pane--weights {
  overflow-x: auto;
}

/* ── Training footer ─────────────────────────────────────────── */
.training-footer {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding-top: 0.75rem;
  margin-top: auto;
  border-top: 1px solid var(--color-border);
}

.footer-progress {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.progress-steps {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-label);
}

.progress-loss {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
}

.progress-track {
  height: 4px;
  background: var(--color-border);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-interactive);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.footer-btns {
  display: flex;
  gap: 0.5rem;
}

.reset-btn {
  flex: 0 0 auto;
  padding: 0.5rem 0.85rem;
  font-size: 0.82rem;
  font-weight: 600;
  font-family: inherit;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s;
  background: #f1f5f9;
  color: #475569;
}
.reset-btn:hover:not(:disabled) { background: #e2e8f0; }
.reset-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.train-btn {
  flex: 1;
  padding: 0.5rem 1rem;
  font-size: 0.88rem;
  font-weight: 600;
  font-family: inherit;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  background: var(--color-interactive);
  color: #fff;
  letter-spacing: 0.02em;
}
.train-btn:hover { background: var(--color-interactive-hover); }
.train-btn--stop { background: #64748b; }
.train-btn--stop:hover { background: #475569; }

/* ── Selection debug bar ─────────────────────────────────────── */
.debug-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
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

.debug-section { display: flex; align-items: center; gap: 0.3rem; }

.debug-label {
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.62rem;
}

.debug-kind   { color: #e2e8f0; font-weight: 600; }
.debug-coords { color: #7dd3fc; }
.debug-origin { color: #64748b; font-style: italic; }
.debug-none   { color: #334155; }
.debug-divider { color: #334155; }

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
