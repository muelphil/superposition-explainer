<script setup lang="ts">
import { computed, inject } from 'vue'
import { valColorRgb } from '../utils/featureColor'
import reluIconSvg from '../assets/relu-icon.svg?raw'
import type { SelectionServiceType } from '../services/SelectionService'

const props = defineProps<{
  biasVal:       number
  preActivation: number
  featureIdx:    number
}>()

const selSvc = inject<SelectionServiceType>('selectionService')!

/** Same colour scale as WeightView — positive→orange, negative→blue, zero→white */

const biasBackground = computed(() => valColorRgb(props.biasVal))

/** ReLU clips when pre-activation ≤ 0 */
const reluClipping = computed(() => props.preActivation <= 0)

function onBiasEnter()  { selSvc.setHover({ kind: 'bias', idx: props.featureIdx }, 'autoencoder') }
function onReluEnter()  { selSvc.setHover({ kind: 'relu', idx: props.featureIdx }, 'autoencoder') }
function onIconLeave()  { selSvc.clearHover() }
</script>

<template>
  <div class="act-icons">
    <!-- Bias icon: background encodes bias value, label shows b_i -->
    <div
      class="act-icon bias-icon"
      :style="{ background: biasBackground }"
      @mouseenter="onBiasEnter"
      @mouseleave="onIconLeave"
    >
      <span class="bias-label" v-katex="`b_{${props.featureIdx + 1}}`" />
    </div>

    <!-- ReLU icon: white = passthrough, light blue = clipping -->
    <div
      class="act-icon relu-icon"
      :class="{ 'relu-clipping': reluClipping }"
      @mouseenter="onReluEnter"
      @mouseleave="onIconLeave"
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
  border: 1px solid var(--color-interactive-disabled);
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
  color: var(--color-text-primary);
}

/* ── ReLU icon ────────────────────────────────────────────── */
.relu-icon {
  background: var(--color-bg);
  transition: background 0.2s;
}

.relu-icon.relu-clipping {
  background: var(--color-bg-activation);
}

.relu-svg {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 11px;
  color: var(--color-text-label);
  pointer-events: none;
}

.relu-svg :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
