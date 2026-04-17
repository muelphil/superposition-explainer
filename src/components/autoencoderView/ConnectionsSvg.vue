<script setup lang="ts">
import {inject, ref, computed, watch, onMounted, onUnmounted, nextTick, getCurrentInstance} from 'vue'
import type {AutoencoderServiceType} from '../../services/AutoencoderService'

const props = defineProps<{
  containerEl: HTMLElement | null
  inputNeuronEls: (HTMLElement | null)[]
  embNeuronEls: (HTMLElement | null)[]
  outputNeuronEls: (HTMLElement | null)[]
  pathOpacity: (row: number, col: number, base: number) => number
}>()

const emit = defineEmits<{
  'weight-enter': [row: number, col: number]
  'weight-leave': []
  'weight-click': [row: number, col: number]
}>()

const svc = inject<AutoencoderServiceType>('autoencoderService')!

const n = computed(() => svc.config.inputDim)
const m = computed(() => svc.config.embeddingDim)

// Unique SVG mask ID per instance — prevents collision when multiple
// AutoencoderViews (e.g. main + blog compact) coexist on the page.
const maskId = `neuron-mask-${getCurrentInstance()!.uid}`

// ─── SVG path data ───────────────────────────────────────────────────────────

interface SvgPath {
  d: string
  color: string
  width: number
  opacity: number
  row: number
  col: number
  side: 'encoder' | 'decoder'
}

interface NeuronClip {
  cx: number
  cy: number
  r: number
}

const svgPathsData = ref<SvgPath[]>([])
const encoderPaths = computed(() => svgPathsData.value.filter(p => p.side === 'encoder'))
const decoderPaths = computed(() => svgPathsData.value.filter(p => p.side === 'decoder'))
const neuronClips = ref<NeuronClip[]>([])

// ─── Geometry helpers ────────────────────────────────────────────────────────

/** Returns the center position + radius of a neuron element in container coordinates. */
function getNeuronInfo(el: HTMLElement | null | undefined): NeuronClip | null {
  if (!el || !props.containerEl) return null
  const er = el.getBoundingClientRect()
  const cr = props.containerEl.getBoundingClientRect()
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
    width: 0.5 + Math.min(abs, 1.5) * 4,
    opacity: 0.15 + Math.min(abs, 1) * 0.65,
  }
}

/** Y offset so that `total` connections fan evenly within the neuron's diameter. */
function spreadOffset(idx: number, total: number, diameter: number): number {
  if (total <= 1) return 0
  return (idx - (total - 1) / 2) * (diameter * 0.55 / Math.max(total - 1, 1))
}

function drawConnections() {
  if (!props.containerEl) return

  const W = svc.W.value
  const paths: SvgPath[] = []
  const clips: NeuronClip[] = []

  // Collect neuron clip circles
  for (let j = 0; j < n.value; j++) {
    const inInfo = getNeuronInfo(props.inputNeuronEls[j])
    const outInfo = getNeuronInfo(props.outputNeuronEls[j])
    if (inInfo) clips.push(inInfo)
    if (outInfo) clips.push(outInfo)
  }
  for (let k = 0; k < m.value; k++) {
    const embInfo = getNeuronInfo(props.embNeuronEls[k])
    if (embInfo) clips.push(embInfo)
  }

  // Encoder: input neurons → embedding neurons
  for (let k = 0; k < m.value; k++) {
    const embInfo = getNeuronInfo(props.embNeuronEls[k])
    if (!embInfo) continue
    for (let j = 0; j < n.value; j++) {
      const inInfo = getNeuronInfo(props.inputNeuronEls[j])
      if (!inInfo) continue
      const w = W[k]?.[j] ?? 0
      const {color, width, opacity} = weightStyle(w)
      // Fan: k-th connection fans at input; j-th connection fans at embedding
      const sy = inInfo.cy + spreadOffset(k, m.value, inInfo.r * 2)
      const ty = embInfo.cy + spreadOffset(j, n.value, embInfo.r * 2)
      paths.push({d: bezierPath(inInfo.cx, sy, embInfo.cx, ty), color, width, opacity, row: k, col: j, side: 'encoder'})
    }
  }

  // Decoder: embedding neurons → output neurons
  for (let k = 0; k < m.value; k++) {
    const embInfo = getNeuronInfo(props.embNeuronEls[k])
    if (!embInfo) continue
    for (let j = 0; j < n.value; j++) {
      const outInfo = getNeuronInfo(props.outputNeuronEls[j])
      if (!outInfo) continue
      const w = W[k]?.[j] ?? 0
      const {color, width, opacity} = weightStyle(w)
      const sy = embInfo.cy + spreadOffset(j, n.value, embInfo.r * 2)
      const ty = outInfo.cy + spreadOffset(k, m.value, outInfo.r * 2)
      paths.push({d: bezierPath(embInfo.cx, sy, outInfo.cx, ty), color, width, opacity, row: k, col: j, side: 'decoder'})
    }
  }

  svgPathsData.value = paths
  neuronClips.value = clips
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  await nextTick()
  drawConnections()
  if (props.containerEl) {
    resizeObserver = new ResizeObserver(() => drawConnections())
    resizeObserver.observe(props.containerEl)
  }
})

onUnmounted(() => resizeObserver?.disconnect())

// Re-attach observer when containerEl changes (e.g. delayed mount)
watch(() => props.containerEl, (el) => {
  resizeObserver?.disconnect()
  if (el) {
    resizeObserver = new ResizeObserver(() => drawConnections())
    resizeObserver.observe(el)
    drawConnections()
  }
})

watch(() => svc.W.value, () => drawConnections(), {deep: true})
watch([n, m], () => drawConnections(), {flush: 'post'})
watch(() => svc.featureImportance.value, () => drawConnections(), {flush: 'post'})
</script>

<template>
  <svg
      class="connections-svg"
      :class="{ 'training-active': svc.isTraining.value }"
      aria-hidden="true"
  >
    <defs>
      <!-- Mask: white everywhere except black circles over neurons (hides lines inside circles) -->
      <mask :id="maskId" maskUnits="userSpaceOnUse">
        <rect x="-9999" y="-9999" width="19998" height="19998" fill="white"/>
        <circle
            v-for="(c, ci) in neuronClips"
            :key="ci"
            :cx="c.cx" :cy="c.cy" :r="c.r"
            fill="black"
        />
      </mask>
    </defs>

    <!-- Visible styled paths — masked so they hide inside neurons.
         Paths are wrapped in per-side <g> groups so the reveal system can
         target the group's CSS opacity without conflicting with the per-path
         opacity controlled by Vue's :opacity binding (hover dimming). -->
    <g :mask="`url(#${maskId})`">
      <g class="vis-path-group" data-side="encoder">
        <path
            v-for="(p, pi) in encoderPaths"
            :key="pi"
            class="vis-path"
            :d="p.d"
            fill="none"
            :stroke="p.color"
            :stroke-width="p.width"
            :opacity="pathOpacity(p.row, p.col, p.opacity)"
            style="pointer-events: none; stroke-linecap: round;"
        />
      </g>
      <g class="vis-path-group" data-side="decoder">
        <path
            v-for="(p, pi) in decoderPaths"
            :key="pi"
            class="vis-path"
            :d="p.d"
            fill="none"
            :stroke="p.color"
            :stroke-width="p.width"
            :opacity="pathOpacity(p.row, p.col, p.opacity)"
            style="pointer-events: none; stroke-linecap: round;"
        />
      </g>
    </g>

    <!-- Invisible hit paths — wide transparent stroke for easy hover, outside mask -->
    <path
        v-for="(p, pi) in svgPathsData"
        :key="`hit-${pi}`"
        :data-side="p.side"
        :d="p.d"
        fill="none"
        stroke="transparent"
        stroke-width="12"
        style="pointer-events: stroke; cursor: pointer;"
        @mouseenter="emit('weight-enter', p.row, p.col)"
        @mouseleave="emit('weight-leave')"
        @click.stop="emit('weight-click', p.row, p.col)"
    />
  </svg>
</template>

<style scoped>
.connections-svg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

/* Dashed lines — only shown and animated during training */
.connections-svg .vis-path {
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

.connections-svg.training-active .vis-path {
  stroke-dasharray: 1 6; /*When updating this, also update dash-flow above (dashoffset=sum)*/
  animation: dash-flow 0.35s linear infinite;
}
</style>
