<script setup lang="ts">
import { inject, computed } from 'vue'
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

// Reveal helpers — default to true when no VizService (MainView shows everything)
const showEmbeddingPanel = computed(() => vizSvc?.showEmbeddingPanel.value ?? true)
const showCombinedPanel = computed(() => vizSvc?.stageAtLeast('weights-view') ?? true)
const showWeightsTab = computed(() => vizSvc?.stageAtLeast('weights-view') ?? true)
const showTrainingTab = computed(() => vizSvc?.stageAtLeast('training') ?? true)
const showStatsTab = computed(() => vizSvc?.stageAtLeast('training') ?? true)
const showTrainingFooter = computed(() => vizSvc?.stageAtLeast('training') ?? true)

/** Only show tab buttons that are currently revealed */
const visibleTabs = computed(() => {
  const tabs: VizTab[] = []
  if (showTrainingTab.value) tabs.push('training')
  if (showStatsTab.value) tabs.push('statistics')
  if (showWeightsTab.value) tabs.push('weights')
  return tabs
})
</script>

<template>
  <div class="ae-viz">
    <!-- Autoencoder View — no border wrapper -->
    <AutoencoderView :compact="true" />

    <!-- Bottom row: Embedding Space + Combined panel side by side -->
    <div class="ae-bottom-row" v-show="showEmbeddingPanel || showCombinedPanel">
      <!-- Embedding Space -->
      <div class="ae-bottom-section embedding-panel" v-show="showEmbeddingPanel">
        <div class="ae-viz-title">Embedding Space</div>
        <div class="ae-viz-panel panel-embedding">
          <EmbeddingView :disableZoom="true" />
        </div>
      </div>

      <!-- Combined tabbed panel -->
      <div class="ae-bottom-section combined-panel" v-show="showCombinedPanel">
        <div class="tab-bar">
          <button
            v-for="tab in visibleTabs"
            :key="tab"
            class="tab-btn"
            :class="{ active: vizSvc?.activeTab.value === tab }"
            @click="setTab(tab)"
          >
            {{ tab === 'training' ? 'Training' : tab === 'statistics' ? 'Statistics' : 'Weights' }}
          </button>
        </div>

        <div class="ae-viz-panel panel-combined">
          <div class="tab-pane" v-show="visibleTabs.includes('training') && vizSvc?.activeTab.value === 'training'">
            <TrainingConfigView />
          </div>
          <div class="tab-pane tab-pane--flush" v-show="visibleTabs.includes('statistics') && vizSvc?.activeTab.value === 'statistics'">
            <TrainingStatsView />
          </div>
          <div class="tab-pane tab-pane--weights" v-show="visibleTabs.includes('weights') && vizSvc?.activeTab.value === 'weights'">
            <WeightView />
          </div>
        </div>

        <!-- Training controls -->
        <div class="training-footer" v-show="showTrainingFooter">
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
  font-family: var(--font-family-label);
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
  flex: none;
}

/* ── Tabs ──────────────────────────────────────────────── */
.tab-bar {
  font-family: var(--font-family-label);
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
