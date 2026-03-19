<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import type { AutoencoderServiceType } from '../../services/AutoencoderService'
import type { SelectionServiceType } from '../../services/SelectionService'
import { useEmbeddingScene } from './useEmbeddingScene'
import EmbeddingLegend from './EmbeddingLegend.vue'

const svc    = inject<AutoencoderServiceType>('autoencoderService')!
const selSvc = inject<SelectionServiceType>('selectionService')!

const containerRef = ref<HTMLDivElement   | null>(null)
const canvasRef    = ref<HTMLCanvasElement | null>(null)

const { onMouseMove, onMouseLeave, onCanvasMouseDown, onCanvasClick } =
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
</style>
