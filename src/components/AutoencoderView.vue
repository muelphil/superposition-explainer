<script setup lang="ts">
import { inject, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { AutoencoderServiceType } from '../services/AutoencoderService'
import InputValue from './InputValue.vue'

const svc = inject<AutoencoderServiceType>('autoencoderService')!

// ─── Template refs ────────────────────────────────────────────────────────────
const containerRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGElement | null>(null)

// ─── Neuron refs (arrays of refs by section) ──────────────────────────────────
const inputNeuronRefs = ref<(HTMLElement | null)[]>([])
const embNeuronRefs = ref<(HTMLElement | null)[]>([])
const outputNeuronRefs = ref<(HTMLElement | null)[]>([])

// ─── Computed helpers ─────────────────────────────────────────────────────────

const n = computed(() => svc.config.inputDim)
const m = computed(() => svc.config.embeddingDim)

/** Normalize a value to [0,1] range for coloring, clamped at ±2 */
function normalizeValue(v: number): number {
  return Math.max(-1, Math.min(1, v / 2))
}

/** Map a numeric value to a CSS color interpolating white → orange (pos) or white → blue (neg) */
function neuronColor(v: number): string {
  const t = Math.abs(normalizeValue(v))
  if (v >= 0) {
    // white → orange
    const r = Math.round(255)
    const g = Math.round(255 - t * (255 - 146))
    const b = Math.round(255 - t * (255 - 60))
    return `rgb(${r},${g},${b})`
  } else {
    // white → blue
    const r = Math.round(255 - t * (255 - 96))
    const g = Math.round(255 - t * (255 - 165))
    const b = Math.round(255)
    return `rgb(${r},${g},${b})`
  }
}

/** Scale for input neurons by feature importance */
function neuronScale(i: number): number {
  const imp = svc.featureImportance.value[i] ?? 1
  return 0.6 + imp * 0.4
}

// ─── User input handling ──────────────────────────────────────────────────────

const userInputs = ref<number[]>([])

watch(n, (newN) => {
  userInputs.value = Array.from({ length: newN }, (_, i) => svc.currentInput.value[i] ?? 0)
}, { immediate: true })

watch(() => svc.currentInput.value, (inp) => {
  userInputs.value = [...inp]
}, { deep: true })

function onInputChange(i: number, val: number) {
  userInputs.value[i] = val
  svc.runForward([...userInputs.value])
}

// ─── Add / remove neurons ─────────────────────────────────────────────────────

function addInputNeuron() {
  svc.setInputDim(n.value + 1)
}

function removeInputNeuron() {
  if (n.value > 2) svc.setInputDim(n.value - 1)
}

function addEmbeddingNeuron() {
  if (m.value < n.value - 1) svc.setEmbeddingDim(m.value + 1)
}

function removeEmbeddingNeuron() {
  if (m.value > 1) svc.setEmbeddingDim(m.value - 1)
}

// ─── SVG connection drawing ───────────────────────────────────────────────────

function getCenter(el: HTMLElement | null | undefined): { x: number; y: number } | null {
  if (!el || !containerRef.value) return null
  const elRect = el.getBoundingClientRect()
  const containerRect = containerRef.value.getBoundingClientRect()
  return {
    x: elRect.left - containerRect.left + elRect.width / 2,
    y: elRect.top - containerRect.top + elRect.height / 2,
  }
}

function getRightEdge(el: HTMLElement | null | undefined): { x: number; y: number } | null {
  if (!el || !containerRef.value) return null
  const elRect = el.getBoundingClientRect()
  const containerRect = containerRef.value.getBoundingClientRect()
  return {
    x: elRect.right - containerRect.left,
    y: elRect.top - containerRect.top + elRect.height / 2,
  }
}

function getLeftEdge(el: HTMLElement | null | undefined): { x: number; y: number } | null {
  if (!el || !containerRef.value) return null
  const elRect = el.getBoundingClientRect()
  const containerRect = containerRef.value.getBoundingClientRect()
  return {
    x: elRect.left - containerRect.left,
    y: elRect.top - containerRect.top + elRect.height / 2,
  }
}

/** Cubic bezier path from (x1,y1) to (x2,y2) entering/leaving horizontally */
function bezierPath(
  x1: number, y1: number,
  x2: number, y2: number,
): string {
  const dx = Math.abs(x2 - x1)
  const curve = Math.min(dx * 0.5, 80)
  return `M ${x1} ${y1} C ${x1 + curve} ${y1} ${x2 - curve} ${y2} ${x2} ${y2}`
}

function weightToStroke(w: number): { color: string; width: number; opacity: number } {
  const abs = Math.abs(w)
  const width = 0.5 + abs * 4  // 0.5 to 4.5px
  const opacity = 0.15 + Math.min(abs, 1) * 0.7
  const color = w >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'
  return { color, width, opacity }
}

const svgPaths = ref<string>('')

async function drawConnections() {
  if (!svgRef.value || !containerRef.value) return
  await nextTick()

  const lines: string[] = []
  const W = svc.W.value

  // Helper to spread sources/targets vertically across neuron diameter
  function spreadOffset(idx: number, total: number, diameter: number): number {
    if (total <= 1) return 0
    const spacing = diameter * 0.6 / (total - 1)
    return (idx - (total - 1) / 2) * spacing
  }

  const neuronSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--neuron-size')) || 35

  // ── Encoder: input neurons → embedding neurons ─────────────────────────────
  for (let k = 0; k < m.value; k++) {
    const embEl = embNeuronRefs.value[k]
    const embLeft = getLeftEdge(embEl)
    if (!embLeft) continue

    for (let j = 0; j < n.value; j++) {
      const inEl = inputNeuronRefs.value[j]
      const inRight = getRightEdge(inEl)
      if (!inRight) continue

      const w = W[k]?.[j] ?? 0
      const { color, width, opacity } = weightToStroke(w)

      const spreadSrc = spreadOffset(k, m.value, neuronSize)
      const spreadTgt = spreadOffset(j, n.value, neuronSize)

      const pathSpread = bezierPath(
        inRight.x, inRight.y + spreadSrc,
        embLeft.x, embLeft.y + spreadTgt,
      )

      lines.push(
        `<path d="${pathSpread}" fill="none" stroke="${color}" stroke-width="${width.toFixed(1)}" opacity="${opacity.toFixed(2)}" />`
      )
    }
  }

  // ── Decoder: embedding neurons → output neurons ────────────────────────────
  for (let k = 0; k < m.value; k++) {
    const embEl = embNeuronRefs.value[k]
    const embRight = getRightEdge(embEl)
    if (!embRight) continue

    for (let j = 0; j < n.value; j++) {
      const outEl = outputNeuronRefs.value[j]
      const outLeft = getLeftEdge(outEl)
      if (!outLeft) continue

      // Decoder uses W^T, so weight is W[k][j]
      const w = W[k]?.[j] ?? 0
      const { color, width, opacity } = weightToStroke(w)

      const spreadSrc = spreadOffset(j, n.value, neuronSize)
      const spreadTgt = spreadOffset(k, m.value, neuronSize)

      const pathSpread = bezierPath(
        embRight.x, embRight.y + spreadTgt,
        outLeft.x, outLeft.y + spreadSrc,
      )

      lines.push(
        `<path d="${pathSpread}" fill="none" stroke="${color}" stroke-width="${width.toFixed(1)}" opacity="${opacity.toFixed(2)}" />`
      )
    }
  }

  svgPaths.value = lines.join('\n')
}

// ─── ResizeObserver ───────────────────────────────────────────────────────────

let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  await nextTick()
  drawConnections()

  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => drawConnections())
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

// Redraw when weights change
watch(() => svc.W.value, () => drawConnections(), { deep: true })
watch([n, m], async () => {
  await nextTick()
  drawConnections()
})

// ─── Format helpers ───────────────────────────────────────────────────────────
function fmt(v: number): string {
  return v.toFixed(2)
}
</script>

<template>
  <div class="autoencoder-view" ref="containerRef">
    <!-- SVG overlay for connections -->
    <svg
      ref="svgRef"
      class="connections-svg"
      aria-hidden="true"
      v-html="svgPaths"
    />

    <!-- ── Inputs ─────────────────────────────────────── -->
    <div class="ae-section">
      <h4 class="section-heading">Input</h4>
      <div class="ae-column inputs-column">
        <InputValue
          v-for="(val, i) in userInputs"
          :key="i"
          :modelValue="val"
          :label="`x${i + 1}`"
          @update:modelValue="onInputChange(i, $event)"
        />
      </div>
    </div>

    <!-- ── Input Neurons ──────────────────────────────── -->
    <div class="ae-section">
      <h4 class="section-heading">Encoder</h4>
      <div class="ae-column neurons-column">
        <div
          v-for="(_, i) in n"
          :key="i"
          :ref="(el) => { inputNeuronRefs[i] = el as HTMLElement }"
          class="neuron input-neuron"
          :style="{
            background: neuronColor(svc.currentInput.value[i] ?? 0),
            transform: `scale(${neuronScale(i)})`,
          }"
          :title="`x${i + 1} = ${fmt(svc.currentInput.value[i] ?? 0)}, importance = ${fmt(svc.featureImportance.value[i] ?? 1)}`"
        />
        <!-- Add/Remove buttons for input dim -->
        <div class="neuron-controls">
          <button
            class="neuron-btn add-btn"
            @click="addInputNeuron"
            title="Add input feature"
          >+</button>
          <button
            class="neuron-btn remove-btn"
            @click="removeInputNeuron"
            :disabled="n <= 2"
            title="Remove input feature"
          >−</button>
        </div>
      </div>
    </div>

    <!-- ── Embedding Neurons ──────────────────────────── -->
    <div class="ae-section">
      <h4 class="section-heading">Embedding</h4>
      <div class="ae-column neurons-column embedding-column">
        <div
          v-for="(_, k) in m"
          :key="k"
          :ref="(el) => { embNeuronRefs[k] = el as HTMLElement }"
          class="neuron emb-neuron"
          :style="{ background: neuronColor(svc.currentEmbedding.value[k] ?? 0) }"
          :title="`h${k + 1} = ${fmt(svc.currentEmbedding.value[k] ?? 0)}`"
        >
          <span class="emb-value">{{ fmt(svc.currentEmbedding.value[k] ?? 0) }}</span>
        </div>
        <!-- Add/Remove buttons for embedding dim -->
        <div class="neuron-controls">
          <button
            class="neuron-btn add-btn"
            @click="addEmbeddingNeuron"
            :disabled="m >= n - 1"
            title="Add embedding dimension"
          >+</button>
          <button
            class="neuron-btn remove-btn"
            @click="removeEmbeddingNeuron"
            :disabled="m <= 1"
            title="Remove embedding dimension"
          >−</button>
        </div>
      </div>
    </div>

    <!-- ── Output Neurons ─────────────────────────────── -->
    <div class="ae-section">
      <h4 class="section-heading">Decoder</h4>
      <div class="ae-column neurons-column">
        <div
          v-for="(_, i) in n"
          :key="i"
          :ref="(el) => { outputNeuronRefs[i] = el as HTMLElement }"
          class="neuron output-neuron"
          :style="{ background: neuronColor(svc.currentOutput.value[i] ?? 0) }"
          :title="`x̂${i + 1} = ${fmt(svc.currentOutput.value[i] ?? 0)}`"
        />
      </div>
    </div>

    <!-- ── Outputs ────────────────────────────────────── -->
    <div class="ae-section">
      <h4 class="section-heading">Output</h4>
      <div class="ae-column outputs-column">
        <div
          v-for="(_, i) in n"
          :key="i"
          class="output-value"
        >
          <span class="out-val">{{ fmt(svc.currentOutput.value[i] ?? 0) }}</span>
          <span class="out-err">Δ {{ fmt(svc.currentError.value[i] ?? 0) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.autoencoder-view {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 2.5rem;
  padding: 1.5rem 1.5rem 1.5rem 1rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: visible;
  min-width: 700px;
}

/* SVG overlay */
.connections-svg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

/* Each named section */
.ae-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  z-index: 2;
}

.section-heading {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-title);
  text-align: center;
  height: var(--title-height);
  display: flex;
  align-items: center;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

/* Column of items in a section */
.ae-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--row-gap);
}

/* Neurons */
.neuron {
  width: var(--neuron-size);
  height: var(--neuron-size);
  border-radius: 50%;
  border: 1.5px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;
  flex-shrink: 0;
}

.emb-neuron {
  border-color: var(--color-text-secondary);
}

.emb-value {
  font-size: 0.6rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  font-weight: 600;
  pointer-events: none;
  mix-blend-mode: multiply;
}

/* Add / remove buttons */
.neuron-controls {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.neuron-btn {
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 50%;
  border: 1.5px solid;
  padding: 0;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s;
}

.add-btn {
  border-color: var(--color-add-btn);
  color: var(--color-add-btn);
  background: transparent;
}

.add-btn:hover:not(:disabled) {
  background: var(--color-add-btn);
  color: white;
}

.remove-btn {
  border-color: var(--color-remove-btn);
  color: var(--color-remove-btn);
  background: transparent;
}

.remove-btn:hover:not(:disabled) {
  background: var(--color-remove-btn);
  color: white;
}

.neuron-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  border-color: var(--color-interactive-disabled);
  color: var(--color-interactive-disabled);
}

/* Output values */
.outputs-column {
  min-width: 70px;
}

.output-value {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: var(--neuron-size);
  justify-content: center;
  line-height: 1.2;
}

.out-val {
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  font-weight: 500;
}

.out-err {
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-error);
}
</style>
