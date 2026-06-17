<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createAutoencoderService } from '../../services/AutoencoderService'
import { createSelectionService } from '../../services/SelectionService'
import EmbeddingView from '../embeddingView/EmbeddingView.vue'

const N = 5
const B = -0.2
const OFFSET_ANGLE = Math.PI / 6

// 5 unit vectors at 72-degree intervals in 2D, rotated by 30° so the central vector points upward
// W[k][i]: k = embedding row (0..1), i = feature column (0..4)
const W: number[][] = [[], []]
for (let i = 0; i < N; i++) {
  const angle = OFFSET_ANGLE + 2 * Math.PI * i / N
  W[0][i] = Math.cos(angle)
  W[1][i] = Math.sin(angle)
}
const b: number[] = Array(N).fill(B)

const svc = createAutoencoderService()
svc.config.inputDim = N
svc.config.embeddingDim = 2

// Override W and b after initialization
svc.W.value = W
svc.b.value = b

// Set input to unit vector for feature 0 so overlay shows correct embedding
const unitInput: number[] = Array(N).fill(0)
unitInput[0] = 1
svc.currentInput.value = unitInput
svc.currentEmbedding.value = [W[0][0], W[1][0]]

const selSvc = createSelectionService()
selSvc.setSelected({ kind: 'output', idx: 0 }, 'embedding')
</script>

<template>
  <div class="interference-illustration">
    <EmbeddingView
      :autoencoderService="svc"
      :selectionService="selSvc"
      static-mode
      full-output-overlay
    />
  </div>
</template>

<style scoped>
.interference-illustration {
  width: 100%;
}
</style>
