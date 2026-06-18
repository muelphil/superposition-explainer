<script setup lang="ts">
import {inject, ref, computed, watch} from 'vue'
import {RefreshCw, Plus, Minus} from 'lucide-vue-next'
import type {AutoencoderServiceType} from '../services/AutoencoderService'
import {INPUT_DIM_MIN, INPUT_DIM_MAX, EMB_DIM_MIN, EMB_DIM_MAX} from '../services/AutoencoderService'
import type {SelectionServiceType} from '../services/SelectionService'
import {VIZ_SERVICE_KEY} from '../services/VizService'
import {AE_VIEW_CONSTRAINTS_KEY} from './blogPost/aeStepTypes'
import {TASK_EVENT_BUS_KEY} from './blogPost/taskSystem'
import {neuronColorRgb, neuronBorderColorRgb, neuronFeatureBgRgb, neuronFeatureBorderRgb} from '../utils/featureColor'
import {useFeatureColorsForIO} from '../services/SettingsService'
import InputValue from './InputValue.vue'
import ActivationIcons from './ActivationIcons.vue'
import ConnectionsSvg from './autoencoderView/ConnectionsSvg.vue'
import {useSelectionAndHover} from './autoencoderView/useSelectionAndHover'

const props = defineProps<{ compact?: boolean }>()

const svc = inject<AutoencoderServiceType>('autoencoderService')!
const selSvc = inject<SelectionServiceType>('selectionService')!

// Optional constraints from blog paragraph steps (undefined in MainView)
const constraints = inject(AE_VIEW_CONSTRAINTS_KEY, undefined)

// Optional event bus for task system (undefined in MainView)
const eventBus = inject(TASK_EVENT_BUS_KEY, undefined)

// Optional viz service for reveal stage (undefined in MainView)
const vizSvc = inject(VIZ_SERVICE_KEY, undefined)

// In blog reveal mode, output neurons show a neutral color until the decoder is introduced.
// stageAtLeast accesses revealStage.value reactively, so this computed updates automatically.
const decoderRevealed = computed(() => vizSvc?.stageAtLeast('decoder') ?? true)

// Importance tooltips (I_i values) only appear once the training objective block is reached.
const importanceTooltipVisible = computed(() => vizSvc?.stageAtLeast('training') ?? true)

// ─── Template refs ────────────────────────────────────────────────────────────
const containerRef = ref<HTMLElement | null>(null)

const inputNeuronRefs = ref<(HTMLElement | null)[]>([])
const embNeuronRefs = ref<(HTMLElement | null)[]>([])
const outputNeuronRefs = ref<(HTMLElement | null)[]>([])

// ─── Selection & hover ────────────────────────────────────────────────────────
const {
  inputDimClass,
  outputDimClass,
  embDimClass,
  pathOpacity,
  weight,
  feature,
  input,
  emb,
  output,
} = useSelectionAndHover(selSvc, svc, eventBus)

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
/** Neutral (white) background and gray border for embedding neurons when feature colors are on. */
const NEUTRAL_BG = 'rgb(255,255,255)'
const NEUTRAL_BORDER = 'rgb(156,163,175)'

function embNeuronBg(v: number): string {
  return useFeatureColorsForIO.value ? NEUTRAL_BG : neuronColorRgb(v)
}
function embNeuronBorder(v: number): string {
  return useFeatureColorsForIO.value ? NEUTRAL_BORDER : neuronBorderColorRgb(v)
}

/** Scale so that neuron AREA ∝ importance (area = π r² → r ∝ √imp → scale ∝ √imp) */
function neuronScale(i: number): number {
  const imp = svc.featureImportance.value[i] ?? 1
  return Math.max(0.4, Math.sqrt(imp))
}

function inputNeuronBg(i: number): string {
  const v = svc.currentInput.value[i] ?? 0
  return useFeatureColorsForIO.value ? neuronFeatureBgRgb(v, i, n.value) : neuronColorRgb(v)
}
function inputNeuronBorder(i: number): string {
  const v = svc.currentInput.value[i] ?? 0
  return useFeatureColorsForIO.value ? neuronFeatureBorderRgb(v, i, n.value) : neuronBorderColorRgb(v)
}
function outputNeuronBg(i: number): string {
  const v = decoderRevealed.value ? (svc.currentOutput.value[i] ?? 0) : 0
  return useFeatureColorsForIO.value ? neuronFeatureBgRgb(v, i, n.value) : neuronColorRgb(v)
}
function outputNeuronBorder(i: number): string {
  const v = decoderRevealed.value ? (svc.currentOutput.value[i] ?? 0) : 0
  return useFeatureColorsForIO.value ? neuronFeatureBorderRgb(v, i, n.value) : neuronBorderColorRgb(v)
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
  eventBus?.emit('input-value-changed', { index: i, value: val })
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

// Effective dimension limits — constraints override global limits
const inputMin = computed(() => constraints?.value.inputDim.min ?? INPUT_DIM_MIN)
const inputMax = computed(() => constraints?.value.inputDim.max ?? INPUT_DIM_MAX)
const embMin = computed(() => constraints?.value.embeddingDim.min ?? EMB_DIM_MIN)
const embMax = computed(() => constraints?.value.embeddingDim.max ?? EMB_DIM_MAX)
const inputFixed = computed(() => constraints?.value.inputDim.fixed ?? false)
const embFixed = computed(() => constraints?.value.embeddingDim.fixed ?? false)

const canAddInput = computed(() => !inputFixed.value && n.value < inputMax.value && !svc.isTraining.value)
const canRemoveInput = computed(() => !inputFixed.value && n.value > inputMin.value && !svc.isTraining.value)
const canAddEmb = computed(() => !embFixed.value && m.value < embMax.value && !svc.isTraining.value)
const canRemoveEmb = computed(() => !embFixed.value && m.value > embMin.value && !svc.isTraining.value)


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
  eventBus?.emit('resample-clicked')
}

/** Toggle input neuron: 0 ↔ 1 */
function toggleInput(i: number) {
  const v = userInputs.value[i] ?? 0
  const newVal = v > 0.5 ? 0 : 1
  userInputs.value[i] = newVal
  svc.runForward([...userInputs.value])
  eventBus?.emit('input-value-changed', { index: i, value: newVal })
}

</script>

<template>
  <div
      class="ae-grid"
      :class="{ compact: props.compact, 'ae-grid--reveal-mode': vizSvc != null }"
      ref="containerRef"
      :style="{ gridTemplateRows }"
  >
    <!-- SVG weight connections — child component handles paths, masks, resize observer -->
    <ConnectionsSvg
        :containerEl="containerRef"
        :inputNeuronEls="inputNeuronRefs"
        :embNeuronEls="embNeuronRefs"
        :outputNeuronEls="outputNeuronRefs"
        :pathOpacity="pathOpacity"
        @weight-enter="weight.enter"
        @weight-leave="weight.leave"
    />

    <!-- ── Row 1: Column headings ──────────────────────────── -->
    <div class="col-heading" data-reveal="input-output" style="grid-column: 1; grid-row: 1">
<!--      Features-->
    </div>
    <div class="col-heading" data-reveal="input-output" style="grid-column: 3; grid-row: 1">Input</div>
    <div class="col-heading" data-reveal="encoder" style="grid-column: 4/6; grid-row: 1">Encoder</div>
    <div class="col-heading" data-reveal="embedding" style="grid-column: 6; grid-row: 1">Embedding</div>
    <div class="col-heading" data-reveal="decoder" style="grid-column: 7 / 9; grid-row: 1">Decoder</div>
    <div class="col-heading" data-reveal="input-output" style="grid-column: 10 ; grid-row: 1">Output</div>
    <!--    <div class="col-heading" style="grid-column: 12; grid-row: 1">Reconstruction</div>-->

    <!-- ── Row 2: Sub-header info / controls ────────────────── -->
    <!-- Input col: resample-all button -->
    <button
        class="dim-btn resample-all-btn"
        data-reveal="data"
        style="grid-column: 1; grid-row: 2"
        @click="resampleAll"
        :disabled="svc.isTraining.value"
        title="Sample new input values"
    >
      <RefreshCw :size="12"/>
    </button>

    <!-- Encoder col: +/- dim controls + neuron count -->
    <div class="sub-header-ctrl" style="grid-column: 3; grid-row: 2">
      <span class="neuron-count" data-reveal="input-output">{{ n }} neurons</span>
      <div v-if="!inputFixed" class="dim-btns" data-reveal="full">
        <button class="dim-btn" @click="removeInputNeuron" :disabled="!canRemoveInput" title="Remove input feature">
          <Minus :size="12"/>
        </button>
        <button class="dim-btn" @click="addInputNeuron" :disabled="!canAddInput" title="Add input feature">
          <Plus :size="12"/>
        </button>
      </div>
    </div>

    <!-- Embedding col: +/- dim controls + neuron count -->
    <div class="sub-header-ctrl" style="grid-column: 6; grid-row: 2">
      <span class="neuron-count" data-reveal="embedding">{{ m }} neurons</span>
      <div v-if="!embFixed" class="dim-btns" data-reveal="full">
        <button class="dim-btn" @click="removeEmbeddingNeuron" :disabled="!canRemoveEmb" title="Remove embedding dim">
          <Minus :size="12"/>
        </button>
        <button class="dim-btn" @click="addEmbeddingNeuron" :disabled="!canAddEmb" title="Add embedding dim">
          <Plus :size="12"/>
        </button>
      </div>
    </div>

    <!-- Decoder col: activation info — removed; replaced by per-row ActivationIcons -->

    <!-- Output col: weighted loss label + value -->
    <div class="sub-header-loss" data-reveal="training" style="grid-column: 12; grid-row: 2">
      <span class="col-loss-label">Weighted Loss</span>
      <span class="col-loss-val" :class="{ zero: !isNonZero(currentLoss) }">
        {{ currentLoss.toFixed(3) }}
      </span>
    </div>

    <!-- ── Per-feature rows (rows 3 … n+2) ───────────────── -->
    <template v-for="(_, i) in n" :key="i">
      <!-- Input value: col 1 -->
      <div
          class="cell-hover-zone"
          data-reveal="input-output"
          :class="inputDimClass(i)"
          :style="{ gridColumn: '1', gridRow: String(i + dataRowStart) }"
          @mouseenter="input.enter(i)"
          @mouseleave="input.leave"
      >
        <InputValue
            :modelValue="userInputs[i] ?? 0"
            :label="`x${i + 1}`"
            :disabled="svc.isTraining.value"
            :featureIdx="i"
            :featureCount="n"
            @update:modelValue="onInputChange(i, $event)"
            @resample="resampleInput(i)"
        />
      </div>

      <!-- Input neuron: col 3 -->
      <div
          class="neuron-wrap"
          data-reveal="input-output"
          :class="inputDimClass(i)"
          :style="{ gridColumn: '3', gridRow: String(i + dataRowStart) }"
          @mouseenter="feature.enter(i)"
          @mouseleave="feature.leave"
          @click="toggleInput(i)"
      >
        <div
            :ref="(el) => { inputNeuronRefs[i] = el as HTMLElement }"
            class="neuron"
            :style="{
            background: inputNeuronBg(i),
            borderColor: inputNeuronBorder(i),
            transform: `scale(${neuronScale(i)})`,
          }"
        />
        <div class="neuron-tooltip" v-show="importanceTooltipVisible">
          <span v-katex="`I_{${i + 1}}`" />
          <span>&nbsp;= {{ fmt(svc.featureImportance.value[i] ?? 1) }}</span>
        </div>
      </div>

      <!-- Activation icons (bias + ReLU): col 8 -->
      <ActivationIcons
          data-reveal="decoder"
          :biasVal="svc.b.value[i] ?? 0"
          :preActivation="svc.currentPreActivation.value[i] ?? 0"
          :featureIdx="i"
          :style="{ gridColumn: '8', gridRow: String(i + dataRowStart) }"
      />

      <!-- Output neuron: col 10 — also scales with importance -->
      <div
          class="neuron-wrap"
          data-reveal="input-output"
          :class="outputDimClass(i)"
          :style="{ gridColumn: '10', gridRow: String(i + dataRowStart) }"
          @mouseenter="output.enter(i)"
          @mouseleave="output.leave"
      >
        <div
            :ref="(el) => { outputNeuronRefs[i] = el as HTMLElement }"
            class="neuron"
            :style="{
            background: outputNeuronBg(i),
            borderColor: outputNeuronBorder(i),
            transform: `scale(${neuronScale(i)})`,
          }"
        />
      </div>

      <!-- Output value: col 11 -->
      <div
          class="output-value"
          data-reveal="decoder"
          :class="outputDimClass(i)"
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
        data-reveal="embedding"
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
            :class="embDimClass(k)"
            :style="{ background: embNeuronBg(svc.currentEmbedding.value[k] ?? 0), borderColor: embNeuronBorder(svc.currentEmbedding.value[k] ?? 0) }"
            :title="`h${k + 1} = ${fmt(svc.currentEmbedding.value[k] ?? 0)}`"
            @mouseenter="emb.enter(k)"
            @mouseleave="emb.leave"
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

  --col-features: 60px;
  --col-gap-s: 1.2rem;
  --col-gap-comp: 26px;
  --col-act-icons: 26px;
  --col-outputs: 82px;

  grid-template-columns:
    [features]        var(--col-features)
    [gap-s-left]      var(--col-gap-s)
    [input-neurons]   var(--neuron-size)
    [gap-comp-l]      var(--col-gap-comp)
    [gap-conn-l]      1fr
    [embedding]       calc(var(--neuron-size) * 1.4)
    [gap-conn-r]      1fr
    [act-icons]       var(--col-act-icons)
    [gap-act]         0px
    [output-neurons]  var(--neuron-size)
    [gap-s-right]     var(--col-gap-s)
    [outputs]         var(--col-outputs);
  column-gap: 0;
  row-gap: 0;
  align-items: center;
  justify-content: space-around;
  justify-items: center;
  --row-height: 72px;
  padding: 0.25rem 0;
}

.ae-grid.compact {
  --row-height: 52px;
  --neuron-size: 1.5rem;
  --col-features: 44px;
  --col-gap-s: 0.6rem;
  --col-gap-comp: 16px;
  --col-act-icons: 18px;
  --col-outputs: 64px;
  padding: 0;
}

.ae-grid.compact .output-value{
  line-height: 1em;
}

/* ── Column headings ──────────────────────────────────────── */
.col-heading {
  font-family: var(--font-family-label);
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
  font-family: var(--font-family-number);
}

.col-loss-val.zero {
  color: var(--color-interactive-disabled);
}

.col-loss-label {
  font-size: 0.6rem;
  color: var(--color-text-secondary);
  font-family: var(--font-family-label);
  /* text-transform: uppercase; */
  letter-spacing: 0.05em;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
}

/* ── Highlight / dim ──────────────────────────────────────── */
.dimmed{
  opacity: 0.5;
}

.neuron-wrap.half-dimmed {
  opacity: 0.5;
}

.neuron.half-dimmed {
  opacity: 0.5;
}

:deep(.input-value.half-dimmed),
.cell-hover-zone.half-dimmed,
.output-value.half-dimmed {
  opacity: 0.5;
}

.neuron-wrap,
.neuron,
.cell-hover-zone,
:deep(.input-value),
.output-value {
  transition: opacity 0.15s;
}


.neuron-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  cursor: pointer;
  align-self: stretch;
}

.cell-hover-zone {
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  width: 100%;
  position: relative;
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
  background: var(--color-bg);
  border: 1px solid var(--color-bg-hover);
  border-radius: 5px;
  padding: 3px 7px;
  font-size: 0.72rem;
  color: var(--color-text-primary);
  box-shadow: var(--shadow-popup);
  opacity: 0;
  transition: opacity 0.12s;
  z-index: 100;
  pointer-events: none;

  font-family: var(--font-family-mono)
}

.neuron-tooltip :deep(.katex) {
  font-size: 0.72rem;
  color: var(--color-text-primary);
}

.neuron {
  font-family: var(--font-family-number);
  width: var(--neuron-size);
  height: var(--neuron-size);
  border-radius: 50%;
  border: 2px solid var(--color-neuron-border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  /*removed transform 0.2s as this causes update problems for the weight svg backdrop*/
  flex-shrink: 0;
  position: relative;
  z-index: 2;
  cursor: pointer;
  filter: drop-shadow(2px 4px 6px var(--shadow-neuron-drop));
}

.emb-neuron {
}

.emb-value {
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  font-weight: 700;
  pointer-events: none;
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
  font-family: var(--font-family-number);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  z-index: 2;
}

.out-val {
  font-size: 0.85rem;
  letter-spacing: -1px;
  font-weight: 500;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.out-err {
  font-size: 0.65rem;
  color: var(--color-error);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.out-err.zero {
  color: var(--color-interactive-disabled);
}

/* ── Column sub-header row (row 2) ────────────────────────── */

.resample-all-btn {
  font-size: 0.65rem;
  padding: 2px 6px;
  height: 20px;
  background: transparent;
  border: 1px solid var(--color-interactive-disabled);
  border-radius: 4px;
  cursor: pointer;
  color: var(--color-text-action);
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
  z-index: 2;
  align-self: end;
}

.resample-all-btn:hover:not(:disabled) {
  background: var(--color-bg-subtle);
  color: var(--color-text-strong);
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
  border: 1px solid var(--color-interactive-disabled);
  padding: 0;
  font-size: 0.85rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: var(--color-bg-subtle);
  color: var(--color-text-action);
  transition: opacity 0.15s, background 0.15s;
}

.dim-btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
}

.dim-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ── Reveal stage gating ─────────────────────────────────── */
/*
 * In blog/reveal mode (.ae-grid--reveal-mode) all revealable elements
 * are hidden by default. The imperative helpers in revealPulse.ts toggle
 * the data-revealed attribute to show them cumulatively per scroll stage.
 * Data-attributes (not classes) are used because Vue completely replaces
 * className on re-render, wiping imperatively-added classes.
 */

/* Hide all revealable elements (data-reveal attribute) */
.ae-grid--reveal-mode [data-reveal] {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.4s ease, visibility 0.4s ease;
}

/* SVG paths hidden by side (in child ConnectionsSvg) */
.ae-grid--reveal-mode :deep([data-side="encoder"]),
.ae-grid--reveal-mode :deep([data-side="decoder"]) {
  opacity: 0 !important;
  visibility: hidden;
  pointer-events: none !important;
  transition: opacity 0.4s ease, visibility 0.4s ease;
}

/* Half-normal backdrop hidden until data stage */
.ae-grid--reveal-mode :deep(.dist-svg) {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.4s ease, visibility 0.4s ease;
}

/* ── Revealed overrides ──────────────────────────────────── */
.ae-grid--reveal-mode [data-reveal][data-revealed] {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

/* Hover dimming (specificity 0,4,0) must win over the reveal opacity:1 (0,3,0). */
.ae-grid--reveal-mode [data-reveal][data-revealed].dimmed {
  opacity: 0.18;
}
.ae-grid--reveal-mode [data-reveal][data-revealed].half-dimmed {
  opacity: 0.5;
}

.ae-grid--reveal-mode :deep([data-side][data-revealed]) {
  opacity: revert !important;
  visibility: visible;
  pointer-events: revert !important;
}

.ae-grid--reveal-mode :deep(.dist-svg[data-revealed]) {
  opacity: 1;
  visibility: visible;
}
.emb-value{
  position: absolute;
  bottom: -2px;
  transform: translateY(100%);
}
</style>
