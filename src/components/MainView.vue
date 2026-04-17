<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { Settings } from 'lucide-vue-next'
import { createAutoencoderService } from '../services/AutoencoderService'
import { createSelectionService } from '../services/SelectionService'
import AutoencoderView from './AutoencoderView.vue'
import EmbeddingView from './embeddingView/EmbeddingView.vue'
import WeightView from './WeightView.vue'
import TrainingConfigView from './TrainingConfigView.vue'
import TrainingStatsView from './TrainingStatsView.vue'
import TrainingActionButtons from './TrainingActionButtons.vue'
import SettingsModal from './SettingsModal.vue'
import BlogPost from './BlogPost.vue'
import AppLogo from './AppLogo.vue'
import {ChevronDown} from 'lucide-vue-next'

const autoencoderService = createAutoencoderService()
provide('autoencoderService', autoencoderService)

const selSvc = createSelectionService()
provide('selectionService', selSvc)

// ── Combined panel tabs ───────────────────────────────────────
type PanelTab = 'training' | 'statistics' | 'weights'
const activeTab = ref<PanelTab>('training')

// ── Training footer ────────────────────────────────────────────
const svc = autoencoderService

const showSettings = ref(false)
</script>

<template>
  <div class="main-view">
    <header class="app-header">
      <AppLogo />
      <button class="header-icon-btn" @click="showSettings = true" title="Settings">
        <Settings :size="16" />
      </button>
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
          <div>
            <div class="section-title" style="margin-bottom:10px;">Embedding Space</div>

            <section class="panel embedding-panel">
              <EmbeddingView />
            </section>
          </div>



          <!-- Combined tabbed panel -->
          <div>
            <!-- Tab headers — above the panel, like the Embedding Space title -->
            <div class="combined-tab-bar" style="margin-bottom: 10px; margin-top:6px;">
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

            <div class="panel combined-panel">

              <!-- Tab panes — keep all mounted so state is preserved -->
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

            <!-- Training footer — below the panel -->
            <div class="training-footer">
              <TrainingActionButtons />
            </div>

          </div>
        </div>
      </div>
      <div class="scroll-indicator">
        <span class="label">Guided Introduction</span>
        <ChevronDown class="icon" />
      </div>
    </main>

    <!-- ── Blog post ──────────────────────────────────────── -->
    <div class="blog-section">
      <BlogPost />
    </div>

    <!-- ── Selection debug bar ─────────────────────────────── -->
    <SettingsModal :show="showSettings" @close="showSettings = false" />
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
/* ── Layout variables ────────────────────────────────────────── */
.main-view {
  --header-height: 3.25rem;
  background: var(--color-bg-secondary);
}

.app-header {
  /* position: sticky; */
  position: absolute;
  width: 100%;
  top: 0;
  z-index: 50;
  //height: var(--header-height);
  padding: 1rem 1rem 0;
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0.3rem;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.header-icon-btn:hover {
  color: var(--color-text-primary);
  border-color: var(--color-border);
  background: var(--color-bg-secondary);
}

.app-content {
  height: 100vh;
  padding: var(--header-height) 2rem calc(3 * var(--header-height));
  /* align-content: center; */
  width: 100%;
  max-width: 1200px;
  align-self: center;
  box-sizing: border-box;
  /* center within the page */
  margin: 0 auto;
}

/* ── Two-column layout ───────────────────────────────────────── */
.app-layout {
  display: grid;
  grid-template-columns: 65fr 35fr;
  gap: 2rem;
  height: 100%;
  padding-top: 10%;
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
  display: flex;
  flex-direction: column;
}

/* Strip all padding/gap from the embedding panel — the canvas fills it flush */
.embedding-panel {
  padding: 0;
  gap: 0;
  overflow: hidden;
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
  font-family: var(--font-family-label);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
}

/* ── Combined panel tabs ─────────────────────────────────────── */
.combined-panel {
  /* inherits .panel — no extra overrides needed */
}

.combined-tab-bar {
  font-family: var(--font-family-label);
  display: flex;
  gap: 1rem;
}

.combined-tab-btn {
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
.combined-tab-btn:hover {
  color: var(--color-text-primary);
}
.combined-tab-btn.active {
  color: var(--color-text-secondary);
}

.tab-pane {
  padding: 0.75rem 1rem;
}

.tab-pane--flush {
  padding: 0;
}

.tab-pane--weights {
  overflow-x: auto;
  overflow-y: auto;
  padding: 0.5rem 0.75rem;
}

/* ── Training footer ─────────────────────────────────────────── */
.training-footer {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.75rem;
}

/* ── Blog post section ───────────────────────────────────────── */
.blog-section {
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
}

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
  background: var(--color-debug-bg);
  backdrop-filter: blur(4px);
  border-top: 1px solid var(--color-debug-border);
  font-size: 0.7rem;
  font-family: var(--font-family-mono);
  color: var(--color-debug-text);
  user-select: none;
}

.debug-section { display: flex; align-items: center; gap: 0.3rem; }

.debug-label {
  font-weight: 600;
  color: var(--color-text-action);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.62rem;
}

.debug-kind   { color: var(--color-debug-highlight); font-weight: 600; }
.debug-coords { color: var(--color-debug-coords); }
.debug-origin { color: var(--color-text-action); font-style: italic; }
.debug-none   { color: var(--color-text-strong); }
.debug-divider { color: var(--color-text-strong); }

.debug-deselect {
  margin-left: auto;
  font-size: 0.65rem;
  font-family: inherit;
  color: var(--color-debug-text);
  background: var(--color-debug-btn-bg);
  border: 1px solid var(--color-debug-btn-border);
  border-radius: 3px;
  padding: 0.1rem 0.4rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.debug-deselect:hover {
  background: var(--color-debug-btn-hover);
  color: var(--color-debug-highlight);
}

.scroll-indicator {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translate(-50%, -20px);

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  padding: 6px 10px;
  border-radius: 999px;

  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1;
}
.scroll-indicator .icon {
  width: 16px;
  height: 16px;

  stroke: var(--color-text-secondary);

  animation: scroll-bounce 1.6s ease-in-out infinite;
}
@keyframes scroll-bounce {
  0% {
    transform: translateY(0);
    opacity: 0.5;
  }
  50% {
    transform: translateY(4px);
    opacity: 1;
  }
  100% {
    transform: translateY(0);
    opacity: 0.5;
  }
}

</style>
