<script setup lang="ts">
import { inject } from 'vue'
import type { AutoencoderServiceType } from '../../services/AutoencoderService'
import { VIZ_SERVICE_KEY, type VizServiceType, type VizTab } from '../../services/VizService'
import { TASK_EVENT_BUS_KEY, type TaskEventBus } from './taskSystem'
import AutoencoderView from '../AutoencoderView.vue'
import EmbeddingView from '../embeddingView/EmbeddingView.vue'
import WeightView from '../WeightView.vue'
import TrainingConfigView from '../TrainingConfigView.vue'
import TrainingStatsView from '../TrainingStatsView.vue'
import TrainingActionButtons from '../TrainingActionButtons.vue'

// Service instances are created and provided by AutoencoderSection
const svc = inject<AutoencoderServiceType>('autoencoderService')!

// VizService: centralized tab/chart state (optional — undefined in MainView)
const vizSvc = inject(VIZ_SERVICE_KEY, undefined)
const eventBus = inject(TASK_EVENT_BUS_KEY, undefined)

function setTab(tab: VizTab) {
  if (vizSvc) vizSvc.activeTab.value = tab
  eventBus?.emit('tab-changed', { tab })
}
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
            v-for="tab in (['training', 'statistics', 'weights'] as VizTab[])"
            :key="tab"
            class="tab-btn"
            :class="{ active: vizSvc?.activeTab.value === tab }"
            @click="setTab(tab)"
          >
            {{ tab === 'training' ? 'Training' : tab === 'statistics' ? 'Statistics' : 'Weights' }}
          </button>
        </div>

        <div class="ae-viz-panel">
          <div class="tab-pane" v-show="vizSvc?.activeTab.value === 'training'">
            <TrainingConfigView />
          </div>
          <div class="tab-pane tab-pane--flush" v-show="vizSvc?.activeTab.value === 'statistics'">
            <TrainingStatsView />
          </div>
          <div class="tab-pane tab-pane--weights" v-show="vizSvc?.activeTab.value === 'weights'">
            <WeightView />
          </div>
        </div>

        <!-- Training controls -->
        <div class="training-footer">
          <TrainingActionButtons />
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
  min-height: 0;
  overflow: hidden;
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

.tab-pane { padding: 0.75rem 1rem; }
.tab-pane--flush { padding: 0; }
.tab-pane--weights {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
  padding: 0.5rem 0.75rem;
}

/* ── Training footer ──────────────────────────────────── */
.training-footer {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.75rem;
}
</style>
