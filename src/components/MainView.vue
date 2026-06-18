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
      <div class="app-container">

        <div class="app-layout">

          <!-- ── Left column: Autoencoder (65%) ─────────────── -->
          <section class="left-col">
            <h2 class="label-header">Autoencoder</h2>
            <AutoencoderView />
          </section>

          <!-- ── Right column: Embedding + Combined panel (35%) -->
          <div class="right-col">

            <!-- Embedding Space -->
            <div class="spaced-col">
              <h2 class="label-header">Embedding Space</h2>

              <section class="panel embedding-panel">
                <EmbeddingView />
              </section>
            </div>



            <!-- Combined tabbed panel -->
            <div class="spaced-col">
              <!-- Tab headers — above the panel, like the Embedding Space title -->
              <div class="tab-bar">
                <button
                  v-for="tab in (['training', 'statistics', 'weights'] as PanelTab[])"
                  :key="tab"
                  class="label-header tab-btn"
                  :class="{ active: activeTab === tab }"
                  @click="activeTab = tab"
                >
                  {{ tab[0].toUpperCase() + tab.slice(1) }}
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
  </div>
</template>

<style>
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
  /* height: var(--header-height); */
  /* padding: 1rem 1rem 0; */
  background: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;

  padding: 1rem 1rem;
  max-width: 1340px;
  margin: 0 auto;
  justify-self: center;

}

.header-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
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
  min-height: 100vh;
  padding: var(--header-height) 2rem 3rem;
  padding-bottom: 10px;
  width: 100%;
  max-width: 1200px;
  box-sizing: border-box;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

/* ── Vertical placement grid ──────────────────────────────────── */
.app-container {
  display: grid;
  grid-template-rows: 1fr auto 2fr;
  flex-grow: 1;
}

/* ── Content area (row 2) ────────────────────────────────────── */
.app-layout {
  grid-row: 2;
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

/* Strip all padding/gap from the embedding panel — the canvas fills it flush */
.embedding-panel {
  padding: 0;
  gap: 0;
  overflow: hidden;
}

/* ── Blog post section ───────────────────────────────────────── */
.blog-section {
  background: var(--color-bg);
  border-top: 1px solid var(--color-border);
}

.scroll-indicator {
  position: sticky;
  bottom: 0.25rem;
  align-self: center;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  padding: 6px 10px;
  border-radius: var(--radius-full);

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
