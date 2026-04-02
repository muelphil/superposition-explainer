<script setup lang="ts">
import { computed, inject } from 'vue'
import { renderLatexHtml } from '../utils/latex'
import reluIconSvg from '../assets/relu-icon.svg?raw'
import type { SelectionServiceType } from '../services/SelectionService'

const props = defineProps<{
  biasVal:       number
  preActivation: number
  featureIdx:    number
}>()

const selSvc = inject<SelectionServiceType>('selectionService')!

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
const biasLabel      = computed(() => renderLatexHtml(`b_{${props.featureIdx + 1}}`))

/** ReLU clips when pre-activation ≤ 0 */
const reluClipping = computed(() => props.preActivation <= 0)

function onBiasEnter()  { selSvc.setHover({ kind: 'bias', idx: props.featureIdx }, 'autoencoder') }
function onReluEnter()  { selSvc.setHover({ kind: 'relu', idx: props.featureIdx }, 'autoencoder') }
function onIconLeave()  { selSvc.clearHover() }
function onBiasClick()  { selSvc.setSelected({ kind: 'bias', idx: props.featureIdx }, 'autoencoder') }
function onReluClick()  { selSvc.setSelected({ kind: 'relu', idx: props.featureIdx }, 'autoencoder') }
</script>

<template>
  <div class="act-icons">
    <!-- Bias icon: background encodes bias value, label shows b_i -->
    <div
      class="act-icon bias-icon"
      :style="{ background: biasBackground }"
      @mouseenter="onBiasEnter"
      @mouseleave="onIconLeave"
      @click="onBiasClick"
    >
      <span class="bias-label" v-html="biasLabel" />
    </div>

    <!-- ReLU icon: white = passthrough, light blue = clipping -->
    <div
      class="act-icon relu-icon"
      :class="{ 'relu-clipping': reluClipping }"
      @mouseenter="onReluEnter"
      @mouseleave="onIconLeave"
      @click="onReluClick"
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
  z-index: 2;
  cursor: pointer;
}

.act-icon {
  width: 19px;
  height: 19px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

/* ── Bias icon ────────────────────────────────────────────── */
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
  background: #ffffff;
  transition: background 0.2s;
}

.relu-icon.relu-clipping {
  background: #dbeafe;
}

.relu-svg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 11px;
  color: #6b7280;
  pointer-events: none;
}

.relu-svg :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
