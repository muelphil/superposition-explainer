<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { RotateCcw, Play, Square } from 'lucide-vue-next'
import type { AutoencoderServiceType } from '../../services/AutoencoderService'
import AutoencoderView from '../AutoencoderView.vue'
import EmbeddingView from '../embeddingView/EmbeddingView.vue'
import WeightView from '../WeightView.vue'
import TrainingConfigView from '../TrainingConfigView.vue'
import TrainingStatsView from '../TrainingStatsView.vue'

// Service instances are created and provided by AutoencoderSection
const svc = inject<AutoencoderServiceType>('autoencoderService')!

// Tabbed panel state
type PanelTab = 'training' | 'statistics' | 'weights'
const activeTab = ref<PanelTab>('training')

const lossDisplay = computed(() => svc.loss.value.toFixed(4))
</script>

<template>
  <div class="ae-viz">
    <!-- Autoencoder View — no border wrapper -->
    <AutoencoderView :compact="true" />

    <!-- Bottom row: Embedding Space + Combined panel side by side -->
    <div class="ae-bottom-row">
      <!-- Embedding Space -->
      <div class="ae-bottom-section embedding-panel">
        <div class="ae-viz-title">Embedding Space</div>
        <div class="ae-viz-panel panel-embedding">
          <EmbeddingView />
        </div>
      </div>

      <!-- Combined tabbed panel -->
      <div class="ae-bottom-section combined-panel">
        <div class="tab-bar">
          <button
            v-for="tab in (['training', 'statistics', 'weights'] as PanelTab[])"
            :key="tab"
            class="tab-btn"
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab"
          >
            {{ tab === 'training' ? 'Training' : tab === 'statistics' ? 'Statistics' : 'Weights' }}
          </button>
        </div>

        <div class="ae-viz-panel">
          <div class="tab-pane" v-show="activeTab === 'training'">
            <TrainingConfigView />
          </div>
          <div class="tab-pane tab-pane--flush" v-show="activeTab === 'statistics'">
            <TrainingStatsView />
          </div>
          <div class="tab-pane tab-pane--weights" v-show="activeTab === 'weights'">
            <WeightView />
          </div>
        </div>

        <!-- Training controls -->
        <div class="training-footer">
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
</template>

<style scoped>
.ae-viz {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ── Bottom row: Embedding + Combined side by side ────── */
.ae-bottom-row {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
}

.ae-bottom-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.embedding-panel {
  width: 300px;
  flex-shrink: 0;
}

.combined-panel {
  flex: 1;
  min-width: 200px;
}

.ae-viz-title {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.ae-viz-panel {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.panel-embedding {
  padding: 0;
  gap: 0;
  overflow: hidden;
}

/* ── Tabs ──────────────────────────────────────────────── */
.tab-bar {
  display: flex;
  gap: 1rem;
}

.tab-btn {
  font-size: 0.82rem;
  font-weight: 700;
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-tertiary);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: color 0.12s;
}
.tab-btn:hover { color: var(--color-text-primary); }
.tab-btn.active { color: var(--color-text-secondary); }

.tab-pane { padding: 1rem 1.25rem; }
.tab-pane--flush { padding: 0; }
.tab-pane--weights { overflow-x: auto; }

/* ── Training footer ──────────────────────────────────── */
.training-footer {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.75rem;
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
  background: var(--color-bg-subtle);
  color: var(--color-text-action-hover);
}
.reset-btn:hover:not(:disabled) { background: var(--color-bg-hover); }
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
  color: var(--color-bg);
  letter-spacing: 0.02em;
}
.train-btn:hover { background: var(--color-interactive-hover); }
.train-btn--stop { background: var(--color-text-action); }
.train-btn--stop:hover { background: var(--color-text-action-hover); }
</style>
