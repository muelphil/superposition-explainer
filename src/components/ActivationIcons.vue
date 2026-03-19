<script setup lang="ts">
import { computed } from 'vue'
import { renderLatexHtml } from '../utils/latex'
import reluIconSvg from '../assets/relu-icon.svg?raw'

const props = defineProps<{
  biasVal:        number
  preActivation:  number
}>()

/** Same colour scale as WeightView — positive→orange, negative→blue, zero→white */
function valColor(val: number): string {
  const t = Math.max(-1, Math.min(1, val))
  let r: number, g: number, b: number
  if (t >= 0) {
    r = Math.round(255 + (249 - 255) * t)
    g = Math.round(255 + (115 - 255) * t)
    b = Math.round(255 + (22  - 255) * t)
  } else {
    const s = -t
    r = Math.round(255 + (59  - 255) * s)
    g = Math.round(255 + (130 - 255) * s)
    b = Math.round(255 + (246 - 255) * s)
  }
  return `rgb(${r},${g},${b})`
}

const biasBackground = computed(() => valColor(props.biasVal))

/** opacity 0.5 when ReLU is a no-op (pre > 0), 1.0 when it clips (pre ≤ 0) */
const reluOpacity = computed(() => props.preActivation > 0 ? 0.5 : 1.0)
</script>

<template>
  <div class="act-icons">
    <!-- Bias icon -->
    <div
      class="act-icon bias-icon"
      :style="{ background: biasBackground }"
      :title="`bias b = ${biasVal.toFixed(3)}`"
    >
      <span class="bias-label" v-html="renderLatexHtml('b')" />
    </div>

    <!-- ReLU icon -->
    <div
      class="act-icon relu-icon"
      :style="{ opacity: reluOpacity }"
      :title="preActivation > 0
        ? `ReLU: active (pre = ${preActivation.toFixed(3)})`
        : `ReLU: clipped (pre = ${preActivation.toFixed(3)})`"
    >
      <span class="relu-svg" v-html="reluIconSvg" />
    </div>
  </div>
</template>

<style scoped>
.act-icons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.act-icon {
  width: 26px;
  height: 26px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.2s;
  overflow: hidden;
}

/* ── Bias icon ────────────────────────────────────────────── */
.bias-icon {
  /* background set via inline style */
}

.bias-label {
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  line-height: 1;
}

.bias-label :deep(.katex) {
  font-size: 0.75rem;
  color: #374151;
}

/* ── ReLU icon ────────────────────────────────────────────── */
.relu-icon {
  background: #f8fafc;
}

.relu-svg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 14px;
  color: #6b7280;
  pointer-events: none;
}

.relu-svg :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
