<script setup lang="ts">
import {inject, ref, computed, watch, onMounted, onUnmounted, nextTick} from 'vue'
import {RefreshCw} from 'lucide-vue-next'
import {renderLatexHtml} from '../utils/latex'
import type {AutoencoderServiceType} from '../services/AutoencoderService'
import {INPUT_DIM_MIN, INPUT_DIM_MAX, EMB_DIM_MIN, EMB_DIM_MAX} from '../services/AutoencoderService'
import type {SelectionServiceType} from '../services/SelectionService'
import InputValue from './InputValue.vue'
import ActivationIcons from './ActivationIcons.vue'

const svc = inject<AutoencoderServiceType>('autoencoderService')!
const selSvc = inject<SelectionServiceType>('selectionService')!

// ─── Template refs ────────────────────────────────────────────────────────────
const containerRef = ref<HTMLElement | null>(null)
const svgRef = ref<SVGElement | null>(null)

const inputNeuronRefs = ref<(HTMLElement | null)[]>([])
const embNeuronRefs = ref<(HTMLElement | null)[]>([])
const outputNeuronRefs = ref<(HTMLElement | null)[]>([])

// ─── Dimensions ───────────────────────────────────────────────────────────────
const n = computed(() => svc.config.inputDim)
const m = computed(() => svc.config.embeddingDim)

// Row 1: headers, Row 2: sub-header controls/info, Rows 3…n+2: data rows
const gridTemplateRows = computed(
    () => `auto auto repeat(${n.value}, var(--row-height))`
)

const dataRowStart = 3
const dataRowEnd = computed(() => n.value + 3)

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

function inputNeuronTooltip(i: number): string {
  const imp = svc.featureImportance.value[i] ?? 1
  return renderLatexHtml(`I_{${i + 1}}`) + ` = ${fmt(imp)}`
}

// ─── User input ───────────────────────────────────────────────────────────────
const userInputs = ref<number[]>([])

watch(n, (newN) => {
  userInputs.value = Array.from({length: newN}, (_, i) => svc.currentInput.value[i] ?? 0)
}, {immediate: true})

watch(() => svc.currentInput.value, (inp) => {
  userInputs.value = [...inp]
}, {deep: true})

function onInputChange(i: number, val: number) {
  userInputs.value[i] = val
  svc.runForward([...userInputs.value])
}

// ─── Add / remove ─────────────────────────────────────────────────────────────
function addInputNeuron() {
  svc.setInputDim(n.value + 1)
}

function removeInputNeuron() {
  svc.setInputDim(n.value - 1)
}

function addEmbeddingNeuron() {
  svc.setEmbeddingDim(m.value + 1)
}

function removeEmbeddingNeuron() {
  svc.setEmbeddingDim(m.value - 1)
}

const canAddInput = computed(() => n.value < INPUT_DIM_MAX && !svc.isTraining.value)
const canRemoveInput = computed(() => n.value > INPUT_DIM_MIN && !svc.isTraining.value)
const canAddEmb = computed(() => m.value < EMB_DIM_MAX && !svc.isTraining.value)
const canRemoveEmb = computed(() => m.value > EMB_DIM_MIN && !svc.isTraining.value)

// ─── SVG connections ──────────────────────────────────────────────────────────

interface SvgPath {
  d: string
  color: string
  width: number
  opacity: number
  row: number
  col: number
}

interface NeuronClip {
  cx: number
  cy: number
  r: number
}

const svgPathsData = ref<SvgPath[]>([])
const neuronClips = ref<NeuronClip[]>([])

/** Returns the center position + radius of a neuron element in SVG/container coordinates. */
function getNeuronInfo(el: HTMLElement | null | undefined): NeuronClip | null {
  if (!el || !containerRef.value) return null
  const er = el.getBoundingClientRect()
  const cr = containerRef.value.getBoundingClientRect()
  return {
    cx: er.left - cr.left + er.width / 2,
    cy: er.top - cr.top + er.height / 2,
    r: er.height / 2,
  }
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const curve = Math.min(Math.abs(x2 - x1) * 0.4, 80)
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

/** Y offset so that `total` connections fan evenly within the neuron's diameter. */
function spreadOffset(idx: number, total: number, diameter: number): number {
  if (total <= 1) return 0
  return (idx - (total - 1) / 2) * (diameter * 0.55 / Math.max(total - 1, 1))
}

function drawConnections() {
  if (!svgRef.value || !containerRef.value) return

  const W = svc.W.value
  const paths: SvgPath[] = []
  const clips: NeuronClip[] = []

  // Collect neuron clip circles
  for (let j = 0; j < n.value; j++) {
    const inInfo = getNeuronInfo(inputNeuronRefs.value[j])
    const outInfo = getNeuronInfo(outputNeuronRefs.value[j])
    if (inInfo) clips.push(inInfo)
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
      const {color, width, opacity} = weightStyle(w)
      // Fan: k-th connection fans at input; j-th connection fans at embedding
      const sy = inInfo.cy + spreadOffset(k, m.value, inInfo.r * 2)
      const ty = embInfo.cy + spreadOffset(j, n.value, embInfo.r * 2)
      paths.push({d: bezierPath(inInfo.cx, sy, embInfo.cx, ty), color, width, opacity, row: k, col: j})
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
      const {color, width, opacity} = weightStyle(w)
      const sy = embInfo.cy + spreadOffset(j, n.value, embInfo.r * 2)
      const ty = outInfo.cy + spreadOffset(k, m.value, outInfo.r * 2)
      paths.push({d: bezierPath(embInfo.cx, sy, outInfo.cx, ty), color, width, opacity, row: k, col: j})
    }
  }

  svgPathsData.value = paths
  neuronClips.value = clips
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

watch(() => svc.W.value, () => drawConnections(), {deep: true})
watch([n, m], () => drawConnections(), {flush: 'post'})
watch(() => svc.featureImportance.value, () => drawConnections(), {flush: 'post'})

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number): string {
  return v.toFixed(2)
}

function isNonZero(v: number): boolean {
  return Math.abs(v) > 0.005
}

function absErr(v: number): string {
  return Math.abs(v).toFixed(2)
}

const currentLoss = computed(() => {
  const x = svc.currentInput.value
  const xHat = svc.currentOutput.value
  const imp = svc.featureImportance.value
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

// ─── Hover / selection highlight logic ───────────────────────────────────────
//
// Architecture: each SelectionTarget maps to an Illumination — a description of
// which neurons/paths are "lit" (everything else is dimmed).
//
// When both selection and hover are active:
//   - Selection defines the base illumination.
//   - Hover "narrows" it via set intersection ONLY when the hover is on a
//     compatible (different) axis (e.g. feature selected + emb hovered → show
//     only that feature AND that embedding neuron + their shared weights).
//   - Incompatible hover (same axis, different index) is ignored so that
//     selection always has precedence.
//
// The single `activeIllumination` computed is the source of truth. All dim /
// opacity helpers derive from it — no ad-hoc functions needed.

type IllumSet = Set<number> | 'all'

interface Illumination {
  inputs:  IllumSet
  outputs: IllumSet
  embs:    IllumSet
  paths:   (row: number, col: number) => boolean
}

const FEATURE_LIKE = new Set(['feature', 'input', 'output', 'bias', 'relu'])

function illuminationFor(t: ReturnType<typeof selSvc.selected.valueOf> | null): Illumination {
  if (!t) return { inputs: 'all', outputs: 'all', embs: 'all', paths: () => true }
  if (FEATURE_LIKE.has(t.kind)) {
    const i = (t as { idx: number }).idx
    return { inputs: new Set([i]), outputs: new Set([i]), embs: 'all', paths: (_r, c) => c === i }
  }
  if (t.kind === 'emb') {
    return { inputs: 'all', outputs: 'all', embs: new Set([t.idx]), paths: (r) => r === t.idx }
  }
  if (t.kind === 'weight') {
    return {
      inputs:  new Set([t.col]),
      outputs: new Set([t.col]),
      embs:    new Set([t.row]),
      paths:   (r, c) => r === t.row && c === t.col,
    }
  }
  return { inputs: 'all', outputs: 'all', embs: 'all', paths: () => true }
}

function intersectSet(a: IllumSet, b: IllumSet): IllumSet {
  if (a === 'all') return b
  if (b === 'all') return a
  const r = new Set([...a].filter(x => (b as Set<number>).has(x)))
  return r.size > 0 ? r : a  // if empty, fall back to selection's set
}

function intersectIllum(sel: Illumination, hov: Illumination): Illumination {
  return {
    inputs:  intersectSet(sel.inputs,  hov.inputs),
    outputs: intersectSet(sel.outputs, hov.outputs),
    embs:    intersectSet(sel.embs,    hov.embs),
    paths:   (r, c) => sel.paths(r, c) && hov.paths(r, c),
  }
}

/** Hover is compatible when it is on a different "axis" than the selection.
 *  Same-axis, different-index hovers are ignored (selection has precedence). */
function hovIsCompatible(
  sel: NonNullable<ReturnType<typeof selSvc.selected.valueOf>>,
  hov: NonNullable<ReturnType<typeof selSvc.hovered.valueOf>>,
): boolean {
  const selF = FEATURE_LIKE.has(sel.kind)
  const hovF = FEATURE_LIKE.has(hov.kind)
  if (selF && hovF)
    return (sel as { idx: number }).idx === (hov as { idx: number }).idx
  if (sel.kind === 'emb' && hov.kind === 'emb')
    return sel.idx === hov.idx
  // A hovered weight is only compatible if it connects to the selected element
  if (hov.kind === 'weight') {
    if (selF) return hov.col === (sel as { idx: number }).idx
    if (sel.kind === 'emb') return hov.row === sel.idx
  }
  return true
}

const activeIllumination = computed<Illumination>(() => {
  const sel = selSvc.selected.value
  const hov = selSvc.hovered.value
  if (!sel && !hov) return illuminationFor(null)
  if (!sel) return illuminationFor(hov)
  if (!hov) return illuminationFor(sel)
  return hovIsCompatible(sel, hov)
    ? intersectIllum(illuminationFor(sel), illuminationFor(hov))
    : illuminationFor(sel)
})

const isAnyActive = computed(() =>
  selSvc.selected.value !== null || selSvc.hovered.value !== null
)

function inSet(s: IllumSet, i: number): boolean {
  return s === 'all' || (s as Set<number>).has(i)
}

function isInputDimmed(i: number):  boolean { return isAnyActive.value && !inSet(activeIllumination.value.inputs,  i) }
function isOutputDimmed(i: number): boolean { return isAnyActive.value && !inSet(activeIllumination.value.outputs, i) }
function isEmbDimmed(k: number):    boolean { return isAnyActive.value && !inSet(activeIllumination.value.embs,    k) }

function pathOpacity(row: number, col: number, base: number): number {
  if (!isAnyActive.value) return base
  return activeIllumination.value.paths(row, col) ? base : base * 0.1
}

/** Selection outline — reads selected only, independent of hover. */
function isInputSelected(i: number):  boolean { const t = selSvc.selected.value; return !!t && FEATURE_LIKE.has(t.kind) && (t as {idx:number}).idx === i }
function isOutputSelected(i: number): boolean { const t = selSvc.selected.value; return !!t && (t.kind === 'output' || FEATURE_LIKE.has(t.kind)) && (t as {idx:number}).idx === i }
function isEmbSelected(k: number):    boolean { const t = selSvc.selected.value; return t?.kind === 'emb' && t.idx === k }


function onWeightEnter(row: number, col: number) {
  selSvc.setHover({kind: 'weight', row, col}, 'autoencoder')
}

function onWeightLeave() {
  selSvc.clearHover()
}

function onWeightClick(row: number, col: number) {
  selSvc.setSelected({kind: 'weight', row, col}, 'autoencoder')
}

function onFeatureEnter(i: number) {
  selSvc.setHover({kind: 'feature', idx: i}, 'autoencoder')
}

function onFeatureLeave() {
  selSvc.clearHover()
}

function onFeatureClick(i: number) {
  selSvc.setSelected({kind: 'feature', idx: i}, 'autoencoder')
}

function onInputEnter(i: number) {
  selSvc.setHover({kind: 'input', idx: i}, 'autoencoder')
}

function onInputLeave() {
  selSvc.clearHover()
}

function onInputClick(i: number) {
  selSvc.setSelected({kind: 'input', idx: i}, 'autoencoder')
}

function onEmbNeuronEnter(k: number) {
  selSvc.setHover({kind: 'emb', idx: k}, 'autoencoder')
}

function onEmbNeuronLeave() {
  selSvc.clearHover()
}

function onEmbNeuronClick(k: number) {
  selSvc.setSelected({kind: 'emb', idx: k}, 'autoencoder')
}

function onOutputEnter(i: number) {
  selSvc.setHover({kind: 'output', idx: i}, 'autoencoder')
}

function onOutputLeave() {
  selSvc.clearHover()
}

function onOutputClick(i: number) {
  selSvc.setSelected({kind: 'output', idx: i}, 'autoencoder')
}
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
          <rect x="-9999" y="-9999" width="19998" height="19998" fill="white"/>
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
            :opacity="pathOpacity(p.row, p.col, p.opacity)"
            style="pointer-events: stroke; cursor: pointer;stroke-linecap: round;"
            @mouseenter="onWeightEnter(p.row, p.col)"
            @mouseleave="onWeightLeave"
            @click.stop="onWeightClick(p.row, p.col)"
        />
      </g>
    </svg>

    <!-- ── Row 1: Column headings ──────────────────────────── -->
    <div class="col-heading" style="grid-column: 1; grid-row: 1">Features</div>
    <div class="col-heading" style="grid-column: 3; grid-row: 1">Input</div>
    <div class="col-heading" style="grid-column: 4/6; grid-row: 1">Encoder</div>
    <div class="col-heading" style="grid-column: 6; grid-row: 1">Embedding</div>
    <div class="col-heading" style="grid-column: 7 / 9; grid-row: 1">Decoder</div>
    <div class="col-heading" style="grid-column: 10 ; grid-row: 1">Output</div>
<!--    <div class="col-heading" style="grid-column: 12; grid-row: 1">Reconstruction</div>-->

    <!-- ── Row 2: Sub-header info / controls ────────────────── -->
    <!-- Input col: resample-all button -->
    <button
        class="dim-btn resample-all-btn"
        style="grid-column: 1; grid-row: 2"
        @click="resampleAll"
        :disabled="svc.isTraining.value"
        title="Sample new input values"
    >
      <RefreshCw :size="12"/>
    </button>

    <!-- Encoder col: +/- dim controls + neuron count -->
    <div class="sub-header-ctrl" style="grid-column: 3; grid-row: 2">
      <span class="neuron-count">{{ n }} neurons</span>
      <div class="dim-btns">
        <button class="dim-btn" @click="removeInputNeuron" :disabled="!canRemoveInput" title="Remove input feature">−
        </button>
        <button class="dim-btn" @click="addInputNeuron" :disabled="!canAddInput" title="Add input feature">+</button>
      </div>
    </div>

    <!-- Embedding col: +/- dim controls + neuron count -->
    <div class="sub-header-ctrl" style="grid-column: 6; grid-row: 2">
      <span class="neuron-count">{{ m }} neurons</span>
      <div class="dim-btns">
        <button class="dim-btn" @click="removeEmbeddingNeuron" :disabled="!canRemoveEmb" title="Remove embedding dim">
          −
        </button>
        <button class="dim-btn" @click="addEmbeddingNeuron" :disabled="!canAddEmb" title="Add embedding dim">+</button>
      </div>
    </div>

    <!-- Decoder col: activation info — removed; replaced by per-row ActivationIcons -->

    <!-- Output col: weighted loss label + value -->
    <div class="sub-header-loss" style="grid-column: 12; grid-row: 2">
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
          @featureClick="onInputClick(i)"
          @mouseenter="onInputEnter(i)"
          @mouseleave="onInputLeave"
          :style="{ gridColumn: '1', gridRow: String(i + dataRowStart) }"
      />

      <!-- Input neuron: col 3 -->
      <div
          class="neuron-wrap"
          :class="{ dimmed: isInputDimmed(i) }"
          :style="{ gridColumn: '3', gridRow: String(i + dataRowStart) }"
          @mouseenter="onFeatureEnter(i)"
          @mouseleave="onFeatureLeave"
          @click="onFeatureClick(i)"
      >
        <div
            :ref="(el) => { inputNeuronRefs[i] = el as HTMLElement }"
            class="neuron"
            :class="{ 'neuron-selected': isInputSelected(i) }"
            :style="{
            background: neuronColor(svc.currentInput.value[i] ?? 0),
            transform: `scale(${neuronScale(i)})`,
          }"
        />
        <div class="neuron-tooltip" v-html="inputNeuronTooltip(i)" />
      </div>

      <!-- Activation icons (bias + ReLU): col 8 -->
      <ActivationIcons
          :biasVal="svc.b.value[i] ?? 0"
          :preActivation="svc.currentPreActivation.value[i] ?? 0"
          :featureIdx="i"
          :style="{ gridColumn: '8', gridRow: String(i + dataRowStart) }"
      />

      <!-- Output neuron: col 10 — also scales with importance -->
      <div
          :ref="(el) => { outputNeuronRefs[i] = el as HTMLElement }"
          class="neuron"
          :class="{ dimmed: isOutputDimmed(i), 'neuron-selected': isOutputSelected(i) }"
          :style="{
          gridColumn: '10',
          gridRow: String(i + dataRowStart),
          background: neuronColor(svc.currentOutput.value[i] ?? 0),
          transform: `scale(${neuronScale(i)})`,
        }"
          @mouseenter="onOutputEnter(i)"
          @mouseleave="onOutputLeave"
          @click="onOutputClick(i)"
      />

      <!-- Output value: col 11 -->
      <div
          class="output-value"
          :style="{ gridColumn: '12', gridRow: String(i + dataRowStart) }"
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
        gridColumn: '6',
        gridRow: `${dataRowStart} / ${dataRowEnd}`,
      }"
    >
      <div class="emb-neurons">
        <div
            v-for="(_, k) in m"
            :key="k"
            :ref="(el) => { embNeuronRefs[k] = el as HTMLElement }"
            class="neuron emb-neuron"
          :class="{ dimmed: isEmbDimmed(k), 'neuron-selected': isEmbSelected(k) }"
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
    [features]        60px
    [gap-s-left]      1.2rem
    [input-neurons]   var(--neuron-size)
    [gap-comp-l]      26px
    [gap-conn-l]      1fr
    [embedding]       calc(var(--neuron-size) * 1.4)
    [gap-conn-r]      1fr
    [act-icons]       26px
    [gap-act]         0px
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
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

/* Dashed lines — only shown and animated during training */
.connections-svg path {
  stroke-dasharray: none;
}

@keyframes dash-flow {
  from {
    stroke-dashoffset: 7;
  }
  to {
    stroke-dashoffset: 0;
  }
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

.col-loss-val.zero {
  color: #d1d5db;
}

.col-loss-label {
  font-size: 0.6rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  line-height: 1.2;
}

/* ── Highlight / dim ──────────────────────────────────────── */
.neuron-wrap.dimmed {
  opacity: 0.18;
}

.neuron.dimmed {
  opacity: 0.18;
}

.neuron-wrap,
.neuron {
  transition: opacity 0.15s;
}

.neuron.neuron-selected {
  box-shadow: 0 0 0 2.5px #6366f1, 0 0 8px rgba(99, 102, 241, 0.4);
  border-color: #6366f1;
}


.neuron-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  cursor: pointer;
}

.neuron-wrap:hover .neuron-tooltip {
  opacity: 1;
  pointer-events: none;
}

.neuron-tooltip {
  position: absolute;
  top: calc(100% + 7px);
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  padding: 3px 7px;
  font-size: 0.72rem;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  opacity: 0;
  transition: opacity 0.12s;
  z-index: 100;
  pointer-events: none;
}

.neuron-tooltip :deep(.katex) {
  font-size: 0.72rem;
  color: #374151;
}

.neuron {
  width: var(--neuron-size);
  height: var(--neuron-size);
  border-radius: 50%;
  border: 2px solid #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  /*removed transform 0.2s as this causes update problems for the weight svg backdrop*/
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  cursor: pointer;
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
  text-shadow: 0 0 3px rgba(255, 255, 255, 0.8);
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

.out-err.zero {
  color: #d1d5db;
}

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

.resample-all-btn:hover:not(:disabled) {
  background: #f1f5f9;
  color: #334155;
}

.resample-all-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

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

.dim-btn:hover:not(:disabled) {
  background: #e2e8f0;
}

.dim-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>