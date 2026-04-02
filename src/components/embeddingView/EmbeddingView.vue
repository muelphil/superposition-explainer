<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { Compass } from 'lucide-vue-next'
import type { AutoencoderServiceType } from '../../services/AutoencoderService'
import type { SelectionServiceType } from '../../services/SelectionService'
import { useEmbeddingScene } from './useEmbeddingScene'
import EmbeddingLegend from './EmbeddingLegend.vue'

const svc    = inject<AutoencoderServiceType>('autoencoderService')!
const selSvc = inject<SelectionServiceType>('selectionService')!

const containerRef = ref<HTMLDivElement   | null>(null)
const canvasRef    = ref<HTMLCanvasElement | null>(null)

const { onMouseMove, onMouseLeave, onCanvasMouseDown, onCanvasClick, resetCamera } =
  useEmbeddingScene(canvasRef, containerRef, svc, selSvc)

const inputDim = computed(() => svc.config.inputDim)
</script>

<template>
  <div ref="containerRef" class="emb-root">
    <canvas
      ref="canvasRef"
      class="emb-canvas"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
      @mousedown="onCanvasMouseDown"
      @click="onCanvasClick"
    />


    <!-- Camera reset — upper right -->
    <button
      class="camera-reset-btn"
      title="Reset camera"
      @click="resetCamera"
    >
      <Compass :size="14" />
    </button>

    <!-- Legend — center bottom overlay -->
    <div class="legend-overlay">
      <div class="legend-pill">
        <EmbeddingLegend :inputDim="inputDim" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.emb-root {
  position: relative;
}

.emb-canvas {
  width: 100%;
  aspect-ratio: 1;
  display: block;
  cursor: grab;
  border-radius: inherit;
}
.emb-canvas:active { cursor: grabbing; }



/* ── Legend overlay — center bottom ─────────────────────────── */
.legend-overlay {
  position: absolute;
  bottom: 0.65rem;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.legend-pill {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  padding: 0.2rem 0.65rem;
  pointer-events: auto;
}

/* ── Camera reset — upper right ─────────────────────────────── */
.camera-reset-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.15s;
  z-index: 2;
}
.camera-reset-btn:hover {
  color: var(--color-text-primary);
}
</style>
