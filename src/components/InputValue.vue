<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: number
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function normalPdf(x: number, mu = 0, sigma = 1): number {
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / sigma) ** 2)
}

const CURVE_WIDTH = 88
const CURVE_HEIGHT = 36
const X_MIN = -3
const X_MAX = 3

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

/** CSS color for thumb: matches neuron color logic (white→orange for +, white→blue for −) */
const thumbColor = computed(() => {
  const v = props.modelValue
  const t = Math.min(Math.abs(v) / 2, 1)
  if (v >= 0) {
    // white → orange (255,146,60)
    const r = Math.round(255)
    const g = Math.round(255 - t * (255 - 146))
    const b = Math.round(255 - t * 255)
    return `rgb(${r},${g},${b})`
  } else {
    // white → blue (96,165,250)
    const r = Math.round(255 - t * (255 - 96))
    const g = Math.round(255 - t * (255 - 165))
    const b = Math.round(255)
    return `rgb(${r},${g},${b})`
  }
})

function onSliderChange(event: Event) {
  const val = parseFloat((event.target as HTMLInputElement).value)
  emit('update:modelValue', val)
}
</script>

<template>
  <div class="input-value">
    <svg
      :width="CURVE_WIDTH"
      :height="CURVE_HEIGHT"
      class="dist-svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="dist-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#93c5fd" stop-opacity="0.7" />
          <stop offset="50%"  stop-color="#ffffff" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#fdba74" stop-opacity="0.7" />
        </linearGradient>
      </defs>
      <path :d="fillPath" class="dist-fill" />
      <path :d="strokePath" class="dist-stroke" />
    </svg>
    <span class="value-label">{{ modelValue.toFixed(2) }}</span>
    <input
      type="range"
      :min="X_MIN"
      :max="X_MAX"
      step="0.05"
      :value="modelValue"
      class="dist-slider"
      :style="{ '--thumb-color': thumbColor }"
      @input="onSliderChange"
      :aria-label="label ?? 'Input value'"
    />
  </div>
</template>

<style scoped>
.input-value {
  position: relative;
  width: 88px;
  height: 42px;
}

.dist-svg {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
}

.dist-fill {
  fill: url(#dist-grad);
}

.dist-stroke {
  fill: none;
  stroke: #cbd5e1;
  stroke-width: 1;
}

.value-label {
  position: absolute;
  bottom: 0.6em;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  z-index: 3;
  white-space: nowrap;
  line-height: 1.2;
}

.dist-slider {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 88px;
  -webkit-appearance: none;
  appearance: none;
  height: 3px;
  background: linear-gradient(to right, #93c5fd, #ffffff, #fdba74);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  margin: 0;
  padding: 0;
}

.dist-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--thumb-color, #94a3b8);
  border: 1.5px solid rgba(0,0,0,0.15);
  cursor: pointer;
}

.dist-slider::-moz-range-thumb {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--thumb-color, #94a3b8);
  border: 1.5px solid rgba(0,0,0,0.15);
  cursor: pointer;
}
</style>
