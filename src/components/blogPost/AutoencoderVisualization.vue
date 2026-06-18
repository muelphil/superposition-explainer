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
        <div class="label-header">Embedding Space</div>
        <div class="panel panel-embedding">
          <EmbeddingView :disableZoom="true" />
        </div>
      </div>

      <!-- Combined tabbed panel -->
      <div class="ae-bottom-section combined-panel" v-show="showCombinedPanel">
        <div class="tab-bar">
          <button
            v-for="tab in visibleTabs"
            :key="tab"
            class="label-header tab-btn"
            :class="{ active: vizSvc?.activeTab.value === tab }"
            @click="setTab(tab)"
          >
            {{ tab[0].toUpperCase() + tab.slice(1) }}
          </button>
        </div>

        <div class="panel panel-combined">
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
  gap: 0.3rem;
}

.embedding-panel {
  width: 300px;
  flex-shrink: 0;
}

.combined-panel {
  flex: 1;
  min-width: 200px;
}

.panel-embedding {
  padding: 0;
  gap: 0;
  overflow: hidden;
  flex: none;
}

.panel-combined {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* ── Tab pane overrides for blog context ──────────────── */
.tab-pane--weights {
  flex: 1;
  min-height: 0;
}
</style>
