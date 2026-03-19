<script setup lang="ts">
import { inject, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import type { AutoencoderServiceType } from '../services/AutoencoderService'
import { INPUT_DIM_MIN, INPUT_DIM_MAX, EMB_DIM_MIN, EMB_DIM_MAX } from '../services/AutoencoderService'
import type { SelectionServiceType } from '../services/SelectionService'
import InputValue from './InputValue.vue'

const svc    = inject<AutoencoderServiceType>('autoencoderService')!
const selSvc = inject<SelectionServiceType>('selectionService')!

// ─── Template refs ────────────────────────────────────────────────────────────
const containerRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGElement | null>(null)

const inputNeuronRefs  = ref<(HTMLElement | null)[]>([])
const embNeuronRefs    = ref<(HTMLElement | null)[]>([])
const outputNeuronRefs = ref<(HTMLElement | null)[]>([])

// ─── Dimensions ───────────────────────────────────────────────────────────────
const n = computed(() => svc.config.inputDim)
const m = computed(() => svc.config.embeddingDim)

// Row 1: headers, Row 2: sub-header controls/info, Rows 3…n+2: data rows
const gridTemplateRows = computed(
  () => `auto auto repeat(${n.value}, var(--row-height))`
)

const dataRowStart = 3
const dataRowEnd   = computed(() => n.value + 3)

// ─── Color helpers ────────────────────────────────────────────────────────────
function neuronColor(v: number): string {
  const t = Math.abs(Math.max(-1, Math.min(1, v / 2)))
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

/** Scale so that neuron AREA ∝ importance (area = π r² → r ∝ √imp → scale ∝ √imp) */
function neuronScale(i: number): number {
  const imp = svc.featureImportance.value[i] ?? 1
  return Math.max(0.4, Math.sqrt(imp))
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
function addInputNeuron()        { svc.setInputDim(n.value + 1) }
function removeInputNeuron()     { svc.setInputDim(n.value - 1) }
function addEmbeddingNeuron()    { svc.setEmbeddingDim(m.value + 1) }
function removeEmbeddingNeuron() { svc.setEmbeddingDim(m.value - 1) }

const canAddInput    = computed(() => n.value < INPUT_DIM_MAX && !svc.isTraining.value)
const canRemoveInput = computed(() => n.value > INPUT_DIM_MIN && !svc.isTraining.value)
const canAddEmb      = computed(() => m.value < EMB_DIM_MAX   && !svc.isTraining.value)
const canRemoveEmb   = computed(() => m.value > EMB_DIM_MIN   && !svc.isTraining.value)

// ─── SVG connections ──────────────────────────────────────────────────────────

interface SvgPath {
  d:       string
  color:   string
  width:   number
  opacity: number
  row:     number
  col:     number
}

interface NeuronClip {
  cx: number
  cy: number
  r:  number
}

const svgPathsData = ref<SvgPath[]>([])
const neuronClips  = ref<NeuronClip[]>([])

/** Returns the center position + radius of a neuron element in SVG/container coordinates. */
function getNeuronInfo(el: HTMLElement | null | undefined): NeuronClip | null {
  if (!el || !containerRef.value) return null
  const er = el.getBoundingClientRect()
  const cr = containerRef.value.getBoundingClientRect()
  return {
    cx: er.left - cr.left + er.width  / 2,
    cy: er.top  - cr.top  + er.height / 2,
    r:  er.height / 2,
  }
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const curve = Math.min(Math.abs(x2 - x1) * 0.4, 80)
  return `M ${x1} ${y1} C ${x1 + curve} ${y1} ${x2 - curve} ${y2} ${x2} ${y2}`
}

function weightStyle(w: number): { color: string; width: number; opacity: number } {
  const abs = Math.abs(w)
  return {
    color:   w >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
    width:   0.5 + Math.min(abs, 1.5) * 3,
    opacity: 0.15 + Math.min(abs, 1) * 0.65,
  }
}

/** Y offset so that `total` connections fan evenly within the neuron's diameter. */
function spreadOffset(idx: number, total: number, diameter: number): number {
  if (total <= 1) return 0
  return (idx - (total - 1) / 2) * (diameter * 0.55 / Math.max(total - 1, 1))
}

function drawConnections() {
  if (!svgRef.value || !containerRef.value) return

  const W     = svc.W.value
  const paths: SvgPath[]    = []
  const clips: NeuronClip[] = []

  // Collect neuron clip circles
  for (let j = 0; j < n.value; j++) {
    const inInfo  = getNeuronInfo(inputNeuronRefs.value[j])
    const outInfo = getNeuronInfo(outputNeuronRefs.value[j])
    if (inInfo)  clips.push(inInfo)
    if (outInfo) clips.push(outInfo)
  }
  for (let k = 0; k < m.value; k++) {
    const embInfo = getNeuronInfo(embNeuronRefs.value[k])
    if (embInfo) clips.push(embInfo)
  }

  // Encoder: input neurons → embedding neurons
  for (let k = 0; k < m.value; k++) {
    const embInfo = getNeuronInfo(embNeuronRefs.value[k])
    if (!embInfo) continue
    for (let j = 0; j < n.value; j++) {
      const inInfo = getNeuronInfo(inputNeuronRefs.value[j])
      if (!inInfo) continue
      const w = W[k]?.[j] ?? 0
      const { color, width, opacity } = weightStyle(w)
      // Fan: k-th connection fans at input; j-th connection fans at embedding
      const sy = inInfo.cy  + spreadOffset(k, m.value, inInfo.r  * 2)
      const ty = embInfo.cy + spreadOffset(j, n.value, embInfo.r * 2)
      paths.push({ d: bezierPath(inInfo.cx, sy, embInfo.cx, ty), color, width, opacity, row: k, col: j })
    }
  }

  // Decoder: embedding neurons → output neurons
  for (let k = 0; k < m.value; k++) {
    const embInfo = getNeuronInfo(embNeuronRefs.value[k])
    if (!embInfo) continue
    for (let j = 0; j < n.value; j++) {
      const outInfo = getNeuronInfo(outputNeuronRefs.value[j])
      if (!outInfo) continue
      const w = W[k]?.[j] ?? 0
      const { color, width, opacity } = weightStyle(w)
      const sy = embInfo.cy  + spreadOffset(j, n.value, embInfo.r  * 2)
      const ty = outInfo.cy  + spreadOffset(k, m.value, outInfo.r  * 2)
      paths.push({ d: bezierPath(embInfo.cx, sy, outInfo.cx, ty), color, width, opacity, row: k, col: j })
    }
  }

  svgPathsData.value = paths
  neuronClips.value  = clips
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

watch(() => svc.W.value,                () => drawConnections(), { deep: true })
watch([n, m],                           () => drawConnections(), { flush: 'post' })
watch(() => svc.featureImportance.value, () => drawConnections(), { flush: 'post' })

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number):     string  { return v.toFixed(2) }
function isNonZero(v: number): boolean { return Math.abs(v) > 0.005 }
function absErr(v: number):  string  { return Math.abs(v).toFixed(2) }

const currentLoss = computed(() => {
  const x    = svc.currentInput.value
  const xHat = svc.currentOutput.value
  const imp  = svc.featureImportance.value
  return x.reduce((sum, xi, i) => sum + (imp[i] ?? 1) * (xi - (xHat[i] ?? 0)) ** 2, 0)
})

// ─── Sampling ─────────────────────────────────────────────────────────────────
// ─── Sampling ─────────────────────────────────────────────────────────────────
function randn(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

/** Toggle an input to non-zero: always samples from half-normal, ignoring sparsity. */
function resampleInput(i: number) {
  onInputChange(i, Math.abs(randn()))
}

/** Resample all inputs using the same distribution as training (respects sparsity). */
function resampleAll() {
  const vals = svc.generateSample()
  userInputs.value = [...vals]
  svc.runForward([...vals])
}

// ─── Selection / hover handlers ───────────────────────────────────────────────
function onWeightEnter(row: number, col: number) { selSvc.setHover({ kind: 'weight', row, col }, 'autoencoder') }
function onWeightLeave()                          { selSvc.clearHover() }
function onWeightClick(row: number, col: number)  { selSvc.setSelected({ kind: 'weight', row, col }, 'autoencoder') }

function onFeatureEnter(i: number) { selSvc.setHover({ kind: 'feature', idx: i }, 'autoencoder') }
function onFeatureLeave()          { selSvc.clearHover() }
function onFeatureClick(i: number) { selSvc.setSelected({ kind: 'feature', idx: i }, 'autoencoder') }

function onEmbNeuronEnter(k: number) { selSvc.setHover({ kind: 'emb', idx: k }, 'autoencoder') }
function onEmbNeuronLeave()          { selSvc.clearHover() }
function onEmbNeuronClick(k: number) { selSvc.setSelected({ kind: 'emb', idx: k }, 'autoencoder') }

function onOutputEnter(i: number) { selSvc.setHover({ kind: 'output', idx: i }, 'autoencoder') }
function onOutputLeave()          { selSvc.clearHover() }
function onOutputClick(i: number) { selSvc.setSelected({ kind: 'output', idx: i }, 'autoencoder') }
</script>

<template>
  <div
    class="ae-grid"
    ref="containerRef"
    :style="{ gridTemplateRows }"
  >
    <!-- SVG overlay — paths masked at neuron circles, pointer-events on stroke only -->
    <svg
      ref="svgRef"
      class="connections-svg"
      :class="{ 'training-active': svc.isTraining.value }"
      aria-hidden="true"
    >
      <defs>
        <!-- Mask: white everywhere except black circles over neurons (hides lines inside circles) -->
        <mask id="neuron-mask" maskUnits="userSpaceOnUse">
          <rect x="-9999" y="-9999" width="19998" height="19998" fill="white" />
          <circle
            v-for="(c, ci) in neuronClips"
            :key="ci"
            :cx="c.cx" :cy="c.cy" :r="c.r"
            fill="black"
          />
        </mask>
      </defs>
      <g mask="url(#neuron-mask)">
        <path
          v-for="(p, pi) in svgPathsData"
          :key="pi"
          :d="p.d"
          fill="none"
          :stroke="p.color"
          :stroke-width="p.width"
          :opacity="p.opacity"
          style="pointer-events: stroke; cursor: pointer;stroke-linecap: round;"
          @mouseenter="onWeightEnter(p.row, p.col)"
          @mouseleave="onWeightLeave"
          @click.stop="onWeightClick(p.row, p.col)"
        />
      </g>
    </svg>

    <!-- ── Row 1: Column headings ──────────────────────────── -->
    <div class="col-heading" style="grid-column: 1; grid-row: 1">Input</div>
    <div class="col-heading" style="grid-column: 3; grid-row: 1">Encoder</div>
    <div class="col-heading" style="grid-column: 5; grid-row: 1">Embedding</div>
    <div class="col-heading" style="grid-column: 7; grid-row: 1">Decoder</div>
    <div class="col-heading" style="grid-column: 9; grid-row: 1">Output</div>

    <!-- ── Row 2: Sub-header info / controls ────────────────── -->
    <!-- Input col: resample-all button -->
    <button
      class="dim-btn resample-all-btn"
      style="grid-column: 1; grid-row: 2"
      @click="resampleAll"
      :disabled="svc.isTraining.value"
      title="Sample new input values"
    >↻</button>

    <!-- Encoder col: +/- dim controls + neuron count -->
    <div class="sub-header-ctrl" style="grid-column: 3; grid-row: 2">
      <span class="neuron-count">{{ n }} neurons</span>
      <div class="dim-btns">
        <button class="dim-btn" @click="removeInputNeuron" :disabled="!canRemoveInput" title="Remove input feature">−</button>
        <button class="dim-btn" @click="addInputNeuron"    :disabled="!canAddInput"    title="Add input feature">+</button>
      </div>
    </div>

    <!-- Embedding col: +/- dim controls + neuron count -->
    <div class="sub-header-ctrl" style="grid-column: 5; grid-row: 2">
      <span class="neuron-count">{{ m }} neurons</span>
      <div class="dim-btns">
        <button class="dim-btn" @click="removeEmbeddingNeuron" :disabled="!canRemoveEmb" title="Remove embedding dim">−</button>
        <button class="dim-btn" @click="addEmbeddingNeuron"    :disabled="!canAddEmb"    title="Add embedding dim">+</button>
      </div>
    </div>

    <!-- Decoder col: activation info -->
    <span class="col-subtext" style="grid-column: 7; grid-row: 2">Bias / ReLU</span>

    <!-- Output col: weighted loss label + value -->
    <div class="sub-header-loss" style="grid-column: 9; grid-row: 2">
      <span class="col-loss-label">weighted loss</span>
      <span class="col-loss-val" :class="{ zero: !isNonZero(currentLoss) }">
        {{ currentLoss.toFixed(3) }}
      </span>
    </div>

    <!-- ── Per-feature rows (rows 3 … n+2) ───────────────── -->
    <template v-for="(_, i) in n" :key="i">
      <!-- Input value: col 1 -->
      <InputValue
        :modelValue="userInputs[i] ?? 0"
        :label="`x${i + 1}`"
        :disabled="svc.isTraining.value"
        :featureIdx="i"
        :featureCount="n"
        @update:modelValue="onInputChange(i, $event)"
        @resample="resampleInput(i)"
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
        @mouseenter="onFeatureEnter(i)"
        @mouseleave="onFeatureLeave"
        @click="onFeatureClick(i)"
      />

      <!-- Output neuron: col 7 — also scales with importance -->
      <div
        :ref="(el) => { outputNeuronRefs[i] = el as HTMLElement }"
        class="neuron"
        :style="{
          gridColumn: '7',
          gridRow: String(i + dataRowStart),
          background: neuronColor(svc.currentOutput.value[i] ?? 0),
          transform: `scale(${neuronScale(i)})`,
        }"
        :title="`x̂${i + 1} = ${fmt(svc.currentOutput.value[i] ?? 0)}`"
        @mouseenter="onOutputEnter(i)"
        @mouseleave="onOutputLeave"
        @click="onOutputClick(i)"
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
          @mouseenter="onEmbNeuronEnter(k)"
          @mouseleave="onEmbNeuronLeave"
          @click="onEmbNeuronClick(k)"
        >
          <span class="emb-value">{{ fmt(svc.currentEmbedding.value[k] ?? 0) }}</span>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* ── Main grid ────────────────────────────────────────────── */
.ae-grid {
  position: relative;
  display: grid;

  grid-template-columns:
    [inputs]          60px
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

/* ── SVG overlay ──────────────────────────────────────────── */
.connections-svg {
  position: absolute;
  left: 0; top: 0;
  width: 100%; height: 100%;
}

/* Dashed lines — only shown and animated during training */
.connections-svg path {
  stroke-dasharray: none;
}

@keyframes dash-flow {
  from { stroke-dashoffset: 7; }
  to   { stroke-dashoffset: 0; }
}

.connections-svg.training-active path {
  stroke-dasharray: 1 6; /*When updating this, also update dash-flow above (dashoffset=sum)*/
  animation: dash-flow 0.35s linear infinite;
}

/* ── Column headings ──────────────────────────────────────── */
.col-heading {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--color-text-title);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  z-index: 2;
}

.col-loss-val {
  font-size: 0.8rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-error);
  line-height: 1;
}
.col-loss-val.zero { color: #d1d5db; }

.col-loss-label {
  font-size: 0.6rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.2;
}

/* ── Neurons ──────────────────────────────────────────────── */
.neuron {
  width: var(--neuron-size);
  height: var(--neuron-size);
  border-radius: 50%;
  border: 2px solid #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;
  flex-shrink: 0;
  position: relative;
  z-index: 2;
}

.emb-neuron {
  border-color: #6b7280;
}

.emb-value {
  font-size: 0.58rem;
  font-variant-numeric: tabular-nums;
  color: #374151;
  font-weight: 700;
  pointer-events: none;
  text-shadow: 0 0 3px rgba(255,255,255,0.8);
}

/* ── Embedding column ─────────────────────────────────────── */
.emb-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  align-self: stretch;
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
.out-err.zero { color: #d1d5db; }

/* ── Column sub-header row (row 2) ────────────────────────── */

.resample-all-btn {
  font-size: 0.65rem;
  padding: 2px 6px;
  height: 20px;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  color: #64748b;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
  z-index: 2;
  align-self: end;
}
.resample-all-btn:hover:not(:disabled) { background: #f1f5f9; color: #334155; }
.resample-all-btn:disabled { opacity: 0.35; cursor: not-allowed; }

.sub-header-ctrl {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  z-index: 2;
}

.sub-header-loss {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  z-index: 2;
}

.col-subtext {
  font-size: 0.62rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.03em;
  font-weight: 400;
  z-index: 2;
}

.dim-btns {
  display: flex;
  gap: 5px;
}

.neuron-count {
  font-size: 0.62rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  text-align: center;
  user-select: none;
}

.dim-btn {
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  border: 1px solid #d1d5db;
  padding: 0;
  font-size: 0.85rem;
  /* font-weight: 600; */
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #f1f5f9;
  color: #64748b;
  transition: opacity 0.15s, background 0.15s;
}
.dim-btn:hover:not(:disabled) { background: #e2e8f0; }
.dim-btn:disabled { opacity: 0.3; cursor: not-allowed; }
</style>