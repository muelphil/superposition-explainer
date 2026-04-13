<script setup lang="ts">
import {computed, getCurrentInstance} from 'vue'
import {featureColorHex} from '../utils/featureColor'
import {renderLatexHtml} from '../utils/latex'

const props = defineProps<{
  modelValue: number
  label?: string
  disabled?: boolean
  featureIdx: number
  featureCount: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
  'resample': []
  'featureClick': []
}>()

// Unique prefix per component instance — prevents SVG ID collisions when
// multiple AutoencoderViews (e.g. main + blog compact) exist on the page.
const instanceUid = getCurrentInstance()!.uid

/** Toggle: if non-zero → set to 0; if zero → ask parent to resample */
function onToggleClick() {
  if (props.modelValue > 0.005) {
    emit('update:modelValue', 0)
  } else {
    emit('update:modelValue', 1)
    // emit('resample')
  }
}

function normalPdf(x: number, mu = 0, sigma = 1): number {
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / sigma) ** 2)
}

const CURVE_WIDTH = 88
const CURVE_HEIGHT = 36
const X_MIN = 0
const X_MAX = 3

// ── Feature color ──────────────────────────────────────────────
const featureHex = computed(() => featureColorHex(props.featureIdx, props.featureCount))
const gradId = computed(() => `dist-grad-${instanceUid}-${props.featureIdx}`)

/** Thumb color: white → feature color as value increases 0→3 */
const thumbColor = computed(() => {
  const hex = featureHex.value
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const t = Math.min(props.modelValue / X_MAX, 1)
  return `rgb(${Math.round(255 + (r - 255) * t)},${Math.round(255 + (g - 255) * t)},${Math.round(255 + (b - 255) * t)})`
})

/** Slider track gradient: white → feature color */
const sliderGradient = computed(() => `linear-gradient(to right, var(--color-bg), ${featureHex.value})`)

// ── SVG paths (coordinate system: 0 0 88 36 via viewBox) ──────
const strokePath = computed(() => {
  const steps = 80
  const pts: string[] = []
  for (let i = 0; i <= steps; i++) {
    const x = X_MIN + (i / steps) * (X_MAX - X_MIN)
    const pdf = normalPdf(x)
    const svgX = ((x - X_MIN) / (X_MAX - X_MIN)) * CURVE_WIDTH
    const svgY = CURVE_HEIGHT - pdf * CURVE_HEIGHT * 2.5
    pts.push(`${i === 0 ? 'M' : 'L'} ${svgX.toFixed(1)} ${svgY.toFixed(1)}`)
  }
  return pts.join(' ')
})

const fillPath = computed(() => {
  const steps = 80
  const pts = [`M 0 ${CURVE_HEIGHT}`]
  for (let i = 0; i <= steps; i++) {
    const x = X_MIN + (i / steps) * (X_MAX - X_MIN)
    const pdf = normalPdf(x)
    const svgX = ((x - X_MIN) / (X_MAX - X_MIN)) * CURVE_WIDTH
    const svgY = CURVE_HEIGHT - pdf * CURVE_HEIGHT * 2.5
    pts.push(`L ${svgX.toFixed(1)} ${svgY.toFixed(1)}`)
  }
  pts.push(`L ${CURVE_WIDTH} ${CURVE_HEIGHT} Z`)
  return pts.join(' ')
})

function onSliderChange(event: Event) {
  emit('update:modelValue', parseFloat((event.target as HTMLInputElement).value))
}
</script>

<template>
  <div class="input-value">
    <svg
        :viewBox="`0 0 ${CURVE_WIDTH} ${CURVE_HEIGHT}`"
        preserveAspectRatio="none"
        class="dist-svg"
        aria-hidden="true"
    >
      <defs>
        <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" :style="{ stopColor: 'var(--color-bg)' }" stop-opacity="0.3"/>
          <stop offset="100%" :stop-color="featureHex" stop-opacity="0.7"/>
        </linearGradient>
      </defs>
      <path :d="fillPath" :fill="`url(#${gradId})`"/>
      <path :d="strokePath" class="dist-stroke"/>
    </svg>
    <span class="input-label">
      <span
          class="feature-label"
          v-html="renderLatexHtml(`x_{${props.featureIdx + 1}}`)"
          aria-hidden="true"
          @click.stop="emit('featureClick')"
      />
      <span
          class="value-label"
          @click="onToggleClick"
          :title="modelValue > 0.005 ? 'Click to zero' : 'Click to sample'"
      >{{ modelValue.toFixed(2) }}
      </span>
    </span>
    <input
        type="range"
        :min="X_MIN"
        :max="X_MAX"
        step="0.05"
        :value="modelValue"
        :disabled="props.disabled"
        class="dist-slider"
        :style="{ '--thumb-color': thumbColor, background: sliderGradient }"
        @input="onSliderChange"
        :aria-label="label ?? 'Input value'"
    />
  </div>
</template>

<style scoped>
.input-value {
  position: relative;
  width: 100%;
  height: 42px;
}

.dist-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 36px;
  display: block;
}

.dist-stroke {
  fill: none;
  stroke: var(--color-slider-track);
  stroke-width: 1;
}

.feature-label {
  font-size: 0.8rem;
  color: var(--color-text-label);
  white-space: nowrap;
  user-select: none;
}
.feature-label :deep(.katex) {
  font-size: 0.8rem;
  color: var(--color-text-label);
}

.value-label {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}

.input-label {
  display: flex;
  flex-direction: row;
  width: 100%;
  justify-content: space-between;

  position: absolute;
  bottom: 1em;
  z-index: 3;
  line-height: 1.2;
}

.value-label:hover {
  color: var(--color-interactive);
}

.dist-slider {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 3px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  margin: 0;
  padding: 0;
}

.dist-slider:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.dist-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--thumb-color, var(--color-thumb-default));
  border: 1.5px solid var(--color-thumb-border);
  cursor: pointer;
}

.dist-slider::-moz-range-thumb {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--thumb-color, var(--color-thumb-default));
  border: 1.5px solid var(--color-thumb-border);
  cursor: pointer;
}
</style>
