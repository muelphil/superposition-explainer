<script setup lang="ts">
import { inject, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { AutoencoderServiceType } from '../services/AutoencoderService'
import { INPUT_DIM_MIN, INPUT_DIM_MAX, EMB_DIM_MIN, EMB_DIM_MAX } from '../services/AutoencoderService'
import InputValue from './InputValue.vue'

const svc = inject<AutoencoderServiceType>('autoencoderService')!

// ─── Template refs ────────────────────────────────────────────────────────────
const containerRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGElement | null>(null)

const inputNeuronRefs = ref<(HTMLElement | null)[]>([])
const embNeuronRefs = ref<(HTMLElement | null)[]>([])
const outputNeuronRefs = ref<(HTMLElement | null)[]>([])

// ─── Dimensions ───────────────────────────────────────────────────────────────
const n = computed(() => svc.config.inputDim)
const m = computed(() => svc.config.embeddingDim)

// Dynamic grid template rows: header row + n data rows + controls row
const gridTemplateRows = computed(
  () => `auto repeat(${n.value}, var(--row-height)) auto`
)

// Row index helpers (1-based for CSS grid)
const dataRowStart = 2
const dataRowEnd = computed(() => n.value + 2)   // exclusive end for span
const controlsRow = computed(() => n.value + 2)

// ─── Color helpers ────────────────────────────────────────────────────────────
function normalizeVal(v: number): number {
  return Math.max(-1, Math.min(1, v / 2))
}

function neuronColor(v: number): string {
  const t = Math.abs(normalizeVal(v))
  if (v >= 0) {
    const g = Math.round(255 - t * (255 - 146))
    const b = Math.round(255 - t * (255 - 60))
    return `rgb(255,${g},${b})`
  } else {
    const r = Math.round(255 - t * (255 - 96))
    const g = Math.round(255 - t * (255 - 165))
    return `rgb(${r},${g},255)`
  }
}

function neuronScale(i: number): number {
  const imp = svc.featureImportance.value[i] ?? 1
  return 0.6 + imp * 0.4
}

// ─── User input ───────────────────────────────────────────────────────────────
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

// ─── Add / remove ─────────────────────────────────────────────────────────────
function addInputNeuron()      { svc.setInputDim(n.value + 1) }
function removeInputNeuron()   { svc.setInputDim(n.value - 1) }
function addEmbeddingNeuron()  { svc.setEmbeddingDim(m.value + 1) }
function removeEmbeddingNeuron() { svc.setEmbeddingDim(m.value - 1) }

const canAddInput    = computed(() => n.value < INPUT_DIM_MAX && !svc.isTraining.value)
const canRemoveInput = computed(() => n.value > INPUT_DIM_MIN && !svc.isTraining.value)
const canAddEmb      = computed(() => m.value < EMB_DIM_MAX && !svc.isTraining.value)
const canRemoveEmb   = computed(() => m.value > EMB_DIM_MIN && !svc.isTraining.value)

// ─── SVG connections ──────────────────────────────────────────────────────────
function getRightEdge(el: HTMLElement | null | undefined) {
  if (!el || !containerRef.value) return null
  const er = el.getBoundingClientRect()
  const cr = containerRef.value.getBoundingClientRect()
  return { x: er.right - cr.left, y: er.top - cr.top + er.height / 2 }
}

function getLeftEdge(el: HTMLElement | null | undefined) {
  if (!el || !containerRef.value) return null
  const er = el.getBoundingClientRect()
  const cr = containerRef.value.getBoundingClientRect()
  return { x: er.left - cr.left, y: er.top - cr.top + er.height / 2 }
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const curve = Math.min(Math.abs(x2 - x1) * 0.5, 80)
  return `M ${x1} ${y1} C ${x1 + curve} ${y1} ${x2 - curve} ${y2} ${x2} ${y2}`
}

function weightStyle(w: number): { color: string; width: number; opacity: number } {
  const abs = Math.abs(w)
  return {
    color: w >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
    width: 0.5 + Math.min(abs, 1.5) * 3,
    opacity: 0.15 + Math.min(abs, 1) * 0.65,
  }
}

function spreadOffset(idx: number, total: number, diameter: number): number {
  if (total <= 1) return 0
  return (idx - (total - 1) / 2) * (diameter * 0.55 / Math.max(total - 1, 1))
}

const svgPaths = ref('')

async function drawConnections() {
  if (!svgRef.value || !containerRef.value) return
  await nextTick()

  const W = svc.W.value
  const neuronDiam = 36   // approx --neuron-size in px (2.2rem @ 17px base ≈ 37px)
  const lines: string[] = []

  // Encoder: input neurons → embedding neurons
  for (let k = 0; k < m.value; k++) {
    const embLeft = getLeftEdge(embNeuronRefs.value[k])
    if (!embLeft) continue
    for (let j = 0; j < n.value; j++) {
      const inRight = getRightEdge(inputNeuronRefs.value[j])
      if (!inRight) continue
      const w = W[k]?.[j] ?? 0
      const { color, width, opacity } = weightStyle(w)
      const sy = inRight.y + spreadOffset(k, m.value, neuronDiam)
      const ty = embLeft.y + spreadOffset(j, n.value, neuronDiam)
      lines.push(
        `<path d="${bezierPath(inRight.x, sy, embLeft.x, ty)}" fill="none" stroke="${color}" stroke-width="${width.toFixed(1)}" opacity="${opacity.toFixed(2)}" />`
      )
    }
  }

  // Decoder: embedding neurons → output neurons
  for (let k = 0; k < m.value; k++) {
    const embRight = getRightEdge(embNeuronRefs.value[k])
    if (!embRight) continue
    for (let j = 0; j < n.value; j++) {
      const outLeft = getLeftEdge(outputNeuronRefs.value[j])
      if (!outLeft) continue
      const w = W[k]?.[j] ?? 0
      const { color, width, opacity } = weightStyle(w)
      const sy = embRight.y + spreadOffset(j, n.value, neuronDiam)
      const ty = outLeft.y + spreadOffset(k, m.value, neuronDiam)
      lines.push(
        `<path d="${bezierPath(embRight.x, sy, outLeft.x, ty)}" fill="none" stroke="${color}" stroke-width="${width.toFixed(1)}" opacity="${opacity.toFixed(2)}" />`
      )
    }
  }

  svgPaths.value = lines.join('\n')
}

let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  await nextTick()
  drawConnections()
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => drawConnections())
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => resizeObserver?.disconnect())

watch(() => svc.W.value, () => drawConnections(), { deep: true })
watch([n, m], async () => { await nextTick(); drawConnections() })

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number): string { return v.toFixed(2) }
function isNonZero(v: number): boolean { return Math.abs(v) > 0.005 }
function absErr(v: number): string { return Math.abs(v).toFixed(2) }

const currentLoss = computed(() => {
  const x = svc.currentInput.value
  const xHat = svc.currentOutput.value
  const imp = svc.featureImportance.value
  return x.reduce((sum, xi, i) => sum + (imp[i] ?? 1) * (xi - (xHat[i] ?? 0)) ** 2, 0)
})
</script>

<template>
  <div
    class="ae-grid"
    ref="containerRef"
    :style="{ gridTemplateRows }"
  >
    <!-- SVG overlay -->
    <svg
      ref="svgRef"
      class="connections-svg"
      aria-hidden="true"
      v-html="svgPaths"
    />

    <!-- ── Column headings (row 1) ───────────────────────── -->
    <div class="col-heading" style="grid-column: 1; grid-row: 1">Input</div>
    <div class="col-heading" style="grid-column: 3; grid-row: 1">Encoder</div>
    <div class="col-heading" style="grid-column: 5; grid-row: 1">Embedding</div>
    <div class="col-heading" style="grid-column: 7; grid-row: 1">Decoder</div>
    <div class="col-heading" style="grid-column: 9; grid-row: 1">Output</div>

    <!-- ── Per-feature rows (rows 2 … n+1) ───────────────── -->
    <template v-for="(_, i) in n" :key="i">
      <!-- Input value: col 1 -->
      <InputValue
        :modelValue="userInputs[i] ?? 0"
        :label="`x${i + 1}`"
        :disabled="svc.isTraining.value"
        @update:modelValue="onInputChange(i, $event)"
        :style="{ gridColumn: '1', gridRow: String(i + dataRowStart) }"
      />

      <!-- Input neuron: col 3 -->
      <div
        :ref="(el) => { inputNeuronRefs[i] = el as HTMLElement }"
        class="neuron"
        :style="{
          gridColumn: '3',
          gridRow: String(i + dataRowStart),
          background: neuronColor(svc.currentInput.value[i] ?? 0),
          transform: `scale(${neuronScale(i)})`,
        }"
        :title="`x${i + 1} = ${fmt(svc.currentInput.value[i] ?? 0)}, importance = ${fmt(svc.featureImportance.value[i] ?? 1)}`"
      />

      <!-- Output neuron: col 7 -->
      <div
        :ref="(el) => { outputNeuronRefs[i] = el as HTMLElement }"
        class="neuron"
        :style="{
          gridColumn: '7',
          gridRow: String(i + dataRowStart),
          background: neuronColor(svc.currentOutput.value[i] ?? 0),
        }"
        :title="`x̂${i + 1} = ${fmt(svc.currentOutput.value[i] ?? 0)}`"
      />

      <!-- Output value: col 9 -->
      <div
        class="output-value"
        :style="{ gridColumn: '9', gridRow: String(i + dataRowStart) }"
      >
        <span class="out-val">{{ fmt(svc.currentOutput.value[i] ?? 0) }}</span>
        <span class="out-err" :class="{ zero: !isNonZero(svc.currentError.value[i] ?? 0) }">
          {{ absErr(svc.currentError.value[i] ?? 0) }}
        </span>
      </div>
    </template>

    <!-- ── Embedding column: col 5, spans all data rows ──── -->
    <div
      class="emb-column"
      :style="{
        gridColumn: '5',
        gridRow: `${dataRowStart} / ${dataRowEnd}`,
      }"
    >
      <div class="emb-neurons">
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
      </div>
    </div>

    <!-- ── Controls row ───────────────────────────────────── -->
    <div
      class="controls-row"
      :style="{ gridColumn: '3', gridRow: String(controlsRow) }"
    >
      <button class="dim-btn add" @click="addInputNeuron" :disabled="!canAddInput" title="Add input feature">+</button>
      <button class="dim-btn rem" @click="removeInputNeuron" :disabled="!canRemoveInput" title="Remove input feature">−</button>
    </div>

    <div
      class="controls-row"
      :style="{ gridColumn: '5', gridRow: String(controlsRow) }"
    >
      <button class="dim-btn add" @click="addEmbeddingNeuron" :disabled="!canAddEmb" title="Add embedding dim">+</button>
      <button class="dim-btn rem" @click="removeEmbeddingNeuron" :disabled="!canRemoveEmb" title="Remove embedding dim">−</button>
    </div>
    <!-- ── Total weighted loss (output column, controls row) ─── -->
    <div
      class="total-loss"
      :style="{ gridColumn: '9', gridRow: String(controlsRow) }"
    >
      <span class="total-loss-label">L</span>
      <span class="total-loss-val" :class="{ zero: !isNonZero(currentLoss) }">{{ currentLoss.toFixed(3) }}</span>
    </div>
  </div>
</template>

<style scoped>
/* ── Main grid ────────────────────────────────────────────── */
/*
 * 9-column layout with explicit spacer columns:
 * col 1  [inputs]        content
 * col 2  [gap-s-left]    tight gap — input values ↔ input neurons
 * col 3  [input-neurons] content
 * col 4  [gap-conn-l]    wide gap — SVG connections space
 * col 5  [embedding]     content
 * col 6  [gap-conn-r]    wide gap — SVG connections space
 * col 7  [output-neurons]content
 * col 8  [gap-s-right]   tight gap — output neurons ↔ output values
 * col 9  [outputs]       content
 */
.ae-grid {
  position: relative;
  display: grid;

  grid-template-columns:
    [inputs]          90px
    [gap-s-left]      1.2rem
    [input-neurons]   var(--neuron-size)
    [gap-conn-l]      1fr
    [embedding]       calc(var(--neuron-size) * 1.4)
    [gap-conn-r]      1fr
    [output-neurons]  var(--neuron-size)
    [gap-s-right]     1.2rem
    [outputs]         82px;
  column-gap: 0;
  row-gap: var(--row-gap);
  align-items: center;
  justify-content: space-around;
  justify-items: center;
  --row-height: 72px;
  padding: 0.25rem 0;
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

/* Column headings */
.col-heading {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-title);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding-bottom: 0.25rem;
  align-self: end;
  z-index: 2;
}

/* ── Neurons ──────────────────────────────────────────────── */
.neuron {
  width: var(--neuron-size);
  height: var(--neuron-size);
  border-radius: 50%;
  border: 2px solid #9ca3af;   /* gray-400: clearly visible even on white bg */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.emb-neuron {
  border-color: #6b7280;  /* gray-500 for slightly more prominent embedding neurons */
}

.emb-value {
  font-size: 0.58rem;
  font-variant-numeric: tabular-nums;
  color: #374151;
  font-weight: 700;
  pointer-events: none;
  text-shadow: 0 0 3px rgba(255,255,255,0.8);
}

/* ── Embedding column (spans all data rows) ───────────────── */
.emb-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  align-self: stretch;   /* override grid's align-items: center — must fill full height */
  z-index: 2;
}

.emb-neurons {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
  height: 100%;
  width: 100%;
}

/* ── Output values ────────────────────────────────────────── */
.output-value {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  z-index: 2;
}

.out-val {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.out-err {
  font-size: 0.75rem;
  color: var(--color-error);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.out-err.zero {
  color: #d1d5db; /* light grey */
}

/* ── Dimension controls ───────────────────────────────────── */
.controls-row {
  display: flex;
  gap: 5px;
  z-index: 2;
  padding-top: 4px;
}

.dim-btn {
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  border: 1px solid #d1d5db;
  padding: 0;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.15s, background 0.15s;
}

.dim-btn.add {
  background: #f1f5f9;   /* slate-100 */
  color: #64748b;        /* slate-500 */
}

.dim-btn.add:hover:not(:disabled) {
  background: #e2e8f0;   /* slate-200 */
}

.dim-btn.rem {
  background: #f1f5f9;   /* slate-100 */
  color: #64748b;        /* slate-500 */
}

.dim-btn.rem:hover:not(:disabled) {
  background: #e2e8f0;   /* slate-200 */
}

.dim-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ── Total weighted loss ──────────────────────────────────── */
.total-loss {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  z-index: 2;
}

.total-loss-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.total-loss-val {
  font-size: 0.85rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-error);
}

.total-loss-val.zero {
  color: #d1d5db; /* light grey */
}
</style>
