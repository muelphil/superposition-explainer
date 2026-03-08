<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: number
  label?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

// Normal distribution PDF for the background curve
function normalPdf(x: number, mu = 0, sigma = 1): number {
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mu) / sigma) ** 2)
}

// Generate SVG path for a normal distribution curve within [-3, 3]
const CURVE_WIDTH = 80
const CURVE_HEIGHT = 28
const X_MIN = -3
const X_MAX = 3

const curvePath = computed(() => {
  const steps = 60
  const points: string[] = []
  for (let i = 0; i <= steps; i++) {
    const x = X_MIN + (i / steps) * (X_MAX - X_MIN)
    const y = normalPdf(x)
    const svgX = ((x - X_MIN) / (X_MAX - X_MIN)) * CURVE_WIDTH
    const svgY = CURVE_HEIGHT - y * CURVE_HEIGHT * 2.4  // scale to fit
    points.push(`${i === 0 ? 'M' : 'L'} ${svgX.toFixed(1)} ${svgY.toFixed(1)}`)
  }
  return points.join(' ')
})

// Slider position: map value to [0,1] within [-3,3]
const sliderPos = computed(() => {
  const clamped = Math.max(X_MIN, Math.min(X_MAX, props.modelValue))
  return ((clamped - X_MIN) / (X_MAX - X_MIN)) * CURVE_WIDTH
})

function onSliderChange(event: Event) {
  const val = parseFloat((event.target as HTMLInputElement).value)
  emit('update:modelValue', val)
}
</script>

<template>
  <div class="input-value">
    <div class="curve-container">
      <svg
        :width="CURVE_WIDTH"
        :height="CURVE_HEIGHT"
        class="dist-curve"
        aria-hidden="true"
      >
        <path :d="curvePath" class="dist-path" />
        <line
          :x1="sliderPos"
          :x2="sliderPos"
          y1="0"
          :y2="CURVE_HEIGHT"
          class="dist-marker"
        />
      </svg>
      <input
        type="range"
        :min="X_MIN"
        :max="X_MAX"
        step="0.05"
        :value="modelValue"
        class="dist-slider"
        :style="{ width: CURVE_WIDTH + 'px' }"
        @input="onSliderChange"
        :aria-label="label ?? 'Input value'"
      />
    </div>
    <span class="value-label">{{ modelValue.toFixed(2) }}</span>
  </div>
</template>

<style scoped>
.input-value {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 80px;
}

.curve-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dist-curve {
  display: block;
  overflow: visible;
}

.dist-path {
  fill: none;
  stroke: var(--color-text-secondary);
  stroke-width: 1.5;
  opacity: 0.5;
}

.dist-marker {
  stroke: var(--color-interactive);
  stroke-width: 1.5;
  opacity: 0.8;
}

.dist-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 3px;
  background: var(--color-border);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
  margin: 0;
  padding: 0;
}

.dist-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-interactive);
  cursor: pointer;
  border: none;
}

.dist-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-interactive);
  cursor: pointer;
  border: none;
}

.value-label {
  font-size: 0.75rem;
  color: var(--color-text-label);
  font-variant-numeric: tabular-nums;
}
</style>
