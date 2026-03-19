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
    <button
      class="camera-reset-btn"
      title="Reset camera"
      @click="resetCamera"
    >
      <Compass :size="14" />
    </button>
    <EmbeddingLegend :inputDim="inputDim" />
  </div>
</template>

<style scoped>
.emb-root {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  position: relative;
}

.emb-canvas {
  width: 100%;
  aspect-ratio: 1;
  display: block;
  cursor: grab;
  border-radius: 4px;
  border: 1px solid grey;
}
.emb-canvas:active { cursor: grabbing; }

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
  color: var(--color-text-secondary, #94a3b8);
  cursor: pointer;
  transition: color 0.15s;
}
.camera-reset-btn:hover {
  color: var(--color-text, #334155);
}
</style>
